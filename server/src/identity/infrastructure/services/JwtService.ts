import jwt, { JwtPayload as JsonWebTokenPayload, SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'
import { AppError } from '@shared/errors/AppError'
import { JwtConfig, loadJwtConfig } from '../../../config/env'

export interface SessionTokenPayload {
  sub: string
  sid: string
  tokenType: 'access' | 'refresh'
}

export interface MediaTokenPayload {
  sub: string
  sid: string
  lessonId: string
  tokenType: 'media'
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function matchesRefreshToken(token: string, storedHash: string | undefined): boolean {
  if (!storedHash) return false
  return constantTimeEqual(hashRefreshToken(token), storedHash)
}

export class JwtService {
  constructor(private readonly config: JwtConfig = loadJwtConfig()) {}

  signAccessToken(payload: Pick<SessionTokenPayload, 'sub' | 'sid'>): string {
    return jwt.sign(
      { sid: payload.sid, tokenType: 'access' },
      this.config.accessSecret,
      this.options(this.config.audience, this.config.accessExpiresIn, payload.sub),
    )
  }

  signRefreshToken(payload: Pick<SessionTokenPayload, 'sub' | 'sid'>): string {
    return jwt.sign(
      { sid: payload.sid, tokenType: 'refresh', jti: crypto.randomUUID() },
      this.config.refreshSecret,
      this.options(this.config.audience, this.config.refreshExpiresIn, payload.sub),
    )
  }

  signMediaToken(payload: Pick<MediaTokenPayload, 'sub' | 'sid' | 'lessonId'>): string {
    return jwt.sign(
      { sid: payload.sid, lessonId: payload.lessonId, tokenType: 'media' },
      this.config.accessSecret,
      this.options(`${this.config.audience}:media`, '10m', payload.sub),
    )
  }

  verifyAccessToken(token: string): SessionTokenPayload {
    return this.verifySessionToken(token, this.config.accessSecret, this.config.audience, 'access')
  }

  verifyRefreshToken(token: string): SessionTokenPayload {
    return this.verifySessionToken(token, this.config.refreshSecret, this.config.audience, 'refresh')
  }

  verifyMediaToken(token: string): MediaTokenPayload {
    const payload = this.verify(token, this.config.accessSecret, `${this.config.audience}:media`)
    if (payload.tokenType !== 'media' || typeof payload.sid !== 'string' || typeof payload.lessonId !== 'string') {
      throw new AppError('رمز الوصول إلى الوسائط غير صالح', 401)
    }
    return { sub: payload.sub!, sid: payload.sid, lessonId: payload.lessonId, tokenType: 'media' }
  }

  private verifySessionToken(
    token: string,
    secret: string,
    audience: string,
    tokenType: 'access' | 'refresh',
  ): SessionTokenPayload {
    const payload = this.verify(token, secret, audience)
    if (payload.tokenType !== tokenType || typeof payload.sid !== 'string') {
      throw new AppError('رمز المصادقة غير صالح أو منتهي الصلاحية', 401)
    }
    return { sub: payload.sub!, sid: payload.sid, tokenType }
  }

  private verify(token: string, secret: string, audience: string): JsonWebTokenPayload & {
    sub?: string
    sid?: string
    lessonId?: string
    tokenType?: string
  } {
    try {
      const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: this.config.issuer,
        audience,
      })
      if (!payload || typeof payload === 'string' || typeof payload.sub !== 'string') {
        throw new Error('Invalid token payload')
      }
      return payload as JsonWebTokenPayload & {
        sub?: string
        sid?: string
        lessonId?: string
        tokenType?: string
      }
    } catch {
      throw new AppError('رمز المصادقة غير صالح أو منتهي الصلاحية', 401)
    }
  }

  private options(audience: string, expiresIn: string, subject: string): SignOptions {
    return {
      algorithm: 'HS256',
      expiresIn: expiresIn as SignOptions['expiresIn'],
      issuer: this.config.issuer,
      audience,
      subject,
    }
  }
}
