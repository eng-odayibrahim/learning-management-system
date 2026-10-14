import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError, AppError } from '@shared/errors/AppError'

export class AdminToggleAdminUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(adminId: string, activate: boolean): Promise<void> {
    const user = await this.userRepo.findById(new UniqueEntityId(adminId))
    if (!user) throw new NotFoundError('المشرف')
    if (!user.role.isAdmin()) throw new AppError('المستخدم ليس مشرفاً', 400)
    if (user.isSuperAdmin) throw new AppError('لا يمكن تعطيل المشرف الأساسي', 403)

    activate ? user.activate() : user.deactivate()
    await this.userRepo.save(user)
  }
}
