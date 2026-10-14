import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { NotFoundError, AppError } from '@shared/errors/AppError'

export class AdminToggleStudentUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(studentId: string, activate: boolean): Promise<void> {
    const user = await this.userRepo.findById(new UniqueEntityId(studentId))
    if (!user)           throw new NotFoundError('الطالب')
    if (!user.role.isStudent()) throw new AppError('المستخدم ليس طالباً', 400)

    activate ? user.activate() : user.deactivate()
    await this.userRepo.save(user)
  }
}
