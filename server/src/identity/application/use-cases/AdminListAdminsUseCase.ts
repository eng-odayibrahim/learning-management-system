import { IUserRepository } from '../../domain/repositories/IUserRepository'

export class AdminListAdminsUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute() {
    const users = await this.userRepo.findAll({ role: 'admin' })
    return users.map(u => ({
      id:       u.id.toString(),
      username: u.username,
      email:    u.email,
      fullName: u.fullName,
      isActive: u.isActive,
      isSuperAdmin: u.isSuperAdmin,
      permissions: u.permissions,
      createdAt: u.createdAt,
    }))
  }
}
