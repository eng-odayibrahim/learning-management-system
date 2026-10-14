import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ClassDocument extends Document {
  _id: mongoose.Types.ObjectId
  title: string; subjectId: mongoose.Types.ObjectId
  order: number; isActive: boolean
  createdAt: Date; updatedAt: Date
}

const schema = new Schema<ClassDocument>(
  {
    title:     { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    order:     { type: Number, default: 0 },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
)

schema.index({ subjectId: 1, order: 1 })

export const ClassModel: Model<ClassDocument> =
  mongoose.models.Class ?? mongoose.model<ClassDocument>('Class', schema)
