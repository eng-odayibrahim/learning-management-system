import mongoose, { Document, Model, Schema } from 'mongoose'

export type AssessmentAttemptStatus = 'active' | 'completed' | 'expired'

export interface AssessmentAttemptDocument extends Document {
  _id: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  quizId: mongoose.Types.ObjectId
  attemptNumber: number
  startedAt: Date
  submittedAt?: Date
  status: AssessmentAttemptStatus
  answers: Map<string, string>
  score?: number
  total?: number
  percentage?: number
  passed?: boolean
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<AssessmentAttemptDocument>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  attemptNumber: { type: Number, required: true, min: 1 },
  startedAt: { type: Date, required: true },
  submittedAt: { type: Date },
  status: { type: String, enum: ['active', 'completed', 'expired'], required: true, default: 'active' },
  answers: { type: Map, of: String, default: {} },
  score: { type: Number, min: 0 },
  total: { type: Number, min: 0 },
  percentage: { type: Number, min: 0, max: 100 },
  passed: { type: Boolean },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true })

schema.index({ studentId: 1, quizId: 1, attemptNumber: 1 }, { unique: true })
schema.index({ studentId: 1, quizId: 1, status: 1 })

export const AssessmentAttemptModel: Model<AssessmentAttemptDocument> =
  mongoose.models.AssessmentAttempt ?? mongoose.model<AssessmentAttemptDocument>('AssessmentAttempt', schema)
