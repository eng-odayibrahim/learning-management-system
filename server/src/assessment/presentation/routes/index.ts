import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { authenticate, requirePermission, requireStudent } from '@identity/presentation/middlewares/authenticate'
import { QuizRepository } from '../../infrastructure/persistence/QuizRepository'
import { QuizModel } from '../../infrastructure/persistence/QuizModel'
import { Quiz, QuestionProps } from '../../domain/entities/Quiz'
import { NotFoundError, AppError } from '@shared/errors/AppError'
import path from 'path'
import { sniffSignature } from '@shared/security/uploadSecurity'
import { adminSensitiveLimiter, quizSubmitLimiter, uploadLimiter } from '@shared/security/rateLimiters'
import { AssessmentAttemptService } from '../../application/attempts/AssessmentAttemptService'
import { MongoAssessmentAttemptRepository } from '../../infrastructure/persistence/MongoAssessmentAttemptRepository'
import { ClassModel } from '@learning/infrastructure/persistence/ClassModel'
import { SubjectModel } from '@learning/infrastructure/persistence/SubjectModel'
import { CourseAccessPolicy, canReadCourseAdminData } from '@learning/application/policies/AccessPolicies'
import { ForbiddenError } from '@shared/errors/AppError'
import mongoose from 'mongoose'
import { z } from 'zod'
import { recordAuditEvent } from '@shared/application/AuditLog'

const router = Router()
const quizRepo = new QuizRepository()
const attemptService = new AssessmentAttemptService(new MongoAssessmentAttemptRepository())
const QuizSettingsSchema = z.object({
  maxAttempts: z.number().int().min(1).max(100).optional(),
  timeLimitMinutes: z.number().int().min(1).max(600).optional(),
  passPercentage: z.number().finite().min(0).max(100).optional(),
  availableFrom: z.string().datetime().transform((value) => new Date(value)).optional(),
  availableUntil: z.string().datetime().transform((value) => new Date(value)).optional(),
  answerVisibility: z.enum(['never', 'after_submission']).optional(),
  isFree: z.boolean().optional(),
}).strict()

function assertResourceId(id: string): void {
  if (!mongoose.isValidObjectId(id)) throw new NotFoundError('Assessment')
}

async function assertStudentQuizAccess(classId: string, actor: NonNullable<Request['user']>, isFree = false): Promise<boolean> {
  if (canReadCourseAdminData(actor)) return true
  const cls = await ClassModel.findById(classId).select('subjectId isActive').lean()
  const subject = cls?.isActive ? await SubjectModel.findById(cls.subjectId).select('courseId isActive').lean() : null
  if (!subject?.isActive) throw new NotFoundError('Assessment')
  const course = await CourseAccessPolicy.loadForView(subject.courseId.toString(), actor)
  if (!isFree && (course.price ?? 0) > 0 && !(await CourseAccessPolicy.hasEntitlement(course._id.toString(), actor))) {
    throw new ForbiddenError('You do not have access to this assessment')
  }
  return false
}

function attemptDefinition(doc: any) {
  return {
    id: doc._id.toString(), isActive: doc.isActive,
    maxAttempts: doc.maxAttempts ?? 1, timeLimitMinutes: doc.timeLimitMinutes,
    passPercentage: doc.passPercentage ?? 50, availableFrom: doc.availableFrom,
    availableUntil: doc.availableUntil, answerVisibility: doc.answerVisibility ?? 'never',
    questions: doc.questions.map((q: any) => ({ id: q._id.toString(), correctAnswer: q.correctAnswer, explanation: q.explanation })),
  }
}

// ── Async wrapper ────────────────────────────────────────────────────────────
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// ── Candidate Gemini Models with automatic fallback ──────────────────────────
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
]

// ── Multer: store quiz paper in memory (PDF / Image, max 20 MB) ───────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
    fields: 10,
    parts: 20,
    fieldNameSize: 100,
    headerPairs: 100,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
    if (allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new AppError('صيغة الملف غير مدعومة (يرجى رفع ملف PDF أو صورة JPG/PNG/WEBP)', 422, true, 'UNSUPPORTED_FILE_TYPE'))
    }
  },
})

const MAX_QUIZ_UPLOAD_BYTES = 20 * 1024 * 1024
const quizUploadRequestLimit = (req: Request, _res: Response, next: NextFunction) => {
  const length = Number(req.headers['content-length'])
  if (Number.isFinite(length) && length > MAX_QUIZ_UPLOAD_BYTES + 64 * 1024) {
    return next(new AppError('The request is too large', 413, true, 'UPLOAD_TOO_LARGE'))
  }
  next()
}

// ── Gemini client ────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ═══════════════════════════════════════════════════════════════════════════
// 0.  AI CONNECTIVITY TEST  —  GET /api/quizzes/test-ai  (admin only)
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/test-ai',
  authenticate,
  requirePermission('quizzes', 'edit'),
  wrap(async (_req, res) => {
    let lastErr: any = null
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent('Reply with the single word: OK')
        const text = result.response.text().trim()
        return void res.json({ success: true, data: { response: text, model: modelName } })
      } catch (err: any) {
        lastErr = err
        console.warn(`[test-ai] Model ${modelName} failed:`, err.message?.split('\n')[0])
      }
    }
    res.status(200).json({
      success: false,
      error: {
        status: lastErr?.status ?? lastErr?.httpStatus ?? 'unknown',
        message: lastErr?.message?.split('\n')[0] || 'All AI models failed',
      },
    })
  })
)

// ═══════════════════════════════════════════════════════════════════════════
// 1.  AI EXTRACTION  —  POST /api/quizzes/extract
// ═══════════════════════════════════════════════════════════════════════════
router.post(
  '/extract',
  authenticate,
  requirePermission('quizzes', 'edit'),
  uploadLimiter,
  quizUploadRequestLimit,
  upload.single('quizFile'),
  wrap(async (req, res) => {
    if (!req.file) throw new AppError('يرجى رفع ملف اختبار (PDF أو صورة)', 400)

    const ext = path.extname(req.file.originalname).toLowerCase()
    const expectedSignature: Record<string, string[]> = {
      '.pdf': ['pdf'],
      '.jpg': ['jpeg'],
      '.jpeg': ['jpeg'],
      '.png': ['png'],
      '.webp': ['webp'],
    }
    const detected = sniffSignature(req.file.buffer)
    const validSignatures = expectedSignature[ext]
    if (detected && validSignatures && !validSignatures.includes(detected)) {
      throw new AppError('The file content does not match its type', 422, true, 'INVALID_FILE_CONTENT')
    }

    // Determine correct MIME type for Gemini inlineData
    let mimeType = req.file.mimetype as string
    if (ext === '.pdf') mimeType = 'application/pdf'
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg'
    else if (ext === '.png') mimeType = 'image/png'
    else if (ext === '.webp') mimeType = 'image/webp'

    const inlineData = {
      inlineData: {
        mimeType,
        data: req.file.buffer.toString('base64'),
      },
    }

    const prompt = `You are an expert educational content extractor.
Analyze the attached quiz/exam document carefully and extract ALL questions present on the page(s).

CRITICAL INSTRUCTIONS:
1. Extract EVERY question, exercise, or problem found in the document.
2. Even if an answer is NOT explicitly marked on the paper, DO NOT SKIP the question! Infer the most accurate answer or write a model answer.
3. If the document is in Arabic, extract the questions and choices in Arabic exactly as written.
4. Output MUST be ONLY a JSON array of question objects starting with [ and ending with ]. No markdown fences, no introduction, no commentary.

Each question object in the JSON array must follow this schema:
{
  "questionText": "The full text of the question",
  "type": "multiple_choice | true_false | fill_blank | define",
  "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correctAnswer": "The correct answer or inferred model answer",
  "explanation": "Brief explanation or context"
}

Type rules:
- "multiple_choice": For questions with options/choices. Include all choices in "options". Set "correctAnswer" to the correct option text.
- "true_false": For true/false or yes/no questions (صح أو خطأ). "correctAnswer" MUST be either "true" or "false". Omit "options".
- "fill_blank": For complete-the-blank questions (أكمل الفراغ). "correctAnswer" is the missing word/phrase. Omit "options".
- "define": For short answer, definition, or essay questions (علل / عرف / اشرح). "correctAnswer" is the model answer. Omit "options".

Output MUST start with [ and end with ].`

    let rawText = ''
    let lastGeminiErr: any = null

    for (const modelName of CANDIDATE_MODELS) {
      try {
        console.log(`[Quiz Extract] Attempting extraction with model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent([prompt, inlineData])
        rawText = result.response.text().trim()
        if (rawText) {
          console.log(`[Quiz Extract] Received response from ${modelName} (${rawText.length} chars)`)
          break
        }
      } catch (geminiErr: any) {
        lastGeminiErr = geminiErr
        console.warn(`[Quiz Extract] Model ${modelName} error:`, geminiErr.message?.split('\n')[0])
      }
    }

    if (!rawText) {
      const is429 = lastGeminiErr?.message?.includes('429') || lastGeminiErr?.status === 429
      const userMsg = is429
        ? 'تم تجاوز حد الطلبات لـ Gemini AI — انتظر لحظة وحاول مجدداً'
        : `خطأ في الاتصال بـ Gemini AI: ${lastGeminiErr?.message?.split('\n')[0] || 'فشل توليد الاستجابة'}`
      throw new AppError(userMsg, is429 ? 429 : 502)
    }

    try {
      // ── Clean JSON string ──
      let jsonStr = rawText
        .replace(/```(?:json|JSON)?\s*/g, '')
        .replace(/```\s*$/g, '')
        .trim()

      let parsedData: any = null

      // Strategy 1: Direct parse
      try {
        parsedData = JSON.parse(jsonStr)
      } catch (_) {}

      // Strategy 2: Array bounds [ ... ]
      if (!parsedData || !Array.isArray(parsedData)) {
        const start = jsonStr.indexOf('[')
        const end = jsonStr.lastIndexOf(']')
        if (start !== -1 && end > start) {
          const candidate = jsonStr.slice(start, end + 1).replace(/,\s*([\]}])/g, '$1')
          try {
            parsedData = JSON.parse(candidate)
          } catch (_) {}
        }
      }

      // Strategy 3: Object bounds { ... } with nested questions
      if (!parsedData) {
        const start = jsonStr.indexOf('{')
        const end = jsonStr.lastIndexOf('}')
        if (start !== -1 && end > start) {
          const candidate = jsonStr.slice(start, end + 1).replace(/,\s*([\]}])/g, '$1')
          try {
            const obj = JSON.parse(candidate)
            if (Array.isArray(obj.questions)) parsedData = obj.questions
            else if (Array.isArray(obj.data)) parsedData = obj.data
            else if (Array.isArray(obj.items)) parsedData = obj.items
            else parsedData = Object.values(obj).filter((v) => typeof v === 'object')
          } catch (_) {}
        }
      }

      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error('لم يتمكن الذكاء الاصطناعي من استخراج الأسئلة بصيغة JSON صالحة من هذا الملف')
      }

      // ── Normalize each question into QuestionProps ──
      const questions: QuestionProps[] = []

      for (let i = 0; i < parsedData.length; i++) {
        const item = parsedData[i]
        if (!item || typeof item !== 'object') continue

        // Extract questionText flexibly
        const questionText = (
          item.questionText ||
          item.question ||
          item.prompt ||
          item.text ||
          item.title ||
          item.body ||
          item.نص_السؤال ||
          item.السؤال ||
          ''
        ).toString().trim()

        if (!questionText) continue

        // Extract options
        const rawOptions: any = item.options || item.choices || item.answers || item.الخيارات
        let options: string[] | undefined = undefined
        if (Array.isArray(rawOptions)) {
          options = rawOptions
            .map((o) => (typeof o === 'string' ? o.trim() : String(o?.text || o?.value || o).trim()))
            .filter(Boolean)
        } else if (rawOptions && typeof rawOptions === 'object') {
          options = Object.values(rawOptions).map((o) => String(o).trim()).filter(Boolean)
        }

        // Determine type
        const rawType = (item.type || item.نوع || '').toString().toLowerCase().trim()
        let type: QuestionProps['type'] = 'multiple_choice'

        if (
          rawType.includes('true') ||
          rawType.includes('false') ||
          rawType.includes('صح') ||
          rawType.includes('خطأ') ||
          rawType.includes('boolean')
        ) {
          type = 'true_false'
        } else if (
          rawType.includes('blank') ||
          rawType.includes('فراغ') ||
          rawType.includes('أكمل') ||
          rawType.includes('اكمل')
        ) {
          type = 'fill_blank'
        } else if (
          rawType.includes('define') ||
          rawType.includes('essay') ||
          rawType.includes('مقال') ||
          rawType.includes('تعريف') ||
          rawType.includes('علل') ||
          rawType.includes('اشرح') ||
          rawType.includes('short')
        ) {
          type = 'define'
        } else if (options && options.length >= 2) {
          type = 'multiple_choice'
        } else {
          type = 'define'
        }

        // Normalize correctAnswer
        let correctAnswer = (
          item.correctAnswer ||
          item.correct_answer ||
          item.answer ||
          item.solution ||
          item.modelAnswer ||
          item.الإجابة ||
          item.الإجابة_الصحيحة ||
          ''
        ).toString().trim()

        if (type === 'true_false') {
          const low = correctAnswer.toLowerCase()
          if (
            low.includes('true') ||
            low.includes('صح') ||
            low.includes('صحيح') ||
            low === 't' ||
            low === '1' ||
            low === 'نعم'
          ) {
            correctAnswer = 'true'
          } else {
            correctAnswer = 'false'
          }
        } else if (type === 'multiple_choice') {
          if (!correctAnswer && options && options.length > 0) {
            correctAnswer = options[0]
          }
        } else if (!correctAnswer) {
          correctAnswer = 'يرجى مراجعة وتحديد الإجابة النموذجية'
        }

        const explanation = (
          item.explanation ||
          item.reason ||
          item.التفسير ||
          item.الشرح ||
          'مستخرج تلقائياً من ورقة الاختبار'
        ).toString().trim()

        questions.push({
          questionText,
          type,
          options: type === 'multiple_choice' ? options : undefined,
          correctAnswer,
          explanation,
        })
      }

      if (questions.length === 0) {
        throw new Error('لم يتم العثور على نصوص أسئلة صالحة في الورقة المرفوعة')
      }

      console.log(`[Quiz Extract] ✅ Successfully extracted ${questions.length} questions`)
      res.json({ success: true, data: questions })
    } catch (parseErr: any) {
      console.error('[Quiz Extract] Extraction error:', parseErr.message)
      console.error('[Quiz Extract] Raw text was:', rawText.slice(0, 800))
      throw new AppError(parseErr.message, 422)
    }
  })
)


// ═══════════════════════════════════════════════════════════════════════════
// 2.  ADMIN: LIST ALL QUIZZES  —  GET /api/quizzes
// ═══════════════════════════════════════════════════════════════════════════
router.get(
  '/',
  authenticate,
  requirePermission('quizzes', 'read'),
  wrap(async (req, res) => {
    const page  = parseInt(req.query.page  as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    // If classId filter is provided, return quizzes for that unit only
    if (req.query.classId) {
      const items = await quizRepo.findByClassId(req.query.classId as string)
      return void res.json({ success: true, data: items.map(serialize) })
    }

    const { items, total } = await quizRepo.findAll(page, limit)
    res.json({
      success: true,
      data:    { items: items.map(serialize), total, page, limit },
    })
  })
)

// ═══════════════════════════════════════════════════════════════════════════
// 3.  ADMIN: CREATE QUIZ  —  POST /api/quizzes
// ═══════════════════════════════════════════════════════════════════════════
router.post(
  '/',
  authenticate,
  requirePermission('quizzes', 'edit'),
  adminSensitiveLimiter,
  wrap(async (req, res) => {
    const { title, description, classId, questions } = req.body

    if (!title)     throw new AppError('عنوان الاختبار مطلوب', 400)
    if (!classId)   throw new AppError('يجب تحديد الوحدة الدراسية', 400)
    if (!Array.isArray(questions) || questions.length === 0)
      throw new AppError('يجب إضافة سؤال واحد على الأقل', 400)

    // Validate each question has the minimum required fields
    questions.forEach((q: any, i: number) => {
      if (!q.questionText) throw new AppError(`السؤال ${i + 1}: نص السؤال مطلوب`, 400)
      if (!q.type)         throw new AppError(`السؤال ${i + 1}: نوع السؤال مطلوب`, 400)
      if (!q.correctAnswer) throw new AppError(`السؤال ${i + 1}: الإجابة الصحيحة مطلوبة`, 400)
    })

    const settings = QuizSettingsSchema.parse(req.body.settings ?? {})
    const quiz = Quiz.create({ title, description, classId, questions, ...settings })
    await quizRepo.save(quiz)
    await recordAuditEvent({ actorId: req.user!.sub, action: 'assessment.create', resourceType: 'assessment', resourceId: quiz.id.toString() })

    res.status(201).json({ success: true, data: serialize(quiz) })
  })
)

// ═══════════════════════════════════════════════════════════════════════════
// 4.  STUDENT: GET QUIZ (no correctAnswer)  —  GET /api/quizzes/:id
// ═══════════════════════════════════════════════════════════════════════════
/**
 * SECURITY: This endpoint uses a MongoDB projection to EXCLUDE the
 * correctAnswer field from all embedded question documents.
 * The student can inspect DevTools and will only see the sanitized document.
 */
router.get(
  '/:id',
  authenticate,   // Must be logged in (student OR admin)
  wrap(async (req, res) => {
    assertResourceId(req.params.id)
    const doc = await QuizModel.findById(req.params.id).lean()
    if (!doc || !doc.isActive) throw new NotFoundError('الاختبار')
    const isManager = await assertStudentQuizAccess(doc.classId.toString(), req.user!, doc.isFree)
    const data = isManager ? doc : { ...doc, questions: doc.questions.map(({ correctAnswer: _answer, explanation: _explanation, ...q }) => q) }
    res.json({ success: true, data })
  })
)

router.post('/:id/attempts', authenticate, requireStudent, quizSubmitLimiter, wrap(async (req, res) => {
  assertResourceId(req.params.id)
  const doc = await QuizModel.findById(req.params.id).lean()
  if (!doc || !doc.isActive) throw new NotFoundError('الاختبار')
  await assertStudentQuizAccess(doc.classId.toString(), req.user!, doc.isFree)
  const attempt = await attemptService.start(attemptDefinition(doc), req.user!.sub)
  await recordAuditEvent({ actorId: req.user!.sub, action: 'assessment.attempt.start', resourceType: 'assessment_attempt', resourceId: attempt.id })
  res.status(201).json({ success: true, data: { id: attempt.id, attemptNumber: attempt.attemptNumber, startedAt: attempt.startedAt, timeLimitMinutes: doc.timeLimitMinutes } })
}))

router.post('/:id/attempts/:attemptId/submit', authenticate, requireStudent, quizSubmitLimiter, wrap(async (req, res) => {
  assertResourceId(req.params.id)
  if (!mongoose.isValidObjectId(req.params.attemptId)) throw new NotFoundError('Active assessment attempt')
  const doc = await QuizModel.findById(req.params.id).lean()
  if (!doc || !doc.isActive) throw new NotFoundError('الاختبار')
  await assertStudentQuizAccess(doc.classId.toString(), req.user!, doc.isFree)
  const answers = req.body?.answers
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length > 500) {
    throw new AppError('يجب إرسال إجابات صالحة', 422, true, 'INVALID_ANSWER')
  }
  const result = await attemptService.submit(attemptDefinition(doc), req.user!.sub, req.params.attemptId, answers)
  await recordAuditEvent({ actorId: req.user!.sub, action: 'assessment.attempt.submit', resourceType: 'assessment_attempt', resourceId: req.params.attemptId })
  res.json({ success: true, data: result })
}))

// ═══════════════════════════════════════════════════════════════════════════
// 5.  ADMIN: UPDATE QUIZ  —  PATCH /api/quizzes/:id
// ═══════════════════════════════════════════════════════════════════════════
router.patch(
  '/:id',
  authenticate,
  requirePermission('quizzes', 'edit'),
  adminSensitiveLimiter,
  wrap(async (req, res) => {
    const quiz = await quizRepo.findById(req.params.id)
    if (!quiz || !quiz.isActive) throw new NotFoundError('الاختبار')

    const settings = QuizSettingsSchema.partial().parse(req.body.settings ?? {})
    quiz.update({
      title:       req.body.title,
      description: req.body.description,
      questions:   req.body.questions,
      ...settings,
    })
    await quizRepo.save(quiz)

    res.json({ success: true, data: serialize(quiz) })
  })
)

// ═══════════════════════════════════════════════════════════════════════════
// 5.5 ADMIN: TOGGLE QUIZ ACTIVE STATUS  —  PATCH /api/quizzes/:id/toggle
// ═══════════════════════════════════════════════════════════════════════════
router.patch(
  '/:id/toggle',
  authenticate,
  requirePermission('quizzes', 'edit'),
  adminSensitiveLimiter,
  wrap(async (req, res) => {
    const quiz = await quizRepo.findById(req.params.id)
    if (!quiz) throw new NotFoundError('الاختبار')

    quiz.toggleActive()
    await quizRepo.save(quiz)
    await recordAuditEvent({ actorId: req.user!.sub, action: quiz.isActive ? 'assessment.activate' : 'assessment.deactivate', resourceType: 'assessment', resourceId: quiz.id.toString() })

    res.json({ success: true, data: serialize(quiz) })
  })
)

// ═══════════════════════════════════════════════════════════════════════════
// 6.  ADMIN: DELETE QUIZ  —  DELETE /api/quizzes/:id
// ═══════════════════════════════════════════════════════════════════════════
router.delete(
  '/:id',
  authenticate,
  requirePermission('quizzes', 'edit'),
  adminSensitiveLimiter,
  wrap(async (req, res) => {
    const quiz = await quizRepo.findById(req.params.id)
    if (!quiz) throw new NotFoundError('الاختبار')

    await quizRepo.delete(req.params.id)
    await recordAuditEvent({ actorId: req.user!.sub, action: 'assessment.delete', resourceType: 'assessment', resourceId: req.params.id })
    res.json({ success: true })
  })
)

// Legacy unbound submissions cannot bypass the persistent attempt lifecycle.
router.post('/:id/submit', authenticate, quizSubmitLimiter, wrap(async (_req, _res) => {
  throw new AppError('Start an assessment attempt before submitting answers', 409, true, 'ATTEMPT_REQUIRED')
}))

// ── Serializer (domain → plain object for admin responses) ─────────────────
function serialize(quiz: Quiz) {
  return {
    id:          quiz.id.toString(),
    title:       quiz.title,
    description: quiz.description,
    classId:     quiz.classId.toString(),
    questions:   quiz.questions,
    isActive:    quiz.isActive,
    createdAt:   quiz.createdAt,
    updatedAt:   quiz.updatedAt,
  }
}

export { router as assessmentRouter }
