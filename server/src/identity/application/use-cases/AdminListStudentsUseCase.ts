import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { UserModel } from '../../infrastructure/persistence/UserModel'

export class AdminListStudentsUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(filter?: { isActive?: boolean }) {
    const users = await this.userRepo.findAll({ role: 'student', ...filter })
    const ids = users.map((u) => u.id.toString())
    // Fetch canonical academic placement ObjectIds — not stored in the domain entity.
    const placements = await UserModel.find({ _id: { $in: ids } })
      .select('academicStageId academicGradeId academicTrackId academicSpecializationId')
      .lean()
    const placementMap = Object.fromEntries(placements.map((p) => [p._id.toString(), p]))

    return users.map((u) => {
      const p = placementMap[u.id.toString()] ?? {}
      return {
        id:       u.id.toString(),
        username: u.username,
        email:    u.email,
        fullName: u.fullName,
        phones:   u.phones,
        stage:    u.stage,
        grade:    u.grade,
        track:    u.track,
        specialization: u.specialization,
        academicStageId:          (p as any).academicStageId?.toString()          ?? null,
        academicGradeId:          (p as any).academicGradeId?.toString()          ?? null,
        academicTrackId:          (p as any).academicTrackId?.toString()          ?? null,
        academicSpecializationId: (p as any).academicSpecializationId?.toString() ?? null,
        isActive: u.isActive,
        isPaid:   u.isPaid,
        paidPercentage: u.paidPercentage,
        createdAt: u.createdAt,
      }
    })
  }
}
