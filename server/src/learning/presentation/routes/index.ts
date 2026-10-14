import mongoose from 'mongoose'
import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate, optionalAuthenticate, requireAdmin, requirePermission } from '@identity/presentation/middlewares/authenticate'
import {
  MongoCourseRepository,
  MongoSubjectRepository,
  MongoClassRepository,
  MongoLessonRepository,
  MongoCourseworkRepository
} from '../../infrastructure/persistence/MongoLearningRepositories'
import { MongoCategoryRepository } from '../../infrastructure/persistence/MongoCategoryRepository'
import { MongoTaxonomyRepository } from '../../infrastructure/persistence/MongoTaxonomyRepository'
import { AcademicStage } from '../../domain/entities/AcademicStage'
import { Grade } from '../../domain/entities/Grade'
import { Track } from '../../domain/entities/Track'
import { Specialization } from '../../domain/entities/Specialization'

import {
  CreateCourseUseCase, UpdateCourseUseCase, PublishCourseUseCase,
  ListCoursesUseCase, GetCourseUseCase, DeleteCourseUseCase,
} from '../../application/use-cases/CourseUseCases'
import {
  CreateSubjectUseCase, UpdateSubjectUseCase,
  ListSubjectsUseCase, DeleteSubjectUseCase,
} from '../../application/use-cases/SubjectUseCases'
import {
  CreateClassUseCase, UpdateClassUseCase,
  ListClassesUseCase, DeleteClassUseCase,
} from '../../application/use-cases/ClassUseCases'
import {
  CreateLessonUseCase, UpdateLessonUseCase, PublishLessonUseCase,
  ListLessonsUseCase, GetLessonUseCase, DeleteLessonUseCase,
} from '../../application/use-cases/LessonUseCases'
import { GetCurriculumTreeUseCase } from '../../application/use-cases/GetCurriculumTreeUseCase'
import {
  CreateCategoryUseCase, UpdateCategoryUseCase, ToggleCategoryUseCase,
  MoveCategoryUseCase, GetCategoryTreeUseCase, ListCategoriesUseCase,
} from '../../application/use-cases/CategoryUseCases'

import {
  CreateCourseSchema, UpdateCourseSchema,
  CreateSubjectSchema, UpdateSubjectSchema,
  CreateClassSchema, UpdateClassSchema,
  CreateLessonSchema, UpdateLessonSchema,
  PaginationSchema,
} from '../../application/dtos/LearningDtos'
import {
  CreateCategorySchema, UpdateCategorySchema, MoveCategorySchema,
} from '../../application/dtos/CategoryDtos'
import { CourseworkController } from '../controllers/CourseworkController'
import { CourseAccessPolicy, LessonAccessPolicy, canReadCourseAdminData } from '../../application/policies/AccessPolicies'
import { EnrollmentModel } from '../../infrastructure/persistence/EnrollmentModel'
import { CourseModel } from '../../infrastructure/persistence/CourseModel'
import { SubjectModel } from '../../infrastructure/persistence/SubjectModel'
import { ClassModel } from '../../infrastructure/persistence/ClassModel'
import { LessonModel } from '../../infrastructure/persistence/LessonModel'
import { CourseworkModel } from '../../infrastructure/persistence/CourseworkModel'
import { UserModel } from '@identity/infrastructure/persistence/UserModel'
import { GradeModel, TrackModel, SpecializationModel, AcademicStageModel } from '../../infrastructure/persistence/TaxonomyModels'
import { AppError } from '@shared/errors/AppError'
import { recordAuditEvent } from '@shared/application/AuditLog'
import { adminSensitiveLimiter } from '@shared/security/rateLimiters'

const router = Router()

// ── Repos & Use Cases ───────────────────────────────────────────────────────
const categoryRepo = new MongoCategoryRepository()
const taxonomyRepo = new MongoTaxonomyRepository()
const courseRepo   = new MongoCourseRepository()
const subjectRepo  = new MongoSubjectRepository()
const classRepo    = new MongoClassRepository()
const lessonRepo   = new MongoLessonRepository()
const courseworkRepo = new MongoCourseworkRepository()

const idList = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !mongoose.isValidObjectId(id))) {
    throw new AppError('Academic relationship IDs must be an array of valid IDs', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  }
  return [...new Set(value as string[])]
}

async function validateGradeStage(stageId?: string | null, gradeId?: string | null) {
  if (!stageId && !gradeId) return
  if (!stageId || !gradeId || !mongoose.isValidObjectId(stageId) || !mongoose.isValidObjectId(gradeId)) {
    throw new AppError('A valid stage and grade must be selected together', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  }
  const [stage, grade] = await Promise.all([
    AcademicStageModel.findOne({ _id: stageId, isActive: true }).select('_id'),
    GradeModel.findOne({ _id: gradeId, isActive: true }).select('stageId'),
  ])
  if (!stage || !grade || !grade.stageId?.equals(stage._id)) {
    throw new AppError('The selected grade does not belong to the selected stage', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  }
}

async function validateCourseAcademicContext(input: {
  stageId?: string | null; gradeId?: string | null; trackId?: string | null; trackIds?: string[];
  specializationId?: string | null; specializationIds?: string[]
}) {
  await validateGradeStage(input.stageId, input.gradeId)
  if (!input.stageId || !input.gradeId) {
    if (input.trackId || input.trackIds?.length || input.specializationId || input.specializationIds?.length) {
      throw new AppError('Tracks and specializations require a stage and grade', 422, true, 'INVALID_ACADEMIC_CONTEXT')
    }
    return
  }
  const trackIds = [...new Set([...(input.trackIds ?? []), ...(input.trackId ? [input.trackId] : [])])]
  const specializationIds = [...new Set([...(input.specializationIds ?? []), ...(input.specializationId ? [input.specializationId] : [])])]
  for (const id of [...trackIds, ...specializationIds]) if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid academic relationship ID', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  const validTracks = await TrackModel.find({ _id: { $in: trackIds }, isActive: true, $or: [{ gradeIds: input.gradeId }, { gradeIds: { $size: 0 } }, { gradeIds: { $exists: false } }] }).select('_id').lean()
  if (validTracks.length !== trackIds.length) throw new AppError('A selected track is not valid for this grade', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  const validSpecializations = await SpecializationModel.find({ _id: { $in: specializationIds }, isActive: true }).select('trackIds').lean()
  if (validSpecializations.length !== specializationIds.length) throw new AppError('A selected specialization is unavailable', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  if (validSpecializations.some((specialization) => specialization.trackIds?.length && trackIds.length > 0 && !specialization.trackIds.some((id) => trackIds.includes(String(id))))) {
    throw new AppError('A selected specialization does not belong to the selected tracks', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  }
}

function courseTitleKey(title: string): string {
  return title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

async function rejectDuplicateCourse(title: string, stageId: string, gradeId: string, excludeId?: string) {
  const titleKey = courseTitleKey(title)
  const candidates = await CourseModel.find({ stageId, gradeId, isActive: true, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
    .select('_id title').lean()
  if (candidates.some((course) => courseTitleKey(course.title) === titleKey)) {
    throw new AppError('A course with this title already exists for the selected stage and grade. Edit that course to share it across tracks or specializations.', 409, true, 'DUPLICATE_COURSE')
  }
}

function translateCourseDuplicate(error: unknown): never {
  if ((error as { code?: number })?.code === 11000) {
    throw new AppError('A course with this title already exists for the selected stage and grade. Edit that course to share it across tracks or specializations.', 409, true, 'DUPLICATE_COURSE')
  }
  throw error
}

async function rejectReferencedTaxonomy(kind: 'stage' | 'grade' | 'track' | 'specialization', id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid taxonomy ID', 422, true, 'INVALID_INPUT')
  const objectId = new mongoose.Types.ObjectId(id)
  let referenced = false
  if (kind === 'stage') referenced = Boolean(await Promise.all([
    GradeModel.exists({ stageId: objectId }), CourseModel.exists({ stageId: objectId }), UserModel.exists({ academicStageId: objectId }),
  ]).then((rows) => rows.some(Boolean)))
  if (kind === 'grade') referenced = Boolean(await Promise.all([
    TrackModel.exists({ gradeIds: objectId }), CourseModel.exists({ gradeId: objectId }), UserModel.exists({ academicGradeId: objectId }),
  ]).then((rows) => rows.some(Boolean)))
  if (kind === 'track') referenced = Boolean(await Promise.all([
    SpecializationModel.exists({ trackIds: objectId }), CourseModel.exists({ $or: [{ trackId: objectId }, { trackIds: objectId }] }), UserModel.exists({ academicTrackId: objectId }),
  ]).then((rows) => rows.some(Boolean)))
  if (kind === 'specialization') referenced = Boolean(await Promise.all([
    CourseModel.exists({ $or: [{ specializationId: objectId }, { specializationIds: objectId }] }), UserModel.exists({ academicSpecializationId: objectId }),
  ]).then((rows) => rows.some(Boolean)))
  if (referenced) throw new AppError('Referenced academic taxonomy cannot be deleted; deactivate it instead', 409, true, 'TAXONOMY_IN_USE')
}

// Category
const createCategoryUC   = new CreateCategoryUseCase(categoryRepo)
const updateCategoryUC   = new UpdateCategoryUseCase(categoryRepo)
const toggleCategoryUC   = new ToggleCategoryUseCase(categoryRepo)
const moveCategoryUC     = new MoveCategoryUseCase(categoryRepo)
const getCategoryTreeUC  = new GetCategoryTreeUseCase(categoryRepo)
const listCategoriesUC   = new ListCategoriesUseCase(categoryRepo)

// Course
const createCourseUC  = new CreateCourseUseCase(courseRepo)
const updateCourseUC  = new UpdateCourseUseCase(courseRepo)
const publishCourseUC = new PublishCourseUseCase(courseRepo)
const listCoursesUC   = new ListCoursesUseCase(courseRepo)
const getCourseUC     = new GetCourseUseCase(courseRepo)
const deleteCourseUC  = new DeleteCourseUseCase(courseRepo)

// Subject / Class / Lesson
const createSubjectUC = new CreateSubjectUseCase(subjectRepo, courseRepo)
const updateSubjectUC = new UpdateSubjectUseCase(subjectRepo)
const listSubjectsUC  = new ListSubjectsUseCase(subjectRepo)
const deleteSubjectUC = new DeleteSubjectUseCase(subjectRepo)

const createClassUC   = new CreateClassUseCase(classRepo, subjectRepo)
const updateClassUC   = new UpdateClassUseCase(classRepo)
const listClassesUC   = new ListClassesUseCase(classRepo)
const deleteClassUC   = new DeleteClassUseCase(classRepo)

const createLessonUC  = new CreateLessonUseCase(lessonRepo, classRepo)
const updateLessonUC  = new UpdateLessonUseCase(lessonRepo)
const publishLessonUC = new PublishLessonUseCase(lessonRepo)
const listLessonsUC   = new ListLessonsUseCase(lessonRepo)
const getLessonUC     = new GetLessonUseCase(lessonRepo)
const deleteLessonUC  = new DeleteLessonUseCase(lessonRepo)

import { QuizRepository } from '../../../assessment/infrastructure/persistence/QuizRepository'
const quizRepo = new QuizRepository()

const getCurriculumTreeUC = new GetCurriculumTreeUseCase(courseRepo, subjectRepo, classRepo, lessonRepo, courseworkRepo, quizRepo)

// ── Helper ──────────────────────────────────────────────────────────────────
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// Enrollment activation is an administrative action until a payment provider and
// business rules are configured. Clients cannot self-grant course access.
router.get('/enrollments/mine', authenticate, wrap(async (req, res) => {
  const enrollments = await EnrollmentModel.find({ studentId: req.user!.sub }).sort({ createdAt: -1 }).lean()
  res.json({ success: true, data: enrollments })
}))

router.post('/enrollments', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  const dto = z.object({ studentId: z.string().refine(mongoose.isValidObjectId), courseId: z.string().refine(mongoose.isValidObjectId) }).strict().parse(req.body)
  const { studentId, courseId } = dto
  const [student, course] = await Promise.all([
    UserModel.findOne({ _id: studentId, role: 'student', isActive: true }).select('_id'),
    CourseModel.findOne({ _id: courseId, isActive: true, status: 'published' }).select('_id'),
  ])
  if (!student || !course) throw new AppError('Student or published course was not found', 404, true, 'RESOURCE_NOT_FOUND')
  try {
    const enrollment = await EnrollmentModel.create({ studentId, courseId, status: 'ACTIVE', source: 'admin', enrolledAt: new Date() })
    await recordAuditEvent({ actorId: req.user!.sub, action: 'enrollment.grant', resourceType: 'enrollment', resourceId: enrollment._id.toString() })
    res.status(201).json({ success: true, data: enrollment })
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new AppError('An enrollment already exists for this student and course', 409, true, 'ENROLLMENT_EXISTS')
    throw error
  }
}))

router.patch('/enrollments/:id/revoke', authenticate, requirePermission('students', 'edit'), adminSensitiveLimiter, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid enrollment ID', 422, true, 'INVALID_INPUT')
  const enrollment = await EnrollmentModel.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ['PENDING', 'ACTIVE', 'SUSPENDED'] } },
    { $set: { status: 'REVOKED', revokedAt: new Date() } },
    { new: true },
  )
  if (!enrollment) throw new AppError('Active enrollment was not found', 404, true, 'RESOURCE_NOT_FOUND')
  await recordAuditEvent({ actorId: req.user!.sub, action: 'enrollment.revoke', resourceType: 'enrollment', resourceId: enrollment._id.toString() })
  res.json({ success: true, data: enrollment })
}))

// ═══════════════════════════════════════════════════════════════════════════
// EXPLICIT TAXONOMY (Stages, Grades, Tracks, Specializations)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/taxonomy', wrap(async (req, res) => {
  const onlyActive = req.query.includeInactive !== 'true'
  res.json({ success: true, data: await taxonomyRepo.getFullTaxonomy(onlyActive) })
}))

// Stages
router.get('/stages', wrap(async (req, res) => {
  res.json({ success: true, data: await taxonomyRepo.findAllStages(req.query.includeInactive !== 'true') })
}))
router.post('/stages', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const stage = new AcademicStage({ 
    id: req.body.id || new mongoose.Types.ObjectId().toHexString(), 
    name: req.body.name, 
    image: req.body.image,
    description: req.body.description,
    isActive: req.body.isActive ?? true 
  })
  res.status(201).json({ success: true, data: await taxonomyRepo.saveStage(stage) })
}))
router.put('/stages/:id', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const existing = await taxonomyRepo.findStageById(req.params.id)
  if (!existing) { res.status(404).json({ success: false, message: 'المرحلة غير موجودة' }); return }
  const updated = existing.update(req.body)
  res.json({ success: true, data: await taxonomyRepo.saveStage(updated) })
}))
router.delete('/stages/:id', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  await rejectReferencedTaxonomy('stage', req.params.id)
  await taxonomyRepo.deleteStage(req.params.id)
  res.json({ success: true })
}))

// Grades
router.get('/grades', wrap(async (req, res) => {
  res.json({ success: true, data: await taxonomyRepo.findAllGrades(req.query.includeInactive !== 'true') })
}))
router.post('/grades', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  if (!Number.isSafeInteger(req.body.name)) throw new AppError('Grade name must be an integer', 422, true, 'INVALID_INPUT')
  const stageId = req.body.stageId
  if (typeof stageId !== 'string' || !mongoose.isValidObjectId(stageId)) throw new AppError('A valid academic stage is required', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  if (!(await AcademicStageModel.exists({ _id: stageId, isActive: true }))) throw new AppError('Academic stage was not found', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  const grade = new Grade({ id: req.body.id || new mongoose.Types.ObjectId().toHexString(), name: req.body.name, stageId, isActive: req.body.isActive ?? true })
  res.status(201).json({ success: true, data: await taxonomyRepo.saveGrade(grade) })
}))
router.put('/grades/:id', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const existing = await taxonomyRepo.findGradeById(req.params.id)
  if (!existing) { res.status(404).json({ success: false, message: 'الصف غير موجود' }); return }
  const name = req.body.name === undefined ? existing.name : req.body.name
  if (!Number.isSafeInteger(name)) throw new AppError('Grade name must be an integer', 422, true, 'INVALID_INPUT')
  const stageId = req.body.stageId === undefined ? existing.stageId : req.body.stageId
  if (typeof stageId !== 'string' || !mongoose.isValidObjectId(stageId) || !(await AcademicStageModel.exists({ _id: stageId, isActive: true }))) throw new AppError('A valid academic stage is required', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  const updated = existing.update({ name, stageId, isActive: req.body.isActive })
  res.json({ success: true, data: await taxonomyRepo.saveGrade(updated) })
}))
router.delete('/grades/:id', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  await rejectReferencedTaxonomy('grade', req.params.id)
  await taxonomyRepo.deleteGrade(req.params.id)
  res.json({ success: true })
}))

// Tracks
router.get('/tracks', wrap(async (req, res) => {
  res.json({ success: true, data: await taxonomyRepo.findAllTracks(req.query.includeInactive !== 'true') })
}))
router.post('/tracks', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const gradeIds = idList(req.body.gradeIds ?? [])
  if (gradeIds.length !== await GradeModel.countDocuments({ _id: { $in: gradeIds }, isActive: true, stageId: { $exists: true } })) throw new AppError('Track grades must be active and belong to a stage', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  const track = new Track({ id: req.body.id || new mongoose.Types.ObjectId().toHexString(), name: req.body.name, gradeIds, isActive: req.body.isActive ?? true })
  res.status(201).json({ success: true, data: await taxonomyRepo.saveTrack(track) })
}))
router.put('/tracks/:id', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const existing = await taxonomyRepo.findTrackById(req.params.id)
  if (!existing) { res.status(404).json({ success: false, message: 'المسار غير موجود' }); return }
  const gradeIds = req.body.gradeIds === undefined ? existing.gradeIds : idList(req.body.gradeIds)
  if (gradeIds.length !== await GradeModel.countDocuments({ _id: { $in: gradeIds }, isActive: true, stageId: { $exists: true } })) throw new AppError('Track grades must be active and belong to a stage', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  const updated = existing.update({ ...req.body, gradeIds })
  res.json({ success: true, data: await taxonomyRepo.saveTrack(updated) })
}))
router.delete('/tracks/:id', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  await rejectReferencedTaxonomy('track', req.params.id)
  await taxonomyRepo.deleteTrack(req.params.id)
  res.json({ success: true })
}))

// Specializations
router.get('/specializations', wrap(async (req, res) => {
  res.json({ success: true, data: await taxonomyRepo.findAllSpecializations(req.query.includeInactive !== 'true') })
}))
router.post('/specializations', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const trackIds = idList(req.body.trackIds ?? [])
  if (trackIds.length !== await TrackModel.countDocuments({ _id: { $in: trackIds }, isActive: true })) throw new AppError('Specialization tracks must be active', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  const spec = new Specialization({ id: req.body.id || new mongoose.Types.ObjectId().toHexString(), name: req.body.name, trackIds, isActive: req.body.isActive ?? true })
  res.status(201).json({ success: true, data: await taxonomyRepo.saveSpecialization(spec) })
}))
router.put('/specializations/:id', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const existing = await taxonomyRepo.findSpecializationById(req.params.id)
  if (!existing) { res.status(404).json({ success: false, message: 'التخصص غير موجود' }); return }
  const trackIds = req.body.trackIds === undefined ? existing.trackIds : idList(req.body.trackIds)
  if (trackIds.length !== await TrackModel.countDocuments({ _id: { $in: trackIds }, isActive: true })) throw new AppError('Specialization tracks must be active', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  const updated = existing.update({ ...req.body, trackIds })
  res.json({ success: true, data: await taxonomyRepo.saveSpecialization(updated) })
}))
router.delete('/specializations/:id', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  await rejectReferencedTaxonomy('specialization', req.params.id)
  await taxonomyRepo.deleteSpecialization(req.params.id)
  res.json({ success: true })
}))

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES (dynamic taxonomy)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/learning/categories/tree
 * Public. Returns the full nested taxonomy tree for React dropdowns.
 * Admins can pass ?includeInactive=true to see all nodes.
 */
router.get('/categories/tree', wrap(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'admin'
  const tree = await getCategoryTreeUC.execute(includeInactive)
  res.json({ success: true, data: tree })
}))

/**
 * GET /api/learning/categories
 * Public (or admin with ?includeInactive=true). Flat list for admin data tables.
 */
router.get('/categories', wrap(async (req, res) => {
  const onlyActive = req.query.includeInactive !== 'true'
  res.json({ success: true, data: await listCategoriesUC.execute(onlyActive) })
}))

/**
 * POST /api/learning/categories
 * Admin creates a new taxonomy node.
 * Body: { name, parentId?, description?, icon?, order? }
 */
router.post('/categories', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const dto    = CreateCategorySchema.parse(req.body)
  const result = await createCategoryUC.execute(dto)
  res.status(201).json({ success: true, data: result })
}))

/**
 * PATCH /api/learning/categories/:id
 * Admin updates a category node (name, description, icon, order).
 * Does NOT move in tree — use /move for that.
 */
router.patch('/categories/:id', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const dto    = UpdateCategorySchema.parse(req.body)
  const result = await updateCategoryUC.execute(req.params.id, dto)
  res.json({ success: true, data: result })
}))

/**
 * PATCH /api/learning/categories/:id/toggle
 * Admin activates/deactivates a category.
 * Deactivation is blocked if the category has assigned courses.
 */
router.patch('/categories/:id/toggle', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const result = await toggleCategoryUC.execute(req.params.id)
  res.json({ success: true, data: result })
}))

/**
 * PATCH /api/learning/categories/:id/move
 * Admin re-parents a category node in the tree.
 * Body: { parentId: string | null }  — null promotes to root.
 * Guards against circular reference.
 */
router.patch('/categories/:id/move', authenticate, requirePermission('categories', 'edit'), wrap(async (req, res) => {
  const dto    = MoveCategorySchema.parse(req.body)
  const result = await moveCategoryUC.execute(req.params.id, dto)
  res.json({ success: true, data: result })
}))

// ═══════════════════════════════════════════════════════════════════════════
// COURSES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/learning/courses
 * Public. Filter by ?categoryId=xxx&page=1&limit=20
 */
router.get('/courses', optionalAuthenticate, wrap(async (req, res) => {
  const isAdmin = canReadCourseAdminData(req.user)
  const filter: Record<string, unknown> = {
    categoryId:       req.query.categoryId       as string | undefined,
    stageId:          req.query.stageId          as string | undefined,
    gradeId:          req.query.gradeId          as string | undefined,
    trackId:          req.query.trackId          as string | undefined,
    specializationId: req.query.specializationId as string | undefined,
  }
  // Public users see only published+active courses; admins see active unless includeInactive is specified
  if (req.query.includeInactive !== 'true' && req.query.isActive === undefined) {
    filter.isActive = true
  } else if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true'
  }
  if (!isAdmin) {
    filter.isPublished = true
    filter.isActive    = true
  }
  if (req.user?.role === 'student') {
    filter.visibleCourseIds = await CourseAccessPolicy.eligibleCourseIds(req.user) ?? []
  }
  const pagination = PaginationSchema.parse(req.query)
  res.json({ success: true, data: await listCoursesUC.execute(filter, pagination) })
}))

router.get('/courses/:id', optionalAuthenticate, wrap(async (req, res) => {
  await CourseAccessPolicy.loadForView(req.params.id, req.user)
  res.json({ success: true, data: await getCourseUC.execute(req.params.id) })
}))

router.get('/courses/:id/tree', optionalAuthenticate, wrap(async (req, res) => {
  await CourseAccessPolicy.loadForView(req.params.id, req.user)
  const isAdmin = canReadCourseAdminData(req.user)
  res.json({ success: true, data: await getCurriculumTreeUC.execute(req.params.id, isAdmin) })
}))

router.post('/courses', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  const dto    = CreateCourseSchema.parse(req.body)
  if (!dto.stageId || !dto.gradeId) throw new AppError('A course must belong to an academic stage and grade', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  await validateCourseAcademicContext(dto)
  await rejectDuplicateCourse(dto.title, dto.stageId, dto.gradeId)
  try {
    const result = await createCourseUC.execute(dto)
    await recordAuditEvent({ actorId: req.user!.sub, action: 'course.create', resourceType: 'course', resourceId: result.id })
    res.status(201).json({ success: true, data: result })
  } catch (error) { translateCourseDuplicate(error) }
}))

router.patch('/courses/:id', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  const dto    = UpdateCourseSchema.parse(req.body)
  const current = await CourseModel.findById(req.params.id).select('stageId gradeId trackId trackIds specializationId specializationIds').lean()
  if (!current) throw new AppError('Course was not found', 404, true, 'RESOURCE_NOT_FOUND')
  const finalStageId = dto.stageId === undefined ? current.stageId?.toString() : dto.stageId
  const finalGradeId = dto.gradeId === undefined ? current.gradeId?.toString() : dto.gradeId
  if ((current.stageId || current.gradeId || dto.stageId !== undefined || dto.gradeId !== undefined) && (!finalStageId || !finalGradeId)) {
    throw new AppError('A course must remain assigned to an academic stage and grade', 422, true, 'INVALID_ACADEMIC_CONTEXT')
  }
  if (finalStageId && finalGradeId) {
    const existingCourse = await CourseModel.findById(req.params.id).select('title').lean()
    await rejectDuplicateCourse(dto.title ?? existingCourse!.title, finalStageId, finalGradeId, req.params.id)
  }
  await validateCourseAcademicContext({
    stageId: finalStageId,
    gradeId: finalGradeId,
    trackId: dto.trackId === undefined ? current.trackId?.toString() : dto.trackId,
    trackIds: dto.trackIds ?? (current.trackIds ?? []).map(String),
    specializationId: dto.specializationId === undefined ? current.specializationId?.toString() : dto.specializationId,
    specializationIds: dto.specializationIds ?? (current.specializationIds ?? []).map(String),
  })

  let affectedEnrollments = 0
  const stageChanged = dto.stageId !== undefined && String(dto.stageId) !== String(current.stageId)
  const gradeChanged = dto.gradeId !== undefined && String(dto.gradeId) !== String(current.gradeId)
  if (stageChanged || gradeChanged) {
    affectedEnrollments = await EnrollmentModel.countDocuments({ courseId: req.params.id, status: 'active' })
  }

  try {
    const result = await updateCourseUC.execute(req.params.id, dto)
    await recordAuditEvent({ actorId: req.user!.sub, action: 'course.update', resourceType: 'course', resourceId: req.params.id })
    res.json({
      success: true,
      data: result,
      warning: affectedEnrollments > 0 ? `تنبيه: تم تعديل التصنيف الأكاديمي للمقرر مع وجود ${affectedEnrollments} طالب مسجل حالياً قد يتأثر وصولهم للمقرر.` : undefined
    })
  } catch (error) { translateCourseDuplicate(error) }
}))

router.patch('/courses/:id/publish', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  if (typeof req.body?.publish !== 'boolean' && req.body?.publish !== undefined) throw new AppError('publish must be a boolean', 422, true, 'INVALID_INPUT')
  const publish = req.body.publish ?? true
  await publishCourseUC.execute(req.params.id, publish)
  await recordAuditEvent({ actorId: req.user!.sub, action: publish ? 'course.publish' : 'course.unpublish', resourceType: 'course', resourceId: req.params.id })
  res.json({ success: true })
}))

router.delete('/courses/:id', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  await deleteCourseUC.execute(req.params.id)
  const subjects = await SubjectModel.find({ courseId: req.params.id }).select('_id').lean()
  const subjectIds = subjects.map(s => s._id)
  const classes = await ClassModel.find({ subjectId: { $in: subjectIds } }).select('_id').lean()
  const classIds = classes.map(c => c._id)

  await Promise.all([
    SubjectModel.updateMany({ courseId: req.params.id }, { isActive: false }),
    ClassModel.updateMany({ subjectId: { $in: subjectIds } }, { isActive: false }),
    LessonModel.updateMany({ classId: { $in: classIds } }, { isActive: false }),
    CourseworkModel.updateMany({ subjectId: { $in: subjectIds } }, { isActive: false }),
    recordAuditEvent({ actorId: req.user!.sub, action: 'course.delete', resourceType: 'course', resourceId: req.params.id })
  ])
  res.json({ success: true })
}))

// ═══════════════════════════════════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/courses/:courseId/subjects', authenticate, wrap(async (req, res) => {
  await CourseAccessPolicy.loadForView(req.params.courseId, req.user)
  res.json({ success: true, data: await listSubjectsUC.execute(req.params.courseId) })
}))

router.post('/subjects', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  const dto    = CreateSubjectSchema.parse(req.body)
  const result = await createSubjectUC.execute(dto)
  res.status(201).json({ success: true, data: result })
}))

router.patch('/subjects/:id', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  const dto    = UpdateSubjectSchema.parse(req.body)
  const result = await updateSubjectUC.execute(req.params.id, dto)
  res.json({ success: true, data: result })
}))

router.delete('/subjects/:id', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  await deleteSubjectUC.execute(req.params.id)
  const classes = await ClassModel.find({ subjectId: req.params.id }).select('_id').lean()
  const classIds = classes.map(c => c._id)

  await Promise.all([
    ClassModel.updateMany({ subjectId: req.params.id }, { isActive: false }),
    LessonModel.updateMany({ classId: { $in: classIds } }, { isActive: false }),
    CourseworkModel.updateMany({ subjectId: req.params.id }, { isActive: false }),
    recordAuditEvent({ actorId: req.user!.sub, action: 'subject.delete', resourceType: 'subject', resourceId: req.params.id })
  ])
  res.json({ success: true })
}))

// ═══════════════════════════════════════════════════════════════════════════
// CLASSES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/subjects/:subjectId/classes', authenticate, wrap(async (req, res) => {
  const subject = await SubjectModel.findById(req.params.subjectId).select('courseId')
  if (!subject) throw new AppError('Subject was not found', 404, true, 'RESOURCE_NOT_FOUND')
  await CourseAccessPolicy.loadForView(subject.courseId.toString(), req.user)
  res.json({ success: true, data: await listClassesUC.execute(req.params.subjectId) })
}))

router.post('/classes', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  const dto    = CreateClassSchema.parse(req.body)
  const result = await createClassUC.execute(dto)
  res.status(201).json({ success: true, data: result })
}))

router.patch('/classes/:id', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  const dto    = UpdateClassSchema.parse(req.body)
  const result = await updateClassUC.execute(req.params.id, dto)
  res.json({ success: true, data: result })
}))

router.delete('/classes/:id', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  await deleteClassUC.execute(req.params.id)
  res.json({ success: true })
}))

// ═══════════════════════════════════════════════════════════════════════════
// LESSONS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/classes/:classId/lessons', authenticate, wrap(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.classId).select('subjectId')
  const subject = classItem ? await SubjectModel.findById(classItem.subjectId).select('courseId') : null
  if (!subject) throw new AppError('Unit was not found', 404, true, 'RESOURCE_NOT_FOUND')
  await CourseAccessPolicy.loadForView(subject.courseId.toString(), req.user)
  const isAdmin = canReadCourseAdminData(req.user)
  const lessons = await listLessonsUC.execute(req.params.classId, isAdmin)
  const isEntitled = await CourseAccessPolicy.hasEntitlement(subject.courseId.toString(), req.user)
  const visible = (isAdmin || isEntitled) ? lessons : lessons.filter((lesson) => lesson.isFree)
  res.json({ success: true, data: visible })
}))

router.get('/lessons/:id', optionalAuthenticate, wrap(async (req, res) => {
  await LessonAccessPolicy.authorize(req.params.id, req.user)
  res.json({ success: true, data: await getLessonUC.execute(req.params.id) })
}))

router.post('/lessons', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  const dto    = CreateLessonSchema.parse(req.body)
  const result = await createLessonUC.execute(dto)
  res.status(201).json({ success: true, data: result })
}))

router.patch('/lessons/:id', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  const dto    = UpdateLessonSchema.parse(req.body)
  const result = await updateLessonUC.execute(req.params.id, dto)
  res.json({ success: true, data: result })
}))

router.patch('/lessons/:id/publish', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  if (typeof req.body?.publish !== 'boolean' && req.body?.publish !== undefined) throw new AppError('publish must be a boolean', 422, true, 'INVALID_INPUT')
  const publish = req.body.publish ?? true
  await publishLessonUC.execute(req.params.id, publish)
  await recordAuditEvent({ actorId: req.user!.sub, action: publish ? 'lesson.publish' : 'lesson.unpublish', resourceType: 'lesson', resourceId: req.params.id })
  res.json({ success: true })
}))

router.delete('/lessons/:id', authenticate, requirePermission('courses', 'edit'), wrap(async (req, res) => {
  await deleteLessonUC.execute(req.params.id)
  await recordAuditEvent({ actorId: req.user!.sub, action: 'lesson.delete', resourceType: 'lesson', resourceId: req.params.id })
  res.json({ success: true })
}))

// ═══════════════════════════════════════════════════════════════════════════
// COURSEWORKS (اعمال السنة)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/subjects/:subjectId/courseworks', authenticate, wrap(CourseworkController.getBySubject))
router.get('/courseworks', authenticate, requirePermission('courses', 'edit'), wrap(CourseworkController.getAll))
router.get('/courseworks/:id', authenticate, wrap(CourseworkController.getById))
router.post('/courseworks', authenticate, requirePermission('courses', 'edit'), wrap(CourseworkController.create))
router.patch('/courseworks/:id', authenticate, requirePermission('courses', 'edit'), wrap(CourseworkController.update))
router.delete('/courseworks/:id', authenticate, requirePermission('courses', 'edit'), wrap(CourseworkController.delete))

export { router as learningRouter }
