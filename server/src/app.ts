import 'dotenv/config'
import express from 'express'
import cors    from 'cors'
import helmet  from 'helmet'
import morgan  from 'morgan'
import { connectDatabase } from '@shared/infrastructure/database/connection'
import { errorHandler }    from '@shared/infrastructure/http/errorHandler'
import { identityRouter }  from '@identity/presentation/routes'
import { learningRouter }  from '@learning/presentation/routes'
import { videoRouter }     from '@video/presentation/routes'
import { startVideoWorker } from '@video/infrastructure/queue/videoQueue'
import { validateStartupConfig } from './config/startup'
import { apiLimiter } from '@shared/security/rateLimiters'

// Controlled startup failure for missing/insecure security configuration.
const startupConfig = validateStartupConfig()

// Coming next:
import { assessmentRouter } from '@assessment/presentation/routes'

const app = express()

app.set('trust proxy', startupConfig.trustProxy)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({ origin: startupConfig.clientOrigins, credentials: true }))
app.use(morgan('combined', { skip: () => process.env.NODE_ENV === 'test' }))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use('/api', apiLimiter)

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }))

app.use('/api/auth',     identityRouter)
app.use('/api/learning', learningRouter)
app.use('/api/video',    videoRouter)
app.use('/api/quizzes',    assessmentRouter)

app.use(errorHandler)

const PORT = process.env.PORT ?? 4000

async function bootstrap() {
  await connectDatabase()

  // Start the RabbitMQ video worker (non-blocking — API works even if RabbitMQ is slow)
  startVideoWorker().catch((err) => {
    console.error('[Bootstrap] ⚠ Video worker failed to start — will retry on next message:', err.message)
  })

  app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`))
}

bootstrap().catch(console.error)

