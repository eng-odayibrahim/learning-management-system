import mongoose, { Schema, Document, Model } from 'mongoose'

// 1. AcademicStage Model (المرحلة الدراسية: أساسي, متوسط, ثانوي...)
export interface AcademicStageDocument extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  image?: string
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const stageSchema = new Schema<AcademicStageDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)
stageSchema.index({ name: 1, isActive: 1 })
export const AcademicStageModel: Model<AcademicStageDocument> =
  mongoose.models.AcademicStage ?? mongoose.model<AcademicStageDocument>('AcademicStage', stageSchema)

// 2. Grade Model (الصف الدراسي: الصف الأول, الصف الثالث... مربوط اختياري بالمرحلة)
export interface GradeDocument extends Document {
  _id: mongoose.Types.ObjectId
  name: number
  stageId?: mongoose.Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const gradeSchema = new Schema<GradeDocument>(
  {
    name: { type: Number, required: true },
    stageId: { type: Schema.Types.ObjectId, ref: 'AcademicStage' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)
gradeSchema.index({ name: 1 })
export const GradeModel: Model<GradeDocument> =
  mongoose.models.Grade ?? mongoose.model<GradeDocument>('Grade', gradeSchema)

// 3. Track Model (المسار الدراسي: علمي, أدبي, عام...)
export interface TrackDocument extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  gradeIds?: mongoose.Types.ObjectId[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const trackSchema = new Schema<TrackDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    gradeIds: [{ type: Schema.Types.ObjectId, ref: 'Grade' }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)
trackSchema.index({ name: 1, isActive: 1 })
export const TrackModel: Model<TrackDocument> =
  mongoose.models.Track ?? mongoose.model<TrackDocument>('Track', trackSchema)

// 4. Specialization Model (التخصص الدراسي: هندسة, أحياء, حاسب...)
export interface SpecializationDocument extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  trackIds?: mongoose.Types.ObjectId[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const specializationSchema = new Schema<SpecializationDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    trackIds: [{ type: Schema.Types.ObjectId, ref: 'Track' }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)
specializationSchema.index({ name: 1, isActive: 1 })
export const SpecializationModel: Model<SpecializationDocument> =
  mongoose.models.Specialization ?? mongoose.model<SpecializationDocument>('Specialization', specializationSchema)
