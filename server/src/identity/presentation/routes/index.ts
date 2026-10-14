import { Router, Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { UserModel } from '../../infrastructure/persistence/UserModel'
import { AcademicStageModel, GradeModel, TrackModel, SpecializationModel } from '../../../learning/infrastructure/persistence/TaxonomyModels'
import { isSecondaryThirdGrade } from '@shared/utils/academicTaxonomy'
import { AppError } from '@shared/errors/AppError'
import { recordAuditEvent } from '@shared/application/AuditLog'
import { MongoUserRepository }          from '../../infrastructure/persistence/MongoUserRepository'
import crypto from 'crypto'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { RelationCategoryModel, FamilyGroupModel } from '../../infrastructure/persistence/FamilyModels'
import { JwtService, hashRefreshToken } from '../../infrastructure/services/JwtService'
import { LoginUseCase }                 from '../../application/use-cases/LoginUseCase'
import { RefreshTokenUseCase }          from '../../application/use-cases/RefreshTokenUseCase'
import { LogoutUseCase }                from '../../application/use-cases/LogoutUseCase'
import { GetMeUseCase }                 from '../../application/use-cases/GetMeUseCase'
import { AdminCreateStudentUseCase }    from '../../application/use-cases/AdminCreateStudentUseCase'
import { AdminListStudentsUseCase }     from '../../application/use-cases/AdminListStudentsUseCase'
import { AdminToggleStudentUseCase }    from '../../application/use-cases/AdminToggleStudentUseCase'
import { AdminUpdateFinanceUseCase }    from '../../application/use-cases/AdminUpdateFinanceUseCase'
import { RegeneratePasswordUseCase }    from '../../application/use-cases/RegeneratePasswordUseCase'
import { AdminListAdminsUseCase }       from '../../application/use-cases/AdminListAdminsUseCase'
import { AdminCreateAdminUseCase }      from '../../application/use-cases/AdminCreateAdminUseCase'
import { AdminUpdatePermissionsUseCase } from '../../application/use-cases/AdminUpdatePermissionsUseCase'
import { AdminToggleAdminUseCase }      from '../../application/use-cases/AdminToggleAdminUseCase'
import { authenticate, requirePermission }  from '../middlewares/authenticate'
import { authLimiter, refreshLimiter, adminSensitiveLimiter } from '@shared/security/rateLimiters'
import {
  RegisterStudentSchema,
  RegisterAdminSchema,
  UpdatePermissionsSchema,
  LoginSchema,
  RefreshTokenSchema,
  UpdateProfileSchema,
  ToggleAccountSchema,
  UpdateFinanceSchema,
} from '../../application/dtos/AuthDtos'

const router = Router()

// ── Dependency instances ──────────────────────────────────────────────────
const userRepo   = new MongoUserRepository()
const jwtService = new JwtService()

const loginUC              = new LoginUseCase(userRepo, jwtService)
const refreshTokenUC       = new RefreshTokenUseCase(userRepo, jwtService)
const logoutUC             = new LogoutUseCase(userRepo)
const getMeUC              = new GetMeUseCase(userRepo)
const adminCreateStudentUC = new AdminCreateStudentUseCase(userRepo)
const adminListStudentsUC  = new AdminListStudentsUseCase(userRepo)
const adminToggleStudentUC = new AdminToggleStudentUseCase(userRepo)
const adminUpdateFinanceUC = new AdminUpdateFinanceUseCase(userRepo)
const regeneratePasswordUC = new RegeneratePasswordUseCase(userRepo)
const adminListAdminsUC    = new AdminListAdminsUseCase(userRepo)
const adminCreateAdminUC   = new AdminCreateAdminUseCase(userRepo)
const adminUpdatePermissionsUC = new AdminUpdatePermissionsUseCase(userRepo)
const adminToggleAdminUC   = new AdminToggleAdminUseCase(userRepo)

// ── Helper ────────────────────────────────────────────────────────────────
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// ── Public routes ─────────────────────────────────────────────────────────

// Public registration is disabled

// POST /api/auth/login
router.post('/login', authLimiter, wrap(async (req, res) => {
  const dto    = LoginSchema.parse(req.body)
  const result = await loginUC.execute(dto)
  res.json({ success: true, data: result })
}))

// POST /api/auth/refresh
router.post('/refresh', refreshLimiter, wrap(async (req, res) => {
  const dto    = RefreshTokenSchema.parse(req.body)
  const result = await refreshTokenUC.execute(dto)
  res.json({ success: true, data: result })
}))

// ── Protected routes ──────────────────────────────────────────────────────

// POST /api/auth/logout
router.post('/logout', authenticate, wrap(async (req, res) => {
  await logoutUC.execute(req.user!.sub, req.user!.sid)
  res.json({ success: true })
}))

// GET /api/auth/me
router.get('/me', authenticate, wrap(async (req, res) => {
  const result = await getMeUC.execute(req.user!.sub)
  res.json({ success: true, data: result })
}))

// PATCH /api/auth/me
router.patch('/me', authenticate, adminSensitiveLimiter, wrap(async (req, res) => {
  const dto = UpdateProfileSchema.parse(req.body)
  const user = await userRepo.findById(new UniqueEntityId(req.user!.sub))
  if (!user) throw new AppError('المستخدم غير موجود', 404)

  // 1. Email update uniqueness check
  if (dto.email && dto.email.toLowerCase().trim() !== user.email?.toLowerCase().trim()) {
    const cleanEmail = dto.email.toLowerCase().trim()
    const existing = await UserModel.findOne({
      email: cleanEmail,
      _id: { $ne: new mongoose.Types.ObjectId(user.id.toString()) },
    })
    if (existing) {
      throw new AppError('البريد الإلكتروني مستخدم بالفعل من قبل حساب آخر', 409)
    }
  }

  let newTokens: { accessToken: string; refreshToken: string } | undefined

  // 2. Password update with current password check
  if (dto.newPassword) {
    if (!dto.currentPassword) {
      throw new AppError('يجب إدخال كلمة المرور الحالية لتغيير كلمة المرور', 422)
    }
    const isCurrentValid = await user.password.compare(dto.currentPassword)
    if (!isCurrentValid) {
      throw new AppError('كلمة المرور الحالية غير صحيحة', 422)
    }
    user.changePassword(dto.newPassword)

    // Re-issue active session for the user so they stay logged in seamlessly
    const sessionId = crypto.randomUUID()
    const accessToken = jwtService.signAccessToken({ sub: user.id.toString(), sid: sessionId })
    const refreshToken = jwtService.signRefreshToken({ sub: user.id.toString(), sid: sessionId })
    user.setSession(sessionId, hashRefreshToken(refreshToken))
    newTokens = { accessToken, refreshToken }
  }

  // 3. Update profile fields
  user.updateProfile({
    fullName: dto.fullName,
    email: dto.email ? dto.email.toLowerCase().trim() : undefined,
    phones: dto.phones,
  })

  await userRepo.save(user)

  await recordAuditEvent({
    actorId: req.user!.sub,
    action: 'user.profile.update',
    resourceType: 'user',
    resourceId: user.id.toString(),
  })

  const updatedData = await getMeUC.execute(user.id.toString())
  res.json({
    success: true,
    data: {
      user: updatedData,
      accessToken: newTokens?.accessToken,
      refreshToken: newTokens?.refreshToken,
    },
  })
}))

// ── Admin routes ──────────────────────────────────────────────────────────

// POST /api/auth/admin/students  — admin creates student manually
router.post('/admin/students', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const dto    = RegisterStudentSchema.parse(req.body)
  const result = await adminCreateStudentUC.execute(dto)
  await recordAuditEvent({ actorId: req.user!.sub, action: 'student.create', resourceType: 'user', resourceId: result.id })
  res.status(201).json({ success: true, data: result })
}))

// GET /api/auth/admin/students
router.get('/admin/students', authenticate, requirePermission('students', 'read'), wrap(async (req, res) => {
  const isActive = req.query.isActive !== undefined
    ? req.query.isActive === 'true'
    : undefined
  const result = await adminListStudentsUC.execute({ isActive })
  res.json({ success: true, data: result })
}))

// PATCH /api/auth/admin/students/:id/toggle
router.patch('/admin/students/:id/toggle', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const { activate } = ToggleAccountSchema.parse(req.body)
  await adminToggleStudentUC.execute(req.params.id, activate)
  await recordAuditEvent({ actorId: req.user!.sub, action: activate ? 'student.activate' : 'student.deactivate', resourceType: 'user', resourceId: req.params.id })
  res.json({ success: true })
}))

// PATCH /api/auth/admin/students/:id/regenerate-password
router.patch('/admin/students/:id/regenerate-password', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const result = await regeneratePasswordUC.execute(req.params.id)
  await recordAuditEvent({ actorId: req.user!.sub, action: 'student.password.regenerate', resourceType: 'user', resourceId: req.params.id })
  res.json({ success: true, data: result })
}))

// PATCH /api/auth/admin/students/:id/finance
router.patch('/admin/students/:id/finance', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const dto = UpdateFinanceSchema.parse(req.body)
  await adminUpdateFinanceUC.execute(req.params.id, dto)
  await recordAuditEvent({ actorId: req.user!.sub, action: 'student.finance.update', resourceType: 'user', resourceId: req.params.id })
  res.json({ success: true })
}))

// Official academic placement is staff-managed and uses validated taxonomy IDs.
const AcademicPlacementSchema = z.object({
  stageId: z.string().length(24), gradeId: z.string().length(24),
  trackId: z.string().length(24).nullable().optional(),
  specializationId: z.string().length(24).nullable().optional(),
})
router.patch('/admin/students/:id/academic-placement', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const dto = AcademicPlacementSchema.parse(req.body)
  if (![dto.stageId, dto.gradeId, dto.trackId, dto.specializationId].filter(Boolean).every((id) => mongoose.isValidObjectId(id))) throw new AppError('Invalid academic placement ID', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  const [student, stage, grade] = await Promise.all([
    UserModel.findOne({ _id: req.params.id, role: 'student' }).select('_id'),
    AcademicStageModel.findOne({ _id: dto.stageId, isActive: true }).select('_id name'),
    GradeModel.findOne({ _id: dto.gradeId, isActive: true }).select('stageId name'),
  ])
  if (!student) throw new AppError('Student was not found', 404, true, 'RESOURCE_NOT_FOUND')
  if (!stage || !grade || !grade.stageId?.equals(stage._id)) throw new AppError('The grade does not belong to the selected stage', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  
  const requiresTrack = isSecondaryThirdGrade(stage.name, grade.name)

  if (requiresTrack) {
    const tracksExist = await TrackModel.exists({ gradeIds: grade._id, isActive: true })
    if (tracksExist && !dto.trackId) {
      throw new AppError('المسار الدراسي مطلوب لطلاب الصف الثالث الثانوي', 422, true, 'INVALID_ACADEMIC_CONTEXT')
    }
  }

  if (dto.trackId) {
    const track = await TrackModel.findOne({ _id: dto.trackId, isActive: true }).select('gradeIds')
    if (!track || (track.gradeIds?.length && !track.gradeIds.some((id) => id.equals(grade._id)))) throw new AppError('The track is not valid for the selected grade', 422, true, 'INVALID_ACADEMIC_CONTEXT')
    
    const specsExist = await SpecializationModel.exists({ trackIds: track._id, isActive: true })
    if (specsExist && !dto.specializationId) {
      throw new AppError('التخصص مطلوب لهذا المسار', 422, true, 'INVALID_ACADEMIC_CONTEXT')
    }
  }
  if (dto.specializationId) {
    const specialization = await SpecializationModel.findOne({ _id: dto.specializationId, isActive: true }).select('trackIds')
    if (!specialization || (specialization.trackIds?.length && (!dto.trackId || !specialization.trackIds.some((id) => id.toString() === dto.trackId)))) throw new AppError('The specialization is not valid for the selected track', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  }

  const effectiveTrackId = requiresTrack ? dto.trackId : null
  const effectiveSpecId = requiresTrack ? dto.specializationId : null

  const updateDoc: any = {
    $set: {
      academicStageId: stage._id,
      academicGradeId: grade._id,
    },
    $unset: { sessionId: 1, refreshTokenHash: 1, refreshToken: 1 },
  }

  if (effectiveTrackId) {
    updateDoc.$set.academicTrackId = new mongoose.Types.ObjectId(effectiveTrackId)
  } else {
    updateDoc.$unset.academicTrackId = 1
  }

  if (effectiveSpecId) {
    updateDoc.$set.academicSpecializationId = new mongoose.Types.ObjectId(effectiveSpecId)
  } else {
    updateDoc.$unset.academicSpecializationId = 1
  }

  await UserModel.updateOne({ _id: student._id }, updateDoc)
  await recordAuditEvent({ actorId: req.user!.sub, action: 'student.placement.update', resourceType: 'user', resourceId: req.params.id })
  res.json({ success: true, data: { studentId: student._id, stageId: stage._id, gradeId: grade._id, trackId: effectiveTrackId ?? null, specializationId: effectiveSpecId ?? null } })
}))

const BatchAcademicPlacementSchema = z.object({
  studentIds: z.array(z.string().length(24)).min(1, 'يجب تحديد طالب واحد على الأقل'),
  stageId: z.string().length(24),
  gradeId: z.string().length(24),
  trackId: z.string().length(24).nullable().optional(),
  specializationId: z.string().length(24).nullable().optional(),
})

router.patch('/admin/students/batch-placement', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const dto = BatchAcademicPlacementSchema.parse(req.body)
  const allIds = [...dto.studentIds, dto.stageId, dto.gradeId, dto.trackId, dto.specializationId].filter(Boolean) as string[]
  if (!allIds.every((id) => mongoose.isValidObjectId(id))) throw new AppError('Invalid academic placement ID in batch request', 422, true, 'INVALID_ACADEMIC_CONTEXT')

  const [stage, grade] = await Promise.all([
    AcademicStageModel.findOne({ _id: dto.stageId, isActive: true }).select('_id name'),
    GradeModel.findOne({ _id: dto.gradeId, isActive: true }).select('stageId name'),
  ])
  if (!stage || !grade || !grade.stageId?.equals(stage._id)) throw new AppError('The grade does not belong to the selected stage', 422, true, 'INVALID_ACADEMIC_CONTEXT')

  const requiresTrack = isSecondaryThirdGrade(stage.name, grade.name)

  if (requiresTrack) {
    const tracksExist = await TrackModel.exists({ gradeIds: grade._id, isActive: true })
    if (tracksExist && !dto.trackId) {
      throw new AppError('المسار الدراسي مطلوب لطلاب الصف الثالث الثانوي', 422, true, 'INVALID_ACADEMIC_CONTEXT')
    }
  }

  if (dto.trackId) {
    const track = await TrackModel.findOne({ _id: dto.trackId, isActive: true }).select('gradeIds')
    if (!track || (track.gradeIds?.length && !track.gradeIds.some((id) => id.equals(grade._id)))) throw new AppError('The track is not valid for the selected grade', 422, true, 'INVALID_ACADEMIC_CONTEXT')

    const specsExist = await SpecializationModel.exists({ trackIds: track._id, isActive: true })
    if (specsExist && !dto.specializationId) {
      throw new AppError('التخصص مطلوب لهذا المسار', 422, true, 'INVALID_ACADEMIC_CONTEXT')
    }
  }

  if (dto.specializationId) {
    const specialization = await SpecializationModel.findOne({ _id: dto.specializationId, isActive: true }).select('trackIds')
    if (!specialization || (specialization.trackIds?.length && (!dto.trackId || !specialization.trackIds.some((id) => id.toString() === dto.trackId)))) throw new AppError('The specialization is not valid for the selected track', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  }

  const effectiveTrackId = requiresTrack ? dto.trackId : null
  const effectiveSpecId = requiresTrack ? dto.specializationId : null

  const updateDoc: any = {
    $set: {
      academicStageId: stage._id,
      academicGradeId: grade._id,
    },
    $unset: { sessionId: 1, refreshTokenHash: 1, refreshToken: 1 },
  }

  if (effectiveTrackId) {
    updateDoc.$set.academicTrackId = new mongoose.Types.ObjectId(effectiveTrackId)
  } else {
    updateDoc.$unset.academicTrackId = 1
  }

  if (effectiveSpecId) {
    updateDoc.$set.academicSpecializationId = new mongoose.Types.ObjectId(effectiveSpecId)
  } else {
    updateDoc.$unset.academicSpecializationId = 1
  }

  const result = await UserModel.updateMany(
    { _id: { $in: dto.studentIds }, role: 'student' },
    updateDoc
  )

  for (const sId of dto.studentIds) {
    await recordAuditEvent({ actorId: req.user!.sub, action: 'student.placement.update', resourceType: 'user', resourceId: sId })
  }

  res.json({
    success: true,
    data: {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      stageId: stage._id,
      gradeId: grade._id,
      trackId: dto.trackId ?? null,
      specializationId: dto.specializationId ?? null
    }
  })
}))

// ── Admins Management Routes ────────────────────────────────────────────────
// GET /api/auth/admin/admins
router.get('/admin/admins', authenticate, requirePermission('admins', 'read'), wrap(async (req, res) => {
  const result = await adminListAdminsUC.execute()
  res.json({ success: true, data: result })
}))

// POST /api/auth/admin/admins
router.post('/admin/admins', authenticate, requirePermission('admins', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const dto    = RegisterAdminSchema.parse(req.body)
  const result = await adminCreateAdminUC.execute(dto)
  await recordAuditEvent({ actorId: req.user!.sub, action: 'admin.create', resourceType: 'user', resourceId: result.id })
  res.status(201).json({ success: true, data: result })
}))

// PATCH /api/auth/admin/admins/:id/permissions
router.patch('/admin/admins/:id/permissions', authenticate, requirePermission('admins', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const dto = UpdatePermissionsSchema.parse(req.body)
  await adminUpdatePermissionsUC.execute(req.params.id, dto.permissions)
  await recordAuditEvent({ actorId: req.user!.sub, action: 'admin.permissions.update', resourceType: 'user', resourceId: req.params.id })
  res.json({ success: true })
}))

// PATCH /api/auth/admin/admins/:id/toggle
router.patch('/admin/admins/:id/toggle', authenticate, requirePermission('admins', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const { activate } = ToggleAccountSchema.parse(req.body)
  await adminToggleAdminUC.execute(req.params.id, activate)
  await recordAuditEvent({ actorId: req.user!.sub, action: activate ? 'admin.activate' : 'admin.deactivate', resourceType: 'user', resourceId: req.params.id })
  res.json({ success: true })
}))

// ── Family Routes ─────────────────────────────────────────────────────────

// GET /api/auth/admin/family/categories
router.get('/admin/family/categories', authenticate, requirePermission('students', 'read'), wrap(async (req, res) => {
  const categories = await RelationCategoryModel.find().sort({ createdAt: -1 })
  res.json({ success: true, data: categories })
}))

// POST /api/auth/admin/family/categories
router.post('/admin/family/categories', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const { name } = req.body
  const category = await RelationCategoryModel.create({ name })
  res.status(201).json({ success: true, data: category })
}))

// DELETE /api/auth/admin/family/categories/:id
router.delete('/admin/family/categories/:id', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  await RelationCategoryModel.findByIdAndDelete(req.params.id)
  await FamilyGroupModel.deleteMany({ categoryId: req.params.id })
  res.json({ success: true })
}))

// GET /api/auth/admin/family/groups
router.get('/admin/family/groups', authenticate, requirePermission('students', 'read'), wrap(async (req, res) => {
  const groups = await FamilyGroupModel.find().populate('categoryId').populate('studentIds', 'fullName username')
  res.json({ success: true, data: groups })
}))

// POST /api/auth/admin/family/groups
router.post('/admin/family/groups', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const { categoryId, studentIds } = req.body
  const group = await FamilyGroupModel.create({ categoryId, studentIds })
  const populated = await group.populate(['categoryId', { path: 'studentIds', select: 'fullName username' }])
  res.status(201).json({ success: true, data: populated })
}))

// DELETE /api/auth/admin/family/groups/:id
router.delete('/admin/family/groups/:id', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  await FamilyGroupModel.findByIdAndDelete(req.params.id)
  res.json({ success: true })
}))

export { router as identityRouter }
