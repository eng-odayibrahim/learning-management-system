import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError } from '@shared/errors/AppError'
import crypto from 'crypto'

export class RegeneratePasswordUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string): Promise<{ newPassword: string }> {
    const user = await this.userRepo.findById(new UniqueEntityId(userId))

    if (!user) {
      throw new NotFoundError('الطالب غير موجود')
    }

    // Generate random 6-character uppercase password with S- prefix
    const newPasswordStr = `S-${crypto.randomBytes(9).toString('base64url')}`
    
    user.changePassword(newPasswordStr)

    await this.userRepo.save(user)

    return { newPassword: newPasswordStr }
  }
}
