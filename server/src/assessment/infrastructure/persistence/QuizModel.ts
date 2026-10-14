import mongoose, { Schema, Document, Model, Types } from 'mongoose'
import { QuestionType } from '../../domain/entities/Quiz'

// ── Question Sub-document ───────────────────────────────────────────────────
export interface QuestionDocument {
  _id:           Types.ObjectId
  questionText:  string
  type:          QuestionType
  options?:      string[]
  correctAnswer: string
  explanation?:  string
}

// ── Quiz Document ───────────────────────────────────────────────────────────
export interface QuizDocument extends Document {
  _id:         Types.ObjectId
  title:       string
  description?: string
  classId:     Types.ObjectId   // References Class ("Unit") model
  questions:   QuestionDocument[]
  isActive:    boolean
  maxAttempts: number
  timeLimitMinutes?: number
  passPercentage: number
  availableFrom?: Date
  availableUntil?: Date
  answerVisibility: 'never' | 'after_submission'
  isFree: boolean
  createdAt:   Date
  updatedAt:   Date
}

// ── Sub-schema: Question ────────────────────────────────────────────────────
const QuestionSchema = new Schema<QuestionDocument>(
  {
    questionText:  { type: String, required: true, trim: true },
    type:          {
      type:     String,
      enum:     ['true_false', 'multiple_choice', 'fill_blank', 'define'],
      required: true,
    },
    // options is only required for multiple_choice; array is empty for other types
    options:       { type: [String], default: undefined },
    // correctAnswer is stored but EXCLUDED from student-facing queries via projection
    correctAnswer: { type: String, required: true },
    explanation:   { type: String, trim: true },
  },
  { _id: true } // each question gets its own _id for editing
)

// ── Main Schema: Quiz ───────────────────────────────────────────────────────
const QuizSchema = new Schema<QuizDocument>(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    classId:     { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    questions:   { type: [QuestionSchema], default: [] },
    isActive:    { type: Boolean, default: true },
    maxAttempts: { type: Number, min: 1, default: 1 },
    timeLimitMinutes: { type: Number, min: 1 },
    passPercentage: { type: Number, min: 0, max: 100, default: 50 },
    availableFrom: { type: Date },
    availableUntil: { type: Date },
    answerVisibility: { type: String, enum: ['never', 'after_submission'], default: 'never' },
    isFree: { type: Boolean, default: false },
  },
  { timestamps: true }
)

QuizSchema.index({ classId: 1, isActive: 1 })

export const QuizModel: Model<QuizDocument> =
  mongoose.models.Quiz ?? mongoose.model<QuizDocument>('Quiz', QuizSchema)
