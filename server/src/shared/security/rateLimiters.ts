import rateLimit, { Options } from 'express-rate-limit'
import { Request } from 'express'

function build(overrides: Partial<Options>) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      })
    },
    ...overrides,
  })
}

/** Key by authenticated user when present, otherwise by IP. */
const userOrIp = (req: Request): string => req.user?.sub ?? req.ip ?? 'unknown'

export interface LimiterOptions {
  windowMs?: number
  max?: number
}

/** Brute-force protection for credential endpoints (keyed by IP). */
export const createAuthLimiter = (o: LimiterOptions = {}) =>
  build({ windowMs: o.windowMs ?? 15 * 60_000, max: o.max ?? 10, skipSuccessfulRequests: false })

/** Token refresh — more generous than login. */
export const createRefreshLimiter = (o: LimiterOptions = {}) =>
  build({ windowMs: o.windowMs ?? 15 * 60_000, max: o.max ?? 60 })

/** Public (unauthenticated) read APIs. */
export const createPublicLimiter = (o: LimiterOptions = {}) =>
  build({ windowMs: o.windowMs ?? 60_000, max: o.max ?? 120 })

/** General authenticated API usage. */
export const createApiLimiter = (o: LimiterOptions = {}) =>
  build({ windowMs: o.windowMs ?? 60_000, max: o.max ?? 300, keyGenerator: userOrIp })

/** Expensive operations: uploads, video processing, quiz submission, sensitive admin APIs. */
export const createExpensiveLimiter = (o: LimiterOptions = {}) =>
  build({ windowMs: o.windowMs ?? 10 * 60_000, max: o.max ?? 20, keyGenerator: userOrIp })

export const authLimiter = createAuthLimiter()
export const refreshLimiter = createRefreshLimiter()
export const publicLimiter = createPublicLimiter()
export const apiLimiter = createApiLimiter()
export const uploadLimiter = createExpensiveLimiter({ max: 20 })
export const quizSubmitLimiter = createExpensiveLimiter({ windowMs: 60_000, max: 10 })
export const adminSensitiveLimiter = createExpensiveLimiter({ windowMs: 60_000, max: 30 })
/** HLS segment/playlist fetching is chatty; keep a separate, large per-user budget. */
export const mediaStreamLimiter = createApiLimiter({ windowMs: 60_000, max: 1500 })
