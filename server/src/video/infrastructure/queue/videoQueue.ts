import { Channel, ConsumeMessage } from 'amqplib'
import { getRabbitChannel, publishToQueue, consumeQueue } from '@shared/infrastructure/queue/rabbitmq'
import { ProcessVideoUseCase } from '@video/application/use-cases/ProcessVideo.usecase'
import { LessonModel } from '@learning/infrastructure/persistence/LessonModel'
import { removeFileQuietly } from '@shared/security/uploadSecurity'

// ---------------------------------------------------------------------------
// Queue & Exchange names
// ---------------------------------------------------------------------------

const TRANSCODE_QUEUE     = 'video.transcode'
const DEAD_LETTER_EXCHANGE = 'video.dlx'
const DEAD_LETTER_QUEUE    = 'video.transcode.failed'

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000] // exponential backoff

// ---------------------------------------------------------------------------
// Job message shape
// ---------------------------------------------------------------------------

export interface TranscodeJobMessage {
  sourcePath: string
  videoId:    string
  lessonId?:  string
  retryCount: number
  createdAt:  string
}

// ---------------------------------------------------------------------------
// Setup: declare queues & exchanges
// ---------------------------------------------------------------------------

async function setupQueues(): Promise<void> {
  const ch = await getRabbitChannel()

  // Dead-letter exchange — failed messages land here after max retries
  await ch.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true })
  await ch.assertQueue(DEAD_LETTER_QUEUE, { durable: true })
  await ch.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, TRANSCODE_QUEUE)

  // Main transcode queue with dead-letter routing
  await ch.assertQueue(TRANSCODE_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange':    DEAD_LETTER_EXCHANGE,
      'x-dead-letter-routing-key': TRANSCODE_QUEUE,
    },
  })

  console.log(`[VideoQueue] ✅ Queues declared: ${TRANSCODE_QUEUE}, ${DEAD_LETTER_QUEUE}`)
}

// ---------------------------------------------------------------------------
// Producer: publish a transcode job
// ---------------------------------------------------------------------------

export async function publishTranscodeJob(job: Omit<TranscodeJobMessage, 'retryCount' | 'createdAt'>): Promise<void> {
  await setupQueues()

  const message: TranscodeJobMessage = {
    ...job,
    retryCount: 0,
    createdAt:  new Date().toISOString(),
  }

  await publishToQueue(TRANSCODE_QUEUE, message as unknown as Record<string, unknown>)
  console.log(`[VideoQueue] 📤 Published transcode job: videoId=${job.videoId}, lessonId=${job.lessonId || 'N/A'}`)
}

// ---------------------------------------------------------------------------
// Consumer: start the video worker
// ---------------------------------------------------------------------------

export async function startVideoWorker(): Promise<void> {
  await setupQueues()

  const useCase = new ProcessVideoUseCase()

  console.log('[VideoQueue] 🎬 Video worker started — waiting for transcode jobs…')

  await consumeQueue(TRANSCODE_QUEUE, async (msg: ConsumeMessage, ch: Channel) => {
    const job: TranscodeJobMessage = JSON.parse(msg.content.toString())
    const { sourcePath, videoId, lessonId, retryCount } = job

    console.log(`[VideoQueue] ▶ Processing job: videoId=${videoId}, attempt=${retryCount + 1}/${MAX_RETRIES + 1}`)

    // Update lesson status to show which stage we're at
    if (lessonId) {
      await LessonModel.findByIdAndUpdate(lessonId, {
        videoStatus:  'processing',
        videoStage:   'transcoding',
        retryCount,
        lastVideoError: null,
      }).catch(() => null)
    }

    try {
      // Execute the full pipeline: FFmpeg → R2 → MongoDB update
      await useCase.execute({ sourcePath, videoId, lessonId })

      // Success — acknowledge the message
      ch.ack(msg)
      removeFileQuietly(sourcePath)
      console.log(`[VideoQueue] ✅ Job completed: videoId=${videoId}`)
    } catch (err: any) {
      console.error(`[VideoQueue] ❌ Job failed: videoId=${videoId}, error=${err.message}`)

      // Update lesson with error info
      if (lessonId) {
        await LessonModel.findByIdAndUpdate(lessonId, {
          lastVideoError: err.message,
          retryCount,
        }).catch(() => null)
      }

      if (retryCount < MAX_RETRIES) {
        // Re-queue with incremented retry count and delay
        const delay = RETRY_DELAYS_MS[retryCount] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]

        console.log(`[VideoQueue] 🔄 Retrying in ${delay / 1000}s (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)

        // Acknowledge original message (we'll re-publish with delay)
        ch.ack(msg)

        // Update lesson status to show retry is pending
        if (lessonId) {
          await LessonModel.findByIdAndUpdate(lessonId, {
            videoStatus:  'processing',
            videoStage:   'retrying',
            retryCount:   retryCount + 1,
          }).catch(() => null)
        }

        // Delayed retry using setTimeout + re-publish
        setTimeout(async () => {
          try {
            const retryMessage: TranscodeJobMessage = {
              ...job,
              retryCount: retryCount + 1,
            }
            await publishToQueue(TRANSCODE_QUEUE, retryMessage as unknown as Record<string, unknown>)
            console.log(`[VideoQueue] 📤 Retry message published: videoId=${videoId}, attempt=${retryCount + 2}`)
          } catch (pubErr: any) {
            console.error(`[VideoQueue] ❌ Failed to publish retry: ${pubErr.message}`)
          }
        }, delay)
      } else {
        // Max retries exhausted — reject (goes to dead-letter queue)
        console.error(`[VideoQueue] 💀 Max retries exhausted for videoId=${videoId} — sending to dead-letter queue`)
        ch.nack(msg, false, false)
        removeFileQuietly(sourcePath)

        // Mark lesson as permanently failed
        if (lessonId) {
          await LessonModel.findByIdAndUpdate(lessonId, {
            videoStatus:  'failed',
            videoStage:   'failed',
            retryCount:   retryCount + 1,
            lastVideoError: `فشلت جميع المحاولات (${MAX_RETRIES + 1}): ${err.message}`,
          }).catch(() => null)
        }
      }
    }
  })
}
