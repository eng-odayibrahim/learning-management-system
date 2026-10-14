import { loadJwtConfig, requiredEnv } from './env'

type Environment = Record<string, string | undefined>

export interface StartupConfig {
  clientOrigins: string[]
  trustProxy: boolean | number
}

/**
 * Central startup validation. Throws (controlled failure) when a critical
 * variable is missing; never falls back to insecure defaults.
 */
export function validateStartupConfig(source: Environment = process.env): StartupConfig {
  loadJwtConfig(source) // throws with a descriptive, secret-free message
  requiredEnv('MONGODB_URI', { MONGODB_URI: source.MONGODB_URI ?? source.MONGO_URI })

  const clientUrl = requiredEnv('CLIENT_URL', source)
  const clientOrigins = clientUrl
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (!clientOrigins.length || clientOrigins.includes('*')) {
    throw new Error('CLIENT_URL must list explicit origins (wildcards are not allowed)')
  }

  const proxy = source.TRUST_PROXY?.trim()
  const trustProxy = proxy ? (Number.isInteger(Number(proxy)) ? Number(proxy) : proxy === 'true') : false

  return { clientOrigins, trustProxy }
}
