import crypto from 'crypto'
import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { JwtService, hashRefreshToken, matchesRefreshToken } from '../../infrastructure/services/JwtService'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { UnauthorizedError } from '@shared/errors/AppError'
import { RefreshTokenDto } from '../dtos/AuthDtos'

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.jwtService.verifyRefreshToken(dto.refreshToken)
    const user = await this.userRepo.findById(new UniqueEntityId(payload.sub))

    if (
      !user ||
      !user.isActive ||
      user.sessionId !== payload.sid ||
      !matchesRefreshToken(dto.refreshToken, user.refreshTokenHash)
    ) {
      throw new UnauthorizedError('رمز التحديث غير صالح')
    }

    const sessionId = user.sessionId
    if (!sessionId) throw new UnauthorizedError('رمز التحديث غير صالح')

    const refreshToken = this.jwtService.signRefreshToken({ sub: user.id.toString(), sid: sessionId })
    const accessToken = this.jwtService.signAccessToken({ sub: user.id.toString(), sid: sessionId })

    const rotated = await this.userRepo.rotateRefreshToken(
      user.id.toString(), sessionId, user.refreshTokenHash!, hashRefreshToken(refreshToken),
    )
    if (!rotated) throw new UnauthorizedError('رمز التحديث غير صالح')

    return { accessToken, refreshToken }
  }
}
