import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'
import { publishTranscodeJob } from '@video/infrastructure/queue/videoQueue'
import { LessonModel } from '@learning/infrastructure/persistence/LessonModel'
import { CourseworkModel } from '@learning/infrastructure/persistence/CourseworkModel'
import { SubjectModel } from '@learning/infrastructure/persistence/SubjectModel'
import { AppError, NotFoundError, UnauthorizedError } from '@shared/errors/AppError'
import { createR2Client, requireBucketName, getR2Object } from '@video/infrastructure/r2/r2Uploader'
import { authenticate, optionalAuthenticate, requirePermission } from '@identity/presentation/middlewares/authenticate'
import { JwtService } from '@identity/infrastructure/services/JwtService'
import { MongoUserRepository } from '@identity/infrastructure/persistence/MongoUserRepository'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'
import {
  LessonAccessPolicy,
  CourseAccessPolicy,
  MediaAccessPolicy,
  PolicyActor,
  isValidObjectId,
  canReadCourseAdminData,
} from '@learning/application/policies/AccessPolicies'
import {
  UPLOAD_RULES,
  UploadKind,
  isDeclaredTypeAllowed,
  validateFileSignature,
  safeExtension,
  removeFileQuietly,
  sanitizeRelativeObjectPath,
} from '@shared/security/uploadSecurity'
import { uploadLimiter, mediaStreamLimiter } from '@shared/security/rateLimiters'

// ---------------------------------------------------------------------------
// Multer \u2014 one hardened factory for every multipart endpoint
// ---------------------------------------------------------------------------

const UPLOAD_ROOT = path.join(os.tmpdir(), 'video-uploads')
fs.mkdirSync(UPLOAD_ROOT, { recursive: true })

function makeUpload(kind: UploadKind) {
  const rule = UPLOAD_RULES[kind]
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
      // Server-generated name: the client filename never touches the filesystem.
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${safeExtension(file.originalname)}`),
    }),
    limits: {
      fileSize: rule.maxBytes,
      files: 1,
      fields: 5,
      parts: 6,
      fieldSize: 1024,
      fieldNameSize: 64,
      headerPairs: 50,
    },
    fileFilter: (_req, file, cb) => {
      if (!isDeclaredTypeAllowed(kind, file.originalname, file.mimetype)) {
        return cb(new AppError('Unsupported file type', 422, true, 'UNSUPPORTED_FILE_TYPE'))
      }
      cb(null, true)
    },
  })
}

const videoUpload = makeUpload('video')
const imageUpload = makeUpload('image')
const documentUpload = makeUpload('document')

/** Reject oversize requests before streaming anything to disk. */
function maxRequestSize(kind: UploadKind) {
  const limit = UPLOAD_RULES[kind].maxBytes + 64 * 1024
  return (req: Request, _res: Response, next: NextFunction) => {
    const length = Number(req.headers['content-length'])
    if (Number.isFinite(length) && length > limit) {
      return next(new AppError('The request is too large', 413, true, 'UPLOAD_TOO_LARGE'))
    }
    next()
  }
}

/** Remove the temp file if the request fails after multer wrote it. */
function cleanupOnError(err: unknown, req: Request, _res: Response, next: NextFunction) {
  removeFileQuietly(req.file?.path)
  next(err)
}

function assertSignature(req: Request, kind: UploadKind): Express.Multer.File {
  const file = req.file
  if (!file) throw new AppError('No file received', 400, true, 'FILE_REQUIRED')
  if (file.size > UPLOAD_RULES[kind].maxBytes || !validateFileSignature(file.path, file.originalname, file.mimetype)) {
    removeFileQuietly(file.path)
    throw new AppError('The file content does not match its type', 422, true, 'INVALID_FILE_CONTENT')
  }
  return file
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const userRepo = new MongoUserRepository()
const jwt = new JwtService()

const IMAGE_FOLDERS = ['courses', 'lessons', 'lesson-covers', 'thumbnails', 'subjects', 'categories', 'images'] as const
const DOCUMENT_FOLDERS = ['documents', 'courseworks', 'lessons'] as const
const MEDIA_TOKEN_TTL_SECONDS = 600

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

const actorOf = (req: Request): PolicyActor => {
  if (!req.user) throw new UnauthorizedError()
  return req.user
}

const HLS_CONTENT_TYPES: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.aac': 'audio/aac',
  '.mp4': 'video/mp4',
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const videoRouter = Router()

/**
 * POST /api/video/upload   (course editors only)
 * Multipart: video (MP4), lessonId (required, must be an existing lesson).
 * The videoId / storage key is generated by the server.
 */
videoRouter.post(
  '/upload',
  authenticate,
  requirePermission('courses', 'edit'),
  uploadLimiter,
  maxRequestSize('video'),
  videoUpload.single('video'),
  wrap(async (req, res) => {
    MediaAccessPolicy.assertCanManageMedia(actorOf(req))
    const file = assertSignature(req, 'video')

    try {
      const lessonId = typeof req.body?.lessonId === 'string' ? req.body.lessonId.trim() : ''
      const { lesson } = await LessonAccessPolicy.resolve(lessonId)

      if (lesson.videoStatus === 'processing' && ['queued', 'transcoding', 'uploading_r2', 'retrying'].includes(lesson.videoStage ?? '')) {
        throw new AppError('A video is already being processed for this lesson', 409, true, 'VIDEO_ALREADY_PROCESSING')
      }

      const videoId = randomUUID()
      await LessonModel.findByIdAndUpdate(lesson._id, {
        videoStatus: 'processing',
        videoStage: 'queued',
        videoProgress: 0,
        retryCount: 0,
        lastVideoError: null,
        videoJobId: videoId,
      })

      await publishTranscodeJob({ sourcePath: file.path, videoId, lessonId: lesson._id.toString() })

      res.status(202).json({
        success: true,
        data: { message: 'Video received and queued for processing', videoId, lessonId: lesson._id.toString() },
      })
    } catch (err) {
      removeFileQuietly(file.path)
      throw err
    }
  }),
  cleanupOnError,
)

/** GET /api/video/:lessonId/status \u2014 processing status, for editors only. */
videoRouter.get(
  '/:lessonId/status',
  authenticate,
  requirePermission('courses', 'edit'),
  wrap(async (req, res) => {
    MediaAccessPolicy.assertCanManageMedia(actorOf(req))
    const { lesson } = await LessonAccessPolicy.resolve(req.params.lessonId)
    res.json({
      success: true,
      data: {
        videoStatus: lesson.videoStatus || 'pending',
        videoStage: lesson.videoStage || 'idle',
        videoProgress: lesson.videoProgress || 0,
        retryCount: lesson.retryCount || 0,
        lastVideoError: lesson.lastVideoError ? 'Video processing failed' : null,
        hasVideo: Boolean(lesson.hlsKey) && lesson.videoStatus === 'ready',
      },
    })
  }),
)

/**
 * POST /api/video/lessons/:lessonId/playback
 * Authenticated + authorized students/editors receive a short-lived playback URL.
 */
videoRouter.post(
  '/lessons/:lessonId/playback',
  optionalAuthenticate,
  wrap(async (req, res) => {
    const actor = req.user
    const { lesson } = await MediaAccessPolicy.authorizeLessonVideo(req.params.lessonId, actor)
    const token = req.user
      ? jwt.signMediaToken({ sub: req.user.sub, sid: req.user.sid, lessonId: lesson._id.toString() })
      : jwt.signMediaToken({ sub: 'guest', sid: 'guest', lessonId: lesson._id.toString() })
    res.json({
      success: true,
      data: {
        url: `/api/video/hls/${lesson._id.toString()}/master.m3u8?token=${encodeURIComponent(token)}`,
        expiresInSeconds: MEDIA_TOKEN_TTL_SECONDS,
      },
    })
  }),
)

/** Rewrite relative URIs in an HLS playlist so every child request carries the media token. */
export function rewritePlaylist(body: string, token: string): string {
  const suffix = `token=${encodeURIComponent(token)}`
  const addToken = (uri: string): string => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(uri) || uri.startsWith('/') || uri.includes('..')) {
      throw new AppError('Unsupported playlist reference', 502, true, 'PLAYLIST_INVALID')
    }
    return uri + (uri.includes('?') ? '&' : '?') + suffix
  }
  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]*)"/g, (_m, uri: string) => `URI="${addToken(uri)}"`)
      }
      return addToken(trimmed)
    })
    .join('\n')
}

/**
 * GET /api/video/hls/:lessonId/<path>?token=...
 * Authorized proxy for private HLS objects. The token is only an identity
 * hint: the user, session and lesson access are re-checked on every request.
 */
videoRouter.get(
  '/hls/:lessonId/*',
  mediaStreamLimiter,
  wrap(async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : ''
    if (!token) throw new UnauthorizedError()

    const claims = jwt.verifyMediaToken(token)
    const { lessonId } = req.params
    if (!isValidObjectId(lessonId) || claims.lessonId !== lessonId) {
      throw new AppError('Invalid media token', 403, true, 'MEDIA_TOKEN_MISMATCH')
    }

    let actor: PolicyActor | undefined
    if (claims.sub !== 'guest') {
      const user = await userRepo.findById(new UniqueEntityId(claims.sub))
      if (!user || !user.isActive || !user.sessionId || user.sessionId !== claims.sid) {
        throw new UnauthorizedError()
      }
      actor = {
        sub: user.id.toString(),
        role: user.role.value,
        isSuperAdmin: user.isSuperAdmin,
        permissions: user.permissions,
      }
    }

    const { lesson } = await MediaAccessPolicy.authorizeLessonVideo(lessonId, actor)

    const sub = sanitizeRelativeObjectPath((req.params as Record<string, string>)[0] ?? '', ['.m3u8', '.ts', '.aac', '.mp4'])
    if (!sub) throw new NotFoundError('Media')

    // Storage prefix comes from the DB (server-generated), never from the client.
    const prefix = path.posix.dirname(lesson.hlsKey!)
    if (!/^videos\/[a-f0-9-]{36}$/.test(prefix)) throw new NotFoundError('Media')
    const key = `${prefix}/${sub}`

    let object
    try {
      object = await getR2Object(key)
    } catch {
      throw new NotFoundError('Media')
    }
    if (!object.Body) throw new NotFoundError('Media')

    const ext = path.posix.extname(sub).toLowerCase()
    res.setHeader('Content-Type', HLS_CONTENT_TYPES[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')

    if (ext === '.m3u8') {
      const text = await (object.Body as unknown as { transformToString(): Promise<string> }).transformToString()
      res.send(rewritePlaylist(text, token))
      return
    }
    ;(object.Body as Readable).pipe(res)
  }),
)

/**
 * POST /api/video/upload-image   (course editors only)
 * Images are public marketing assets (thumbnails/covers) served through the
 * API image route below; the bucket itself stays private.
 */
videoRouter.post(
  '/upload-image',
  authenticate,
  requirePermission('courses', 'edit'),
  uploadLimiter,
  maxRequestSize('image'),
  imageUpload.single('image'),
  wrap(async (req, res) => {
    MediaAccessPolicy.assertCanManageMedia(actorOf(req))
    const file = assertSignature(req, 'image')
    try {
      const folder = pick(req.body?.folder, IMAGE_FOLDERS, 'images')
      const fileName = `${randomUUID()}${safeExtension(file.originalname)}`
      const key = `public-images/${folder}/${fileName}`

      await createR2Client().send(new PutObjectCommand({
        Bucket: requireBucketName(),
        Key: key,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
        ContentLength: file.size,
      }))

      res.json({ success: true, data: { url: `/api/video/images/${folder}/${fileName}`, key } })
    } finally {
      removeFileQuietly(file.path)
    }
  }),
  cleanupOnError,
)

/** GET /api/video/images/:folder/:file \u2014 serves only objects under public-images/. */
videoRouter.get(
  '/images/:folder/:file',
  mediaStreamLimiter,
  wrap(async (req, res) => {
    const { folder, file } = req.params
    if (!(IMAGE_FOLDERS as readonly string[]).includes(folder)) throw new NotFoundError('Image')
    if (!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|gif)$/.test(file)) throw new NotFoundError('Image')

    let object
    try {
      object = await getR2Object(`public-images/${folder}/${file}`)
    } catch {
      throw new NotFoundError('Image')
    }
    if (!object.Body) throw new NotFoundError('Image')
    res.setHeader('Content-Type', IMAGE_CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    ;(object.Body as Readable).pipe(res)
  }),
)

/**
 * POST /api/video/upload-document   (course editors only)
 * Documents are private. Returns the storage key; reads go through
 * GET /api/video/lessons/:lessonId/materials/:index (short-lived signed URL).
 */
videoRouter.post(
  '/upload-document',
  authenticate,
  requirePermission('courses', 'edit'),
  uploadLimiter,
  maxRequestSize('document'),
  documentUpload.single('document'),
  wrap(async (req, res) => {
    MediaAccessPolicy.assertCanManageMedia(actorOf(req))
    const file = assertSignature(req, 'document')
    try {
      const folder = pick(req.body?.folder, DOCUMENT_FOLDERS, 'documents')
      const key = `documents/${folder}/${randomUUID()}${safeExtension(file.originalname)}`

      await createR2Client().send(new PutObjectCommand({
        Bucket: requireBucketName(),
        Key: key,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
        ContentLength: file.size,
      }))

      res.json({ success: true, data: { key, url: key } })
    } finally {
      removeFileQuietly(file.path)
    }
  }),
  cleanupOnError,
)

/**
 * GET /api/video/lessons/:lessonId/materials/:index
 * Authorizes the lesson, then redirects to a 5-minute signed URL for the
 * materialKeys[index] object. Keys must be server-generated document keys.
 */
videoRouter.get(
  '/lessons/:lessonId/materials/:index',
  authenticate,
  wrap(async (req, res) => {
    const { lesson } = await LessonAccessPolicy.authorize(req.params.lessonId, actorOf(req))
    const index = Number(req.params.index)
    const key = Number.isInteger(index) && index >= 0 ? lesson.materialKeys?.[index] : undefined
    if (!key || !/^documents\/[a-z]+\/[a-f0-9-]{36}\.[a-z0-9]{1,5}$/.test(key)) throw new NotFoundError('Material')

    const url = await getSignedUrl(
      createR2Client(),
      new GetObjectCommand({ Bucket: requireBucketName(), Key: key, ResponseContentDisposition: 'attachment' }),
      { expiresIn: 300 },
    )
    res.setHeader('Cache-Control', 'private, no-store')
    res.redirect(302, url)
  }),
)

/** Download a coursework material only while its parent course entitlement is active. */
videoRouter.get('/courseworks/:courseworkId/materials/:index', authenticate, wrap(async (req, res) => {
  if (!isValidObjectId(req.params.courseworkId)) throw new NotFoundError('Material')
  const coursework = await CourseworkModel.findById(req.params.courseworkId).select('subjectId materialKeys isActive').lean()
  if (!coursework?.isActive) throw new NotFoundError('Material')
  const subject = await SubjectModel.findById(coursework.subjectId).select('courseId isActive').lean()
  if (!subject?.isActive) throw new NotFoundError('Material')
  const course = await CourseAccessPolicy.loadForView(subject.courseId.toString(), actorOf(req))
  const actor = actorOf(req)
  if (!canReadCourseAdminData(actor) && (course.price ?? 0) > 0 && !(await CourseAccessPolicy.hasEntitlement(course._id.toString(), actor))) {
    throw new AppError('You do not have access to this coursework', 403, true, 'RESOURCE_FORBIDDEN')
  }
  const index = Number(req.params.index)
  const key = Number.isInteger(index) && index >= 0 ? coursework.materialKeys?.[index] : undefined
  if (!key || !/^documents\/courseworks\/[a-f0-9-]{36}\.[a-z0-9]{1,5}$/.test(key)) throw new NotFoundError('Material')
  const url = await getSignedUrl(createR2Client(), new GetObjectCommand({ Bucket: requireBucketName(), Key: key, ResponseContentDisposition: 'attachment' }), { expiresIn: 300 })
  res.setHeader('Cache-Control', 'private, no-store')
  res.redirect(302, url)
}))
