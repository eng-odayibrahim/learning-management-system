import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

export class AdminUpdateFinanceUseCase {
  constructor(private userRepo: IUserRepository) {}

  async execute(studentId: string, data: { isPaid: boolean; paidPercentage: number }): Promise<void> {
    const user = await this.userRepo.findById(new UniqueEntityId(studentId))
    if (!user) throw new Error('Student not found')

    user.updateFinance(data)
    await this.userRepo.save(user)
  }
}
