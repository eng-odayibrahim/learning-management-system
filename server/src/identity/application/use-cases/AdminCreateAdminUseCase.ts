import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { User } from '../../domain/entities/User'
import { AppError } from '@shared/errors/AppError'
import crypto from 'crypto'

interface CreateAdminDto {
  fullName: string
  email: string
  permissions: Record<string, { read: boolean; edit: boolean }>
}

export class AdminCreateAdminUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(dto: CreateAdminDto) {
    const username = dto.email.toLowerCase().trim()
    
    const exists = await this.userRepo.existsByUsername(username)
    if (exists) {
      throw new AppError('البريد الإلكتروني موجود مسبقاً كمستخدم', 409)
    }

    const generatedPassword = crypto.randomBytes(12).toString('base64url')

    const admin = User.create({
      username,
      fullName: dto.fullName,
      email: dto.email,
      password: generatedPassword,
      role: 'admin',
      permissions: dto.permissions,
      isSuperAdmin: false,
    })

    await this.userRepo.save(admin)

    return {
      id: admin.id.toString(),
      username: admin.username,
      fullName: admin.fullName,
      email: admin.email,
      isActive: admin.isActive,
      permissions: admin.permissions,
      generatedPassword, // Return this so the frontend can show it to the admin
    }
  }
}
