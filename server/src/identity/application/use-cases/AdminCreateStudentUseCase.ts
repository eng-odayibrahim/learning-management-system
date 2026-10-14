import mongoose from 'mongoose'
import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { User } from '../../domain/entities/User'
import { ConflictError, AppError } from '@shared/errors/AppError'
import { RegisterStudentDto } from '../dtos/AuthDtos'
import { AcademicStageModel, GradeModel, TrackModel, SpecializationModel } from '../../../learning/infrastructure/persistence/TaxonomyModels'
import { isSecondaryThirdGrade } from '../../../shared/utils/academicTaxonomy'
import crypto from 'crypto'

export class AdminCreateStudentUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(dto: RegisterStudentDto): Promise<{ id: string; username: string; password: string }> {
    // ── 1. Validate academic placement IDs ────────────────────────────────────
    if (!mongoose.isValidObjectId(dto.stageId) || !mongoose.isValidObjectId(dto.gradeId)) {
      throw new AppError('معرّف المرحلة أو الصف غير صالح', 422, true, 'INVALID_ACADEMIC_CONTEXT')
    }

    const [stage, grade] = await Promise.all([
      AcademicStageModel.findOne({ _id: dto.stageId, isActive: true }).select('_id name'),
      GradeModel.findOne({ _id: dto.gradeId, isActive: true }).select('stageId name'),
    ])
    if (!stage || !grade || !grade.stageId?.equals(stage._id)) {
      throw new AppError('الصف الدراسي لا ينتمي إلى المرحلة المحددة', 422, true, 'INVALID_ACADEMIC_CONTEXT')
    }

    const requiresTrack = isSecondaryThirdGrade(stage.name, grade.name)

    if (requiresTrack) {
      const tracksExist = await TrackModel.exists({ gradeIds: grade._id, isActive: true })
      if (tracksExist && !dto.trackId) {
        throw new AppError('المسار الدراسي مطلوب لطلاب الصف الثالث الثانوي', 422, true, 'INVALID_ACADEMIC_CONTEXT')
      }
    }

    if (dto.trackId) {
      if (!mongoose.isValidObjectId(dto.trackId)) throw new AppError('معرّف المسار غير صالح', 422, true, 'INVALID_ACADEMIC_CONTEXT')
      const track = await TrackModel.findOne({ _id: dto.trackId, isActive: true }).select('gradeIds')
      if (!track || (track.gradeIds?.length && !track.gradeIds.some((id) => id.equals(grade._id)))) {
        throw new AppError('المسار غير صالح للصف الدراسي المحدد', 422, true, 'INVALID_ACADEMIC_CONTEXT')
      }

      const specsExist = await SpecializationModel.exists({ trackIds: track._id, isActive: true })
      if (specsExist && !dto.specializationId) {
        throw new AppError('التخصص مطلوب لهذا المسار', 422, true, 'INVALID_ACADEMIC_CONTEXT')
      }
    }

    if (dto.specializationId) {
      if (!mongoose.isValidObjectId(dto.specializationId)) throw new AppError('معرّف التخصص غير صالح', 422, true, 'INVALID_ACADEMIC_CONTEXT')
      const specialization = await SpecializationModel.findOne({ _id: dto.specializationId, isActive: true }).select('trackIds')
      if (!specialization || (specialization.trackIds?.length && (!dto.trackId || !specialization.trackIds.some((id) => id.toString() === dto.trackId)))) {
        throw new AppError('التخصص غير صالح للمسار المحدد', 422, true, 'INVALID_ACADEMIC_CONTEXT')
      }
    }

    // ── 2. Generate sequential username ───────────────────────────────────────
    const currentYear = new Date().getFullYear()
    const latestStudent = await this.userRepo.findLatestStudentByYear(currentYear)
    let nextSeq = 1
    if (latestStudent) {
      const match = latestStudent.username.match(/s(\d{4})$/)
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1
      }
    }

    if (nextSeq > 10000) {
      throw new ConflictError('تم الوصول للحد الأقصى للطلاب هذا العام (10000)')
    }

    const username = `${currentYear}s${nextSeq.toString().padStart(4, '0')}`

    // Auto-generate password: S-[12 random chars]
    const password = `S-${crypto.randomBytes(9).toString('base64url')}`

    // ── 3. Create user record with canonical academic placement ────────────────
    const user = User.create({
      username,
      password,
      role:     'student',
      fullName: dto.fullName,
      phones:   dto.phones || [],
    })

    await this.userRepo.save(user)

    // ── 4. Persist academic placement IDs directly (bypass domain to avoid
    //       exposing raw ObjectIds in domain model — kept in UserModel only)
    const { UserModel } = await import('../../infrastructure/persistence/UserModel')
    await UserModel.updateOne({ _id: user.id.toString() }, {
      $set: {
        academicStageId:          stage._id,
        academicGradeId:          grade._id,
        academicTrackId:          (requiresTrack && dto.trackId) ? new mongoose.Types.ObjectId(dto.trackId) : undefined,
        academicSpecializationId: (requiresTrack && dto.specializationId) ? new mongoose.Types.ObjectId(dto.specializationId) : undefined,
      },
    })

    user.clearDomainEvents()

    return {
      id: user.id.toString(),
      username,
      password,
    }
  }
}
