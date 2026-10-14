import mongoose from 'mongoose'
import { AssessmentAttemptRepository, AttemptRecord, AttemptResult } from '../../application/attempts/AssessmentAttemptService'
import { AssessmentAttemptModel } from './AssessmentAttemptModel'

function toRecord(doc: { _id: mongoose.Types.ObjectId; studentId: mongoose.Types.ObjectId; quizId: mongoose.Types.ObjectId; attemptNumber: number; startedAt: Date; status: 'active' | 'completed' | 'expired' }): AttemptRecord {
  return {
    id: doc._id.toString(),
    studentId: doc.studentId.toString(),
    quizId: doc.quizId.toString(),
    attemptNumber: doc.attemptNumber,
    startedAt: doc.startedAt,
    status: doc.status,
  }
}

export class MongoAssessmentAttemptRepository implements AssessmentAttemptRepository {
  async findActiveForStudentQuiz(studentId: string, quizId: string): Promise<AttemptRecord | null> {
    const doc = await AssessmentAttemptModel.findOne({ studentId, quizId, status: 'active' })
    return doc ? toRecord(doc) : null
  }

  async countForStudentQuiz(studentId: string, quizId: string): Promise<number> {
    return AssessmentAttemptModel.countDocuments({ studentId, quizId })
  }

  async create(studentId: string, quizId: string, attemptNumber: number, startedAt: Date): Promise<AttemptRecord> {
    const doc = await AssessmentAttemptModel.create({ studentId, quizId, attemptNumber, startedAt, status: 'active' })
    return toRecord(doc)
  }

  async findActive(attemptId: string, studentId: string, quizId: string): Promise<AttemptRecord | null> {
    const doc = await AssessmentAttemptModel.findOne({ _id: attemptId, studentId, quizId, status: 'active' })
    return doc ? toRecord(doc) : null
  }

  async complete(attemptId: string, studentId: string, quizId: string, answers: Record<string, string>, result: AttemptResult, submittedAt: Date): Promise<boolean> {
    const doc = await AssessmentAttemptModel.findOneAndUpdate(
      { _id: attemptId, studentId, quizId, status: 'active' },
      { $set: {
        answers,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        passed: result.passed,
        submittedAt,
        status: 'completed',
      } },
      { new: true },
    )
    return Boolean(doc)
  }

  async expire(attemptId: string, submittedAt: Date): Promise<void> {
    await AssessmentAttemptModel.updateOne(
      { _id: attemptId, status: 'active' },
      { $set: { status: 'expired', submittedAt } },
    )
  }
}
