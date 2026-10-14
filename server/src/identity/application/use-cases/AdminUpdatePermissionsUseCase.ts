import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError, AppError } from '@shared/errors/AppError'

export class AdminUpdatePermissionsUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(adminId: string, permissions: Record<string, { read: boolean; edit: boolean }>) {
    const user = await this.userRepo.findById(new UniqueEntityId(adminId))
    if (!user) throw new NotFoundError('المشرف')
    if (!user.role.isAdmin()) throw new AppError('المستخدم ليس مشرفاً', 400)
    if (user.isSuperAdmin) throw new AppError('لا يمكن تعديل صلاحيات المشرف الأساسي', 403)

    user.updatePermissions(permissions)
    await this.userRepo.save(user)
  }
}
