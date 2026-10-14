import mongoose, { Document, Schema, Types } from 'mongoose'

export interface CourseworkDocument extends Document {
  title:        string
  description?: string
  subjectId:    Types.ObjectId
  materialKeys: string[]
  isActive:     boolean
  createdAt:    Date
  updatedAt:    Date
}

const CourseworkSchema = new Schema<CourseworkDocument>({
  title:        { type: String, required: true, trim: true },
  description:  { type: String, trim: true },
  subjectId:    { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  materialKeys: { type: [String], default: [] },
  isActive:     { type: Boolean, default: true },
}, {
  timestamps: true
})

export const CourseworkModel = mongoose.model<CourseworkDocument>('Coursework', CourseworkSchema)
