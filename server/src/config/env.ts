export interface JwtConfig {
  accessSecret: string
  refreshSecret: string
  accessExpiresIn: string
  refreshExpiresIn: string
  issuer: string
  audience: string
}

type Environment = Record<string, string | undefined>

function secretIsStrong(value: string): boolean {
  if (!/^[A-Za-z0-9_-]{43,}$/.test(value)) return false
  return new Set(value).size >= 16
}

function validLifetime(value: string): boolean {
  return /^([1-9]\d{0,3})(s|m|h|d)$/.test(value)
}

export function loadJwtConfig(source: Environment = process.env): JwtConfig {
  const accessSecret = source.JWT_ACCESS_SECRET?.trim()
  const refreshSecret = source.JWT_REFRESH_SECRET?.trim()
  const problems: string[] = []

  if (!accessSecret) problems.push('JWT_ACCESS_SECRET is required')
  else if (!secretIsStrong(accessSecret)) problems.push('JWT_ACCESS_SECRET must be a strong base64url secret')

  if (!refreshSecret) problems.push('JWT_REFRESH_SECRET is required')
  else if (!secretIsStrong(refreshSecret)) problems.push('JWT_REFRESH_SECRET must be a strong base64url secret')

  if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different')
  }

  const accessExpiresIn = source.JWT_ACCESS_EXPIRES ?? '15m'
  const refreshExpiresIn = source.JWT_REFRESH_EXPIRES ?? '7d'
  if (!validLifetime(accessExpiresIn)) problems.push('JWT_ACCESS_EXPIRES must use a positive s, m, h, or d duration')
  if (!validLifetime(refreshExpiresIn)) problems.push('JWT_REFRESH_EXPIRES must use a positive s, m, h, or d duration')

  if (problems.length) {
    throw new Error(`Invalid security configuration: ${problems.join('; ')}`)
  }

  return {
    accessSecret: accessSecret!,
    refreshSecret: refreshSecret!,
    accessExpiresIn,
    refreshExpiresIn,
    issuer: source.JWT_ISSUER?.trim() || 'lms-api',
    audience: source.JWT_AUDIENCE?.trim() || 'lms-client',
  }
}

export function requiredEnv(name: string, source: Environment = process.env): string {
  const value = source[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}