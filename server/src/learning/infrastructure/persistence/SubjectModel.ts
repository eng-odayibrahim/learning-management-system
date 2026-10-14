import mongoose, { Schema, Document, Model } from 'mongoose'

export interface SubjectDocument extends Document {
  _id: mongoose.Types.ObjectId
  title: string; slug: string; description: string
  courseId: mongoose.Types.ObjectId
  thumbnail?: string; order: number; isActive: boolean
  createdAt: Date; updatedAt: Date
}

const schema = new Schema<SubjectDocument>(
  {
    title:       { type: String, required: true },
    slug:        { type: String, required: true },
    description: { type: String, default: '' },
    courseId:    { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    thumbnail:   { type: String },
    order:       { type: Number, default: 0 },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
)

schema.index({ courseId: 1, order: 1 })

export const SubjectModel: Model<SubjectDocument> =
  mongoose.models.Subject ?? mongoose.model<SubjectDocument>('Subject', schema)
