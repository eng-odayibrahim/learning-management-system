const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const jwt = require('jsonwebtoken')
const { loadJwtConfig } = require('../dist/config/env.js')
const { JwtService } = require('../dist/identity/infrastructure/services/JwtService.js')
const { createAuthMiddleware } = require('../dist/identity/presentation/middlewares/authenticate.js')
const { resolveInside, sanitizeRelativeObjectPath, sniffSignature, validateFileSignature } = require('../dist/shared/security/uploadSecurity.js')
const { requirePermission } = require('../dist/identity/presentation/middlewares/authenticate.js')
const { CourseAccessPolicy, LessonAccessPolicy, MediaAccessPolicy, canReadCourseAdminData } = require('../dist/learning/application/policies/AccessPolicies.js')
const { AssessmentAttemptService, gradeAssessment } = require('../dist/assessment/application/attempts/AssessmentAttemptService.js')
const { GetCurriculumTreeUseCase } = require('../dist/learning/application/use-cases/GetCurriculumTreeUseCase.js')
const { MongoUserRepository } = require('../dist/identity/infrastructure/persistence/MongoUserRepository.js')
const { LessonModel } = require('../dist/learning/infrastructure/persistence/LessonModel.js')
const { ClassModel } = require('../dist/learning/infrastructure/persistence/ClassModel.js')
const { SubjectModel } = require('../dist/learning/infrastructure/persistence/SubjectModel.js')
const { CourseModel } = require('../dist/learning/infrastructure/persistence/CourseModel.js')
const { UserModel } = require('../dist/identity/infrastructure/persistence/UserModel.js')
const { GradeModel, TrackModel, SpecializationModel } = require('../dist/learning/infrastructure/persistence/TaxonomyModels.js')
const express = require('express')
const { errorHandler } = require('../dist/shared/infrastructure/http/errorHandler.js')
const { validateStartupConfig } = require('../dist/config/startup.js')
const { RefreshTokenUseCase } = require('../dist/identity/application/use-cases/RefreshTokenUseCase.js')
const { hashRefreshToken } = require('../dist/identity/infrastructure/services/JwtService.js')
process.env.GEMINI_API_KEY ??= 'test-key'
const { assessmentRouter } = require('../dist/assessment/presentation/routes/index.js')

const validEnv = {
  JWT_ACCESS_SECRET: 'A1B2C3D4E5F6G7H8'.repeat(4),
  JWT_REFRESH_SECRET: 'H8G7F6E5D4C3B2A1'.repeat(4),
  JWT_ISSUER: 'lms-tests',
  JWT_AUDIENCE: 'lms-tests-client',
}
Object.assign(process.env, validEnv)
const { rewritePlaylist, videoRouter } = require('../dist/video/presentation/routes/video.routes.js')
const r2 = require('../dist/video/infrastructure/r2/r2Uploader.js')

test('JWT configuration fails closed for missing, weak, or reused secrets', () => {
  assert.throws(() => loadJwtConfig({ ...validEnv, JWT_ACCESS_SECRET: undefined }), /JWT_ACCESS_SECRET is required/)
  assert.throws(() => loadJwtConfig({ ...validEnv, JWT_ACCESS_SECRET: 'weak' }), /strong base64url secret/)
  assert.throws(() => loadJwtConfig({ ...validEnv, JWT_REFRESH_SECRET: validEnv.JWT_ACCESS_SECRET }), /must be different/)
})

test('startup security config requires database and explicit client origins', () => {
  const base = { ...validEnv, MONGODB_URI: 'mongodb://localhost/lms', CLIENT_URL: 'http://localhost:3000' }
  assert.throws(() => validateStartupConfig({ ...base, JWT_ACCESS_SECRET: undefined }), /JWT_ACCESS_SECRET is required/)
  assert.throws(() => validateStartupConfig({ ...base, MONGODB_URI: undefined }), /Missing required environment variable: MONGODB_URI/)
  assert.throws(() => validateStartupConfig({ ...base, CLIENT_URL: '*' }), /wildcards are not allowed/)
  assert.deepEqual(validateStartupConfig({ ...base, CLIENT_URL: 'http://localhost:3000,https://lms.example', TRUST_PROXY: '1' }), {
    clientOrigins: ['http://localhost:3000', 'https://lms.example'], trustProxy: 1,
  })
})

test('JWT tokens enforce signature, algorithm, issuer, audience, and expiry', () => {
  const config = loadJwtConfig(validEnv)
  const service = new JwtService(config)
  const token = service.signAccessToken({ sub: 'user-1', sid: 'session-1' })
  assert.deepEqual(service.verifyAccessToken(token), { sub: 'user-1', sid: 'session-1', tokenType: 'access' })

  const parts = token.split('.')
  parts[1] = `${parts[1].slice(0, -1)}${parts[1].endsWith('a') ? 'b' : 'a'}`
  assert.throws(() => service.verifyAccessToken(parts.join('.')), /رمز المصادقة/)

  const expired = jwt.sign(
    { sid: 'session-1', tokenType: 'access' }, config.accessSecret,
    { algorithm: 'HS256', issuer: config.issuer, audience: config.audience, subject: 'user-1', expiresIn: -1 },
  )
  assert.throws(() => service.verifyAccessToken(expired), /رمز المصادقة/)

  const wrongIssuer = jwt.sign(
    { sid: 'session-1', tokenType: 'access' }, config.accessSecret,
    { algorithm: 'HS256', issuer: 'other', audience: config.audience, subject: 'user-1', expiresIn: '1m' },
  )
  assert.throws(() => service.verifyAccessToken(wrongIssuer), /رمز المصادقة/)
})

test('refresh token rotation is single-use under concurrent requests', async () => {
  const service = new JwtService(loadJwtConfig(validEnv))
  const originalToken = service.signRefreshToken({ sub: '507f1f77bcf86cd799439011', sid: 'session-1' })
  let currentHash = hashRefreshToken(originalToken)
  const user = {
    id: { toString: () => '507f1f77bcf86cd799439011' }, isActive: true,
    sessionId: 'session-1', get refreshTokenHash() { return currentHash },
  }
  const repo = {
    findById: async () => ({ ...user, get refreshTokenHash() { return currentHash } }),
    rotateRefreshToken: async (_id, sessionId, expected, next) => {
      if (sessionId !== 'session-1' || currentHash !== expected) return false
      currentHash = next
      return true
    },
  }
  const useCase = new RefreshTokenUseCase(repo, service)
  const outcomes = await Promise.allSettled([
    useCase.execute({ refreshToken: originalToken }),
    useCase.execute({ refreshToken: originalToken }),
  ])
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(outcomes.filter((result) => result.status === 'rejected').length, 1)
})

test('authentication rejects missing tokens and users that are inactive or deleted', async () => {
  const service = new JwtService(loadJwtConfig(validEnv))
  const token = service.signAccessToken({ sub: 'user-1', sid: 'session-1' })
  const invoke = (middleware, authorization) => new Promise((resolve) => {
    middleware({ headers: authorization ? { authorization } : {} }, {}, (error) => resolve(error))
  })

  const inactive = createAuthMiddleware({ findById: async () => ({ isActive: false, sessionId: 'session-1' }) }, service).authenticate
  assert.equal((await invoke(inactive))?.message, 'يجب تسجيل الدخول')
  assert.equal((await invoke(inactive, `Bearer ${token}`))?.message, 'الجلسة غير صالحة أو الحساب غير مفعّل')

  const deleted = createAuthMiddleware({ findById: async () => null }, service).authenticate
  assert.equal((await invoke(deleted, `Bearer ${token}`))?.message, 'الجلسة غير صالحة أو الحساب غير مفعّل')
})

test('upload signature validation rejects declared-type spoofing inputs', () => {
  assert.equal(sniffSignature(Buffer.from('not a video')), 'text')
  assert.equal(sniffSignature(Buffer.from([0, 1, 2, 3, 4, 5])), null)
  assert.equal(sniffSignature(Buffer.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70])), 'mp4')

  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-upload-security-'))
  const file = path.join(folder, 'sample.mp4')
  try {
    fs.writeFileSync(file, Buffer.from([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70]))
    assert.equal(validateFileSignature(file, 'sample.mp4', 'video/mp4'), true)
    assert.equal(validateFileSignature(file, 'sample.mp4', 'image/png'), false)
    assert.equal(validateFileSignature(file, 'sample.png', 'image/png'), false)
  } finally {
    fs.rmSync(folder, { recursive: true, force: true })
  }
})

test('media object paths reject traversal and absolute path variants', () => {
  for (const attempt of ['../master.m3u8', '..%2fmaster.m3u8', '%252e%252e%252fmaster.m3u8', 'C:/master.m3u8', '\\server\\master.m3u8']) {
    assert.equal(sanitizeRelativeObjectPath(attempt, ['.m3u8']), null, attempt)
  }
  assert.equal(sanitizeRelativeObjectPath('segments/chunk-1.ts', ['.ts']), 'segments/chunk-1.ts')
  assert.throws(() => resolveInside('C:/tmp/lms', '..', 'secret.txt'), /Path escapes base directory/)
})

test('video upload rejects an oversized request before parsing multipart data', async () => {
  const route = videoRouter.stack.find((layer) => layer.route?.path === '/upload')
  const requestSizeGuard = route.route.stack[3].handle
  const error = await new Promise((resolve) => requestSizeGuard(
    { headers: { 'content-length': String(2 * 1024 * 1024 * 1024 + 65 * 1024) } },
    {},
    resolve,
  ))
  assert.equal(error?.statusCode, 413)
  assert.equal(error?.code, 'UPLOAD_TOO_LARGE')
})

test('video upload endpoint rejects anonymous and malformed multipart requests safely', async () => {
  const app = express()
  app.use('/api/video', videoRouter)
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  const url = `http://127.0.0.1:${port}/api/video/upload`
  const originalFindById = MongoUserRepository.prototype.findById
  try {
    const anonymous = await fetch(url, { method: 'POST', headers: { 'content-type': 'multipart/form-data' }, body: 'not multipart' })
    assert.equal(anonymous.status, 401)

    MongoUserRepository.prototype.findById = async (id) => ({
      id, isActive: true, sessionId: 'upload-session', role: { value: 'admin' },
      permissions: { courses: { read: true, edit: true } }, isSuperAdmin: false,
    })
    const token = new JwtService(loadJwtConfig(validEnv)).signAccessToken({ sub: '507f1f77bcf86cd799439015', sid: 'upload-session' })
    const malformed = await fetch(url, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'multipart/form-data' }, body: 'not multipart',
    })
    assert.equal(malformed.status, 400)
    assert.equal((await malformed.json()).code, 'MALFORMED_MULTIPART')
  } finally {
    MongoUserRepository.prototype.findById = originalFindById
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test('assessment upload endpoint rejects anonymous and malformed multipart requests safely', async () => {
  const app = express()
  app.use('/api/quizzes', assessmentRouter)
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  const url = `http://127.0.0.1:${port}/api/quizzes/extract`
  const originalFindById = MongoUserRepository.prototype.findById
  try {
    const anonymous = await fetch(url, { method: 'POST', headers: { 'content-type': 'multipart/form-data' }, body: 'not multipart' })
    assert.equal(anonymous.status, 401)

    MongoUserRepository.prototype.findById = async (id) => ({
      id, isActive: true, sessionId: 'quiz-upload-session', role: { value: 'admin' },
      permissions: { quizzes: { read: true, edit: true } }, isSuperAdmin: false,
    })
    const token = new JwtService(loadJwtConfig(validEnv)).signAccessToken({ sub: '507f1f77bcf86cd799439015', sid: 'quiz-upload-session' })
    const malformed = await fetch(url, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'multipart/form-data' }, body: 'not multipart',
    })
    assert.equal(malformed.status, 400)
    assert.equal((await malformed.json()).code, 'MALFORMED_MULTIPART')
  } finally {
    MongoUserRepository.prototype.findById = originalFindById
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test('course read policy hides draft courses and requires current admin permission', () => {
  const draft = { status: 'draft', isPublished: false, isActive: true }
  assert.throws(() => CourseAccessPolicy.assertCanView(draft), /Course not found/)
  assert.throws(() => CourseAccessPolicy.assertCanView(draft, { sub: 'student', role: 'student' }), /Course not found/)
  assert.equal(canReadCourseAdminData({ sub: 'admin', role: 'admin', permissions: { courses: { read: true, edit: false } } }), true)
  assert.equal(canReadCourseAdminData({ sub: 'admin', role: 'admin', permissions: { courses: { read: false, edit: false } } }), false)
})

test('academic access permits a shared track course and denies free lessons outside student placement', async () => {
  const ids = {
    stage: '507f1f77bcf86cd799439001', grade: '507f1f77bcf86cd799439002',
    track: '507f1f77bcf86cd799439003', otherTrack: '507f1f77bcf86cd799439004',
  }
  const oid = (value) => ({ toString: () => value, equals: (other) => value === String(other) })
  const actor = { sub: '507f1f77bcf86cd799439005', role: 'student' }
  const original = {
    userFindOne: UserModel.findOne, gradeFindById: GradeModel.findById,
    trackFindById: TrackModel.findById, specFindById: SpecializationModel.findById,
    lessonFindById: LessonModel.findById, classFindById: ClassModel.findById,
    subjectFindById: SubjectModel.findById, courseFindById: CourseModel.findById,
  }
  const student = { academicStageId: oid(ids.stage), academicGradeId: oid(ids.grade), academicTrackId: oid(ids.track) }
  UserModel.findOne = () => ({ select: () => ({ lean: async () => student }) })
  GradeModel.findById = () => ({ select: () => ({ lean: async () => ({ stageId: oid(ids.stage), isActive: true }) }) })
  TrackModel.findById = () => ({ select: () => ({ lean: async () => ({ gradeIds: [oid(ids.grade)], isActive: true }) }) })
  SpecializationModel.findById = () => ({ select: () => ({ lean: async () => null }) })
  const course = {
    _id: oid('507f1f77bcf86cd799439006'), stageId: oid(ids.stage), gradeId: oid(ids.grade),
    trackIds: [oid(ids.track), oid(ids.otherTrack)], specializationIds: [], isActive: true,
    isPublished: true, status: 'published', price: 0,
  }
  assert.equal(await CourseAccessPolicy.isAcademicallyEligible(course, actor), true)
  assert.equal(await CourseAccessPolicy.isAcademicallyEligible({ ...course, trackIds: [oid(ids.otherTrack)] }, actor), false)

  LessonModel.findById = async () => ({ classId: 'class', isFree: true, isActive: true, isPublished: true, status: 'published' })
  ClassModel.findById = async () => ({ subjectId: 'subject' })
  SubjectModel.findById = async () => ({ courseId: 'course' })
  CourseModel.findById = async () => ({ ...course, trackIds: [oid(ids.otherTrack)] })
  try {
    await assert.rejects(() => LessonAccessPolicy.authorize('507f1f77bcf86cd799439007', actor), /Lesson not found/)
  } finally {
    UserModel.findOne = original.userFindOne
    GradeModel.findById = original.gradeFindById
    TrackModel.findById = original.trackFindById
    SpecializationModel.findById = original.specFindById
    LessonModel.findById = original.lessonFindById
    ClassModel.findById = original.classFindById
    SubjectModel.findById = original.subjectFindById
    CourseModel.findById = original.courseFindById
  }
})

test('media management policy rejects users without course edit permission', () => {
  assert.throws(() => MediaAccessPolicy.assertCanManageMedia({ sub: 'student', role: 'student' }), /permission to manage media/)
  assert.throws(() => MediaAccessPolicy.assertCanManageMedia({ sub: 'admin', role: 'admin', permissions: { courses: { read: true, edit: false } } }), /permission to manage media/)
  assert.doesNotThrow(() => MediaAccessPolicy.assertCanManageMedia({ sub: 'admin', role: 'admin', permissions: { courses: { read: false, edit: true } } }))
})

test('route permission middleware rejects missing and insufficient permissions', async () => {
  const check = requirePermission('courses', 'edit')
  const invoke = (user) => new Promise((resolve) => check({ user }, {}, (error) => resolve(error)))
  assert.equal((await invoke(undefined))?.statusCode, 401)
  assert.equal((await invoke({ role: 'student' }))?.statusCode, 403)
  assert.equal((await invoke({ role: 'admin', permissions: { courses: { read: true, edit: false } } }))?.statusCode, 403)
  assert.equal(await invoke({ role: 'admin', permissions: { courses: { read: true, edit: true } } }), undefined)
})

test('HLS playlist child URIs receive the short-lived token and traversal is rejected', () => {
  const rewritten = rewritePlaylist('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\nsegment-1.ts', 'short-token')
  assert.match(rewritten, /key\.bin\?token=short-token/)
  assert.match(rewritten, /segment-1\.ts\?token=short-token/)
  assert.throws(() => rewritePlaylist('#EXTM3U\n..\\secret.ts', 'short-token'), /Unsupported playlist reference/)
})

test('public curriculum responses omit protected lessons, quizzes, coursework, and storage URLs', async () => {
  const id = (value) => ({ toString: () => value })
  const course = { id: id('course-1'), title: 'Course', slug: { value: 'course' }, description: '', isPublished: true, isActive: true }
  const subject = { id: id('subject-1'), title: 'Subject', slug: { value: 'subject' }, description: '', order: 0, isActive: true }
  const classItem = { id: id('class-1'), title: 'Class', subjectId: id('subject-1'), order: 0 }
  const lesson = (lessonId, isFree) => ({
    id: id(lessonId), title: lessonId, order: { value: 1 }, type: 'video',
    videoStatus: { value: 'ready' }, videoDuration: 60, hlsUrl: 'https://private.example/master.m3u8',
    coverImage: undefined, isFree, isPublished: true, isActive: true,
  })
  const quiz = { id: id('quiz-1'), title: 'Quiz', description: '', classId: id('class-1'), isActive: true, questions: [] }
  const coursework = { id: id('work-1'), title: 'Private work', description: '', subjectId: id('subject-1'), materialKeys: ['private/key.pdf'], isActive: true, createdAt: new Date(), updatedAt: new Date() }
  const useCase = new GetCurriculumTreeUseCase(
    { findById: async () => course },
    { findByCourse: async () => [subject] },
    { findBySubject: async () => [classItem] },
    { findByClass: async () => [lesson('preview', true), lesson('paid', false)] },
    { findBySubjectId: async () => [coursework] },
    { findByClassId: async () => [quiz] },
  )

  const tree = await useCase.execute('course-1', false)
  assert.deepEqual(tree.subjects[0].classes[0].lessons.map((item) => item.id), ['preview'])
  assert.equal(tree.subjects[0].classes[0].lessons[0].hlsUrl, undefined)
  assert.deepEqual(tree.subjects[0].classes[0].quizzes, [])
  assert.deepEqual(tree.subjects[0].courseworks, [])
})

test('HLS route rejects missing, revoked, wrong-course, and draft access; serves an authorized request', async () => {
  const route = videoRouter.stack.find((layer) => layer.route?.path === '/hls/:lessonId/*')
  const handler = route.route.stack.at(-1).handle
  const lessonId = '507f1f77bcf86cd799439011'
  const classId = '507f1f77bcf86cd799439012'
  const subjectId = '507f1f77bcf86cd799439013'
  const courseId = '507f1f77bcf86cd799439014'
  const videoId = '12345678-1234-4234-8234-123456789abc'
  const original = {
    userFindById: MongoUserRepository.prototype.findById,
    lessonFindById: LessonModel.findById,
    classFindById: ClassModel.findById,
    subjectFindById: SubjectModel.findById,
    courseFindById: CourseModel.findById,
    userFindOne: UserModel.findOne,
    gradeFindById: GradeModel.findById,
    getR2Object: r2.getR2Object,
  }
  let courseStatus = 'published'
  const actor = {
    id: { toString: () => '507f1f77bcf86cd799439015' }, isActive: true, sessionId: 'active-session',
    role: { value: 'student' }, isSuperAdmin: false, permissions: undefined,
  }
  MongoUserRepository.prototype.findById = async () => actor
  UserModel.findOne = () => ({ select: () => ({ lean: async () => ({
    academicStageId: new (require('mongoose').Types.ObjectId)('507f1f77bcf86cd799439016'),
    academicGradeId: new (require('mongoose').Types.ObjectId)('507f1f77bcf86cd799439017'),
  }) }) })
  GradeModel.findById = () => ({ select: () => ({ lean: async () => ({ stageId: new (require('mongoose').Types.ObjectId)('507f1f77bcf86cd799439016'), isActive: true }) }) })
  LessonModel.findById = async () => ({
    _id: { toString: () => lessonId }, classId, status: 'published', isPublished: true,
    isActive: true, isFree: true, videoStatus: 'ready', hlsKey: `videos/${videoId}/master.m3u8`,
  })
  ClassModel.findById = async () => ({ subjectId })
  SubjectModel.findById = async () => ({ courseId })
  CourseModel.findById = async () => ({
    status: courseStatus, isPublished: courseStatus === 'published', isActive: true,
    stageId: new (require('mongoose').Types.ObjectId)('507f1f77bcf86cd799439016'),
    gradeId: new (require('mongoose').Types.ObjectId)('507f1f77bcf86cd799439017'),
  })
  let requestedKey
  r2.getR2Object = async (key) => {
    requestedKey = key
    return { Body: { transformToString: async () => '#EXTM3U\nsegment-1.ts' } }
  }

  const invoke = async (token, requestedLessonId = lessonId) => {
    const response = { headers: {}, setHeader(name, value) { this.headers[name] = value }, send(body) { this.body = body } }
    let error
    await handler({
      params: { lessonId: requestedLessonId, 0: 'master.m3u8' },
      query: token ? { token } : {},
    }, response, (err) => { error = err })
    return { response, error }
  }

  try {
    assert.equal((await invoke()).error?.statusCode, 401)

    const revokedToken = new JwtService(loadJwtConfig(validEnv)).signMediaToken({ sub: '507f1f77bcf86cd799439015', sid: 'old-session', lessonId })
    assert.equal((await invoke(revokedToken)).error?.statusCode, 401)

    const goodToken = new JwtService(loadJwtConfig(validEnv)).signMediaToken({ sub: '507f1f77bcf86cd799439015', sid: 'active-session', lessonId })
    assert.equal((await invoke(goodToken, '507f1f77bcf86cd799439099')).error?.code, 'MEDIA_TOKEN_MISMATCH')

    courseStatus = 'draft'
    assert.equal((await invoke(goodToken)).error?.statusCode, 404)

    courseStatus = 'published'
    const allowed = await invoke(goodToken)
    assert.equal(allowed.error, undefined)
    assert.equal(requestedKey, `videos/${videoId}/master.m3u8`)
    assert.match(allowed.response.body, /segment-1\.ts\?token=/)
    assert.equal(allowed.response.headers['Cache-Control'], 'private, no-store')
  } finally {
    MongoUserRepository.prototype.findById = original.userFindById
    LessonModel.findById = original.lessonFindById
    ClassModel.findById = original.classFindById
    SubjectModel.findById = original.subjectFindById
    CourseModel.findById = original.courseFindById
    UserModel.findOne = original.userFindOne
    GradeModel.findById = original.gradeFindById
    r2.getR2Object = original.getR2Object
  }
})

test('assessment grading computes score, percentage, and pass status on the server', () => {
  const result = gradeAssessment([
    { id: 'q1', correctAnswer: 'True' }, { id: 'q2', correctAnswer: 'B' },
  ], { q1: ' true ', q2: 'a' }, 50, 1)
  assert.equal(result.score, 1)
  assert.equal(result.percentage, 50)
  assert.equal(result.passed, true)
  assert.equal(result.gradedQuestions[0].correctAnswer, undefined)
})

test('assessment attempts enforce availability, max attempts, ownership, time limits, and answer visibility', async () => {
  const attempts = []
  const repository = {
    countForStudentQuiz: async (studentId, quizId) => attempts.filter((a) => a.studentId === studentId && a.quizId === quizId).length,
    findActiveForStudentQuiz: async (studentId, quizId) => attempts.find((a) => a.studentId === studentId && a.quizId === quizId && a.status === 'active') || null,
    create: async (studentId, quizId, attemptNumber, startedAt) => {
      if (attempts.some((a) => a.studentId === studentId && a.quizId === quizId && a.attemptNumber === attemptNumber)) throw { code: 11000 }
      const attempt = { id: `attempt-${attempts.length + 1}`, studentId, quizId, attemptNumber, startedAt, status: 'active' }
      attempts.push(attempt)
      return attempt
    },
    findActive: async (id, studentId, quizId) => attempts.find((a) => a.id === id && a.studentId === studentId && a.quizId === quizId && a.status === 'active') || null,
    complete: async (id, studentId, quizId, answers, result) => { const a = attempts.find((v) => v.id === id && v.studentId === studentId && v.quizId === quizId && v.status === 'active'); if (!a) return false; Object.assign(a, { status: 'completed', answers, result }); return true },
    expire: async (id) => { const a = attempts.find((v) => v.id === id); if (a) a.status = 'expired' },
  }
  let now = new Date('2026-10-10T12:00:00Z')
  const service = new AssessmentAttemptService(repository, () => now)
  const assessment = { id: 'quiz', isActive: true, maxAttempts: 1, timeLimitMinutes: 1, passPercentage: 50, answerVisibility: 'never', questions: [{ id: 'q1', correctAnswer: 'yes' }] }
  const attempt = await service.start(assessment, 'student')
  assert.equal((await service.start({ ...assessment, maxAttempts: 2 }, 'student')).id, attempt.id)
  await assert.rejects(() => service.submit(assessment, 'other-student', attempt.id, { q1: 'yes' }), /Active assessment attempt/)
  now = new Date('2026-10-10T12:02:00Z')
  await assert.rejects(() => service.submit(assessment, 'student', attempt.id, { q1: 'yes' }), /time limit/)
  assert.equal(attempts[0].status, 'expired')
  await assert.rejects(() => service.start(assessment, 'student'), /Maximum assessment attempts/)

  const unlimited = { ...assessment, id: 'quiz2', maxAttempts: 2, timeLimitMinutes: undefined, answerVisibility: 'never' }
  const active = await service.start(unlimited, 'student')
  const result = await service.submit(unlimited, 'student', active.id, { q1: 'yes' })
  assert.equal(result.passed, true)
  assert.deepEqual(result.gradedQuestions, [{ questionId: 'q1', isCorrect: true }])
  await assert.rejects(() => service.submit(unlimited, 'student', active.id, { q1: 'yes' }), /Active assessment attempt/)
})
