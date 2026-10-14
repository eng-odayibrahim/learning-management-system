import { AppError, ConflictError, NotFoundError } from '@shared/errors/AppError'

export interface AssessmentQuestion {
  id: string
  correctAnswer: string
  explanation?: string
}

export interface AssessmentDefinition {
  id: string
  isActive: boolean
  maxAttempts: number
  timeLimitMinutes?: number
  passPercentage: number
  availableFrom?: Date
  availableUntil?: Date
  answerVisibility: 'never' | 'after_submission'
  questions: AssessmentQuestion[]
}

export interface AttemptRecord {
  id: string
  studentId: string
  quizId: string
  attemptNumber: number
  startedAt: Date
  status: 'active' | 'completed' | 'expired'
}

export interface AttemptResult {
  score: number
  total: number
  percentage: number
  passed: boolean
  attemptNumber: number
  gradedQuestions: Array<{ questionId: string; isCorrect: boolean; correctAnswer?: string; explanation?: string }>
}

export interface AssessmentAttemptRepository {
  countForStudentQuiz(studentId: string, quizId: string): Promise<number>
  findActiveForStudentQuiz(studentId: string, quizId: string): Promise<AttemptRecord | null>
  create(studentId: string, quizId: string, attemptNumber: number, startedAt: Date): Promise<AttemptRecord>
  findActive(attemptId: string, studentId: string, quizId: string): Promise<AttemptRecord | null>
  complete(attemptId: string, studentId: string, quizId: string, answers: Record<string, string>, result: AttemptResult, submittedAt: Date): Promise<boolean>
  expire(attemptId: string, submittedAt: Date): Promise<void>
}

function normalizeAnswer(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('und')
}

export function gradeAssessment(questions: AssessmentQuestion[], answers: Record<string, string>, passPercentage: number, attemptNumber: number): AttemptResult {
  const ids = new Set(questions.map((question) => question.id))
  const unexpected = Object.keys(answers).find((id) => !ids.has(id))
  if (unexpected) throw new AppError('Answer references an unknown question', 422, true, 'INVALID_ANSWER')

  const gradedQuestions = questions.map((question) => {
    const answer = answers[question.id] ?? ''
    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer)
    return {
      questionId: question.id,
      isCorrect,
      correctAnswer: isCorrect ? undefined : question.correctAnswer,
      explanation: isCorrect ? undefined : question.explanation,
    }
  })
  const score = gradedQuestions.filter((question) => question.isCorrect).length
  const total = questions.length
  const percentage = total === 0 ? 0 : Math.round((score / total) * 100)
  return { score, total, percentage, passed: percentage >= passPercentage, attemptNumber, gradedQuestions }
}

export class AssessmentAttemptService {
  constructor(private readonly attempts: AssessmentAttemptRepository, private readonly now: () => Date = () => new Date()) {}

  async start(assessment: AssessmentDefinition, studentId: string): Promise<AttemptRecord> {
    if (!assessment.isActive) throw new NotFoundError('Assessment')
    const now = this.now()
    if (assessment.availableFrom && now < assessment.availableFrom) throw new ConflictError('Assessment is not available yet')
    if (assessment.availableUntil && now > assessment.availableUntil) throw new ConflictError('Assessment is no longer available')
    const activeAttempt = await this.attempts.findActiveForStudentQuiz(studentId, assessment.id)
    if (activeAttempt) return activeAttempt
    const attemptNumber = await this.attempts.countForStudentQuiz(studentId, assessment.id) + 1
    if (!Number.isInteger(assessment.maxAttempts) || assessment.maxAttempts < 1 || attemptNumber > assessment.maxAttempts) {
      throw new ConflictError('Maximum assessment attempts reached')
    }
    try {
      return await this.attempts.create(studentId, assessment.id, attemptNumber, now)
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const concurrentAttempt = await this.attempts.findActiveForStudentQuiz(studentId, assessment.id)
        if (concurrentAttempt) return concurrentAttempt
        throw new ConflictError('Maximum assessment attempts reached')
      }
      throw error
    }
  }

  async submit(assessment: AssessmentDefinition, studentId: string, attemptId: string, answers: Record<string, string>): Promise<AttemptResult> {
    if (!assessment.isActive) throw new NotFoundError('Assessment')
    const attempt = await this.attempts.findActive(attemptId, studentId, assessment.id)
    if (!attempt) throw new NotFoundError('Active assessment attempt')
    const submittedAt = this.now()
    const deadline = assessment.timeLimitMinutes ? attempt.startedAt.getTime() + assessment.timeLimitMinutes * 60_000 : undefined
    if (deadline !== undefined && submittedAt.getTime() > deadline) {
      await this.attempts.expire(attemptId, submittedAt)
      throw new ConflictError('Assessment time limit exceeded')
    }

    const questionIds = new Set(assessment.questions.map((question) => question.id))
    const validated: Record<string, string> = {}
    for (const [id, answer] of Object.entries(answers)) {
      if (!questionIds.has(id) || typeof answer !== 'string' || answer.length > 5000) {
        throw new AppError('Invalid assessment answer', 422, true, 'INVALID_ANSWER')
      }
      validated[id] = answer
    }
    const result = gradeAssessment(assessment.questions, validated, assessment.passPercentage, attempt.attemptNumber)
    const completed = await this.attempts.complete(attemptId, studentId, assessment.id, validated, result, submittedAt)
    if (!completed) throw new ConflictError('Assessment attempt was already submitted')
    if (assessment.answerVisibility === 'never') {
      result.gradedQuestions = result.gradedQuestions.map(({ questionId, isCorrect }) => ({ questionId, isCorrect }))
    }
    return result
  }
}
