import { IUserRepository } from '../../domain/repositories/IUserRepository'

export class LogoutUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string, sessionId: string): Promise<void> {
    await this.userRepo.revokeSession(userId, sessionId)
  }
}
