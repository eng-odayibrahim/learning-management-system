import crypto from 'crypto'
import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { JwtService, hashRefreshToken } from '../../infrastructure/services/JwtService'
import { UnauthorizedError } from '@shared/errors/AppError'
import { LoginDto } from '../dtos/AuthDtos'

interface LoginResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    username: string
    fullName: string
    role: string
    stage?: string
    grade?: string
    track?: string
    specialization?: string
    permissions?: Record<string, { read: boolean; edit: boolean }>
    isSuperAdmin?: boolean
  }
}

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResult> {
    const user = await this.userRepo.findByUsername(dto.username.toLowerCase().trim())

    if (!user) throw new UnauthorizedError('بيانات الدخول غير صحيحة')
    if (!user.isActive) throw new UnauthorizedError('الحساب غير مفعّل')

    const isMatch = await user.password.compare(dto.password)
    if (!isMatch) throw new UnauthorizedError('بيانات الدخول غير صحيحة')

    const sessionId = crypto.randomUUID()
    const accessToken = this.jwtService.signAccessToken({ sub: user.id.toString(), sid: sessionId })
    const refreshToken = this.jwtService.signRefreshToken({ sub: user.id.toString(), sid: sessionId })

    user.setSession(sessionId, hashRefreshToken(refreshToken))
    await this.userRepo.save(user)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id.toString(),
        username: user.username,
        fullName: user.fullName,
        role: user.role.value,
        stage: user.stage,
        grade: user.grade,
        track: user.track,
        specialization: user.specialization,
        permissions: user.permissions,
        isSuperAdmin: user.isSuperAdmin,
      },
    }
  }
}
