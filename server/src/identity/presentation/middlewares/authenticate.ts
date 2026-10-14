import { Request, Response, NextFunction } from 'express'
import { JwtService, SessionTokenPayload } from '../../infrastructure/services/JwtService'
import { UnauthorizedError, ForbiddenError } from '@shared/errors/AppError'
import { RoleType } from '../../domain/value-objects/UserRole'
import { IUserRepository } from '../../domain/repositories/IUserRepository'
import { MongoUserRepository } from '../../infrastructure/persistence/MongoUserRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import { User } from '../../domain/entities/User'

export interface AuthenticatedUser extends SessionTokenPayload {
  username: string
  email?: string
  fullName: string
  role: RoleType
  permissions?: Record<string, { read: boolean; edit: boolean }>
  isSuperAdmin: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

type Middleware = (req: Request, res: Response, next: NextFunction) => void

export function createAuthMiddleware(userRepo: IUserRepository, jwtService: JwtService) {
  const loadCurrentUser = async (payload: SessionTokenPayload): Promise<AuthenticatedUser> => {
    const user: User | null = await userRepo.findById(new UniqueEntityId(payload.sub))
    if (!user || !user.isActive || !user.sessionId || user.sessionId !== payload.sid) {
      throw new UnauthorizedError('الجلسة غير صالحة أو الحساب غير مفعّل')
    }

    return {
      sub: user.id.toString(),
      sid: user.sessionId,
      tokenType: 'access',
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role.value,
      permissions: user.permissions,
      isSuperAdmin: user.isSuperAdmin,
    }
  }

  const authenticate: Middleware = (req, _res, next) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ') || !header.slice(7).trim()) {
      next(new UnauthorizedError('يجب تسجيل الدخول'))
      return
    }

    let payload: SessionTokenPayload
    try {
      payload = jwtService.verifyAccessToken(header.slice(7).trim())
    } catch (error) {
      next(error)
      return
    }

    void loadCurrentUser(payload)
      .then((currentUser) => {
        req.user = currentUser
        next()
      })
      .catch(next)
  }

  const optionalAuthenticate: Middleware = (req, _res, next) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ') || !header.slice(7).trim()) {
      next()
      return
    }

    let payload: SessionTokenPayload
    try {
      payload = jwtService.verifyAccessToken(header.slice(7).trim())
    } catch {
      next()
      return
    }

    void loadCurrentUser(payload)
      .then((currentUser) => {
        req.user = currentUser
        next()
      })
      .catch(next)
  }

  return { authenticate, optionalAuthenticate }
}

let defaultMiddleware: ReturnType<typeof createAuthMiddleware> | undefined
function defaults() {
  if (!defaultMiddleware) {
    defaultMiddleware = createAuthMiddleware(new MongoUserRepository(), new JwtService())
  }
  return defaultMiddleware
}

export const authenticate: Middleware = (req, res, next) => defaults().authenticate(req, res, next)
export const optionalAuthenticate: Middleware = (req, res, next) => defaults().optionalAuthenticate(req, res, next)

export function requireRole(...roles: RoleType[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError())
    if (!roles.includes(req.user.role)) return next(new ForbiddenError('غير مصرح لك بهذا الإجراء'))
    next()
  }
}

export const requireAdmin = requireRole('admin')
export const requireStudent = requireRole('student')

export function requirePermission(moduleName: string, action: 'read' | 'edit') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError())
    if (req.user.role !== 'admin') return next(new ForbiddenError('غير مصرح لك بهذا الإجراء'))
    if (req.user.isSuperAdmin) return next()

    const modulePerms = req.user.permissions?.[moduleName]
    if (!modulePerms?.[action]) {
      return next(new ForbiddenError('لا تملك صلاحية للقيام بهذا الإجراء في هذه الصفحة'))
    }
    next()
  }
}
