import mongoose from 'mongoose'
import { QuizModel, QuizDocument } from './QuizModel'
import { Quiz, QuizProps, QuestionProps } from '../../domain/entities/Quiz'
import { UniqueEntityId } from '@shared/domain/UniqueEntityId'

// ── Mapper ──────────────────────────────────────────────────────────────────
function toDomain(doc: QuizDocument): Quiz {
  const questions: QuestionProps[] = doc.questions.map((q) => ({
    questionText:  q.questionText,
    type:          q.type,
    options:       q.options,
    correctAnswer: q.correctAnswer,
    explanation:   q.explanation,
  }))

  return Quiz.reconstitute(
    {
      title:       doc.title,
      description: doc.description,
      classId:     new UniqueEntityId(doc.classId.toHexString()),
      questions,
      isActive:    doc.isActive,
      maxAttempts: doc.maxAttempts ?? 1,
      timeLimitMinutes: doc.timeLimitMinutes,
      passPercentage: doc.passPercentage ?? 50,
      availableFrom: doc.availableFrom,
      availableUntil: doc.availableUntil,
      answerVisibility: doc.answerVisibility ?? 'never',
      isFree: doc.isFree ?? false,
      createdAt:   doc.createdAt,
      updatedAt:   doc.updatedAt,
    },
    new UniqueEntityId((doc._id as mongoose.Types.ObjectId).toHexString())
  )
}

function toPersistence(quiz: Quiz): Record<string, unknown> {
  return {
    _id:         quiz.id.toString(),
    title:       quiz.title,
    description: quiz.description,
    classId:     new mongoose.Types.ObjectId(quiz.classId.toString()),
    questions:   quiz.questions,
    isActive:    quiz.isActive,
    maxAttempts: quiz.maxAttempts,
    timeLimitMinutes: quiz.timeLimitMinutes,
    passPercentage: quiz.passPercentage,
    availableFrom: quiz.availableFrom,
    availableUntil: quiz.availableUntil,
    answerVisibility: quiz.answerVisibility,
    isFree: quiz.isFree,
  }
}

// ── Repository ──────────────────────────────────────────────────────────────
export class QuizRepository {
  /** Find a single quiz by ID (includes correctAnswer — use only on server side) */
  async findById(id: string): Promise<Quiz | null> {
    const doc = await QuizModel.findById(id)
    return doc ? toDomain(doc) : null
  }

  /** List quizzes for a given Class (Unit), sorted newest first */
  async findByClassId(classId: string): Promise<Quiz[]> {
    const docs = await QuizModel.find({ classId, isActive: true }).sort({ createdAt: -1 })
    return docs.map(toDomain)
  }

  /** List all active quizzes (admin view) */
  async findAll(page = 1, limit = 20): Promise<{ items: Quiz[]; total: number }> {
    const [docs, total] = await Promise.all([
      QuizModel.find({ isActive: true })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      QuizModel.countDocuments({ isActive: true }),
    ])
    return { items: docs.map(toDomain), total }
  }

  /** Upsert a quiz */
  async save(quiz: Quiz): Promise<void> {
    await QuizModel.findByIdAndUpdate(
      quiz.id.toString(),
      { $set: toPersistence(quiz) },
      { upsert: true, new: true }
    )
  }

  /** Soft-delete */
  async delete(id: string): Promise<void> {
    await QuizModel.findByIdAndUpdate(id, { $set: { isActive: false } })
  }
}
