import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError } from '@shared/errors/AppError'
import { UserModel } from '../../infrastructure/persistence/UserModel'

export class GetMeUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string) {
    const user = await this.userRepo.findById(new UniqueEntityId(userId))
    if (!user) throw new NotFoundError('المستخدم')

    // Fetch canonical academic placement ObjectIds directly — the domain entity
    // does not expose them since they are not part of the domain invariants.
    const placement = await UserModel.findById(userId)
      .select('academicStageId academicGradeId academicTrackId academicSpecializationId')
      .lean()

    return {
      id:       user.id.toString(),
      username: user.username,
      email:    user.email,
      fullName: user.fullName,
      role:     user.role.value,
      phones:   user.phones,
      stage:    user.stage,
      grade:    user.grade,
      track:    user.track,
      specialization: user.specialization,
      academicStageId:          placement?.academicStageId?.toString() ?? null,
      academicGradeId:          placement?.academicGradeId?.toString() ?? null,
      academicTrackId:          placement?.academicTrackId?.toString() ?? null,
      academicSpecializationId: placement?.academicSpecializationId?.toString() ?? null,
      permissions:  user.permissions,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }
  }
}
