import fs from 'fs'
import os from 'os'
import path from 'path'
import { transcodeToHLS } from '@video/infrastructure/ffmpeg/transcoder'
import { buildUploadItems, uploadHLSToR2 } from '@video/infrastructure/r2/r2Uploader'
import { LessonModel } from '@learning/infrastructure/persistence/LessonModel'
import { resolveInside } from '@shared/security/uploadSecurity'

const VIDEO_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
const UPLOAD_ROOT = path.join(os.tmpdir(), 'video-uploads')
const TRANSCODE_ROOT = path.join(os.tmpdir(), 'hls-transcodes')

function requireEnv(key: string): string {
  const val = process.env[key]?.trim()
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface ProcessVideoInput {
  /**
   * Absolute path to the uploaded MP4 on the server's local disk.
   * After processing this file will be removed.
   */
  sourcePath: string

  /**
   * Logical video ID used to build the R2 key prefix (e.g. a MongoDB ObjectId).
   * All HLS artefacts will be stored under: videos/<videoId>/
   */
  videoId: string

  /**
   * The MongoDB Lesson _id to update after a successful pipeline.
   * When provided, the lesson's hlsKey, hlsUrl, and videoStatus are updated.
   */
  lessonId?: string
}

export interface ProcessVideoOutput {
  /** Private storage key of the HLS master playlist */
  masterKey: string

  /** All uploaded file keys */
  uploadedFiles: { r2Key: string; sizeBytes: number }[]

  /** Duration of the whole pipeline in milliseconds */
  processingMs: number
}

// ---------------------------------------------------------------------------
// Helper: update lesson stage safely
// ---------------------------------------------------------------------------

async function updateLessonStage(
  lessonId: string | undefined,
  update: Record<string, unknown>,
): Promise<void> {
  if (!lessonId) return
  await LessonModel.findByIdAndUpdate(lessonId, update).catch(() => null)
}

// ---------------------------------------------------------------------------
// Use-case: ProcessVideoUseCase
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full pipeline:
 *   1. Transcode MP4 → adaptive HLS in a temp directory
 *   2. Bulk-upload all HLS artefacts to Cloudflare R2
 *   3. Clean up the temp directory
 *   4. Update the lesson document in MongoDB (hlsKey, hlsUrl, videoStatus=ready)
 *   5. Return the master playlist URL
 */
export class ProcessVideoUseCase {
  async execute(input: ProcessVideoInput): Promise<ProcessVideoOutput> {
    const start = Date.now()
    const { sourcePath, videoId, lessonId } = input

    if (!VIDEO_ID_PATTERN.test(videoId)) throw new Error('Invalid videoId')
    // The source must be inside the upload temp directory (defence against forged queue messages)
    const safeSource = resolveInside(UPLOAD_ROOT, path.basename(sourcePath))

    const bucket = requireEnv('R2_BUCKET_NAME')

    const outputDir = resolveInside(TRANSCODE_ROOT, videoId)
    fs.mkdirSync(outputDir, { recursive: true })

    console.log(`[ProcessVideo] Starting pipeline for videoId=${videoId}${lessonId ? ` lessonId=${lessonId}` : ''}`)

    // Mark lesson as 'processing' / 'transcoding' stage
    await updateLessonStage(lessonId, {
      videoStatus:  'processing',
      videoStage:   'transcoding',
      videoProgress: 10,
    })

    try {
      // --- Step 1: Transcode -----------------------------------------------
      console.log('[ProcessVideo] Step 1/2 — Transcoding…')
      await transcodeToHLS(safeSource, outputDir)

      // Update stage: transcoding done, starting R2 upload
      await updateLessonStage(lessonId, {
        videoStage:   'uploading_r2',
        videoProgress: 60,
      })

      // --- Step 2: Upload to R2 ---------------------------------------------
      console.log('[ProcessVideo] Step 2/2 — Uploading to R2…')
      const r2Prefix  = `videos/${videoId}`
      const items     = buildUploadItems(outputDir, r2Prefix)
      const uploaded  = await uploadHLSToR2(items, bucket)

      const masterKey = `${r2Prefix}/master.m3u8`
      if (!uploaded.find((u) => u.r2Key === masterKey)) {
        throw new Error('Master playlist was not uploaded — check transcoder output')
      }

      const processingMs = Date.now() - start
      console.log(`[ProcessVideo] Done in ${(processingMs / 1000).toFixed(1)}s`)

      // --- Step 3: Update Lesson in MongoDB (private key only, no public URL) ---
      if (lessonId) {
        await LessonModel.findByIdAndUpdate(lessonId, {
          $set: {
            hlsKey:        masterKey,
            videoStatus:   'ready',
            videoStage:    'done',
            videoProgress: 100,
            lastVideoError: null,
          },
          $unset: { hlsUrl: '' },
        })
        console.log(`[ProcessVideo] Lesson ${lessonId} updated → videoStatus=ready`)
      }

      return { masterKey, uploadedFiles: uploaded, processingMs }
    } catch (err) {
      // Mark lesson as failed so admin can see the error state
      if (lessonId) {
        await LessonModel.findByIdAndUpdate(lessonId, {
          videoStatus:    'failed',
          videoStage:     'failed',
          lastVideoError: (err as Error).message,
        }).catch(() => null)
        console.error(`[ProcessVideo] ❌ Lesson ${lessonId} marked as failed`)
      }
      throw err
    } finally {
      // Always clean up — temp segments can be hundreds of MB
      fs.rmSync(outputDir, { recursive: true, force: true })
      // Source upload is only deleted once no retry can use it (see videoQueue)
    }
  }
}

