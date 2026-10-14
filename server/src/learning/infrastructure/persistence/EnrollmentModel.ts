import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED' | 'REVOKED'

export interface EnrollmentDocument extends Document {
  _id: Types.ObjectId
  studentId: Types.ObjectId
  courseId: Types.ObjectId
  status: EnrollmentStatus
  source: 'admin' | 'payment' | 'invitation'
  entitlementReference?: string
  enrolledAt?: Date
  progress: number
  completedAt?: Date
  revokedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<EnrollmentDocument>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED', 'REVOKED'], required: true, default: 'PENDING' },
  source: { type: String, enum: ['admin', 'payment', 'invitation'], required: true },
  entitlementReference: { type: String, trim: true },
  enrolledAt: Date,
  progress: { type: Number, min: 0, max: 100, default: 0 },
  completedAt: Date,
  revokedAt: Date,
}, { timestamps: true })

schema.index({ studentId: 1, courseId: 1 }, { unique: true })
schema.index({ courseId: 1, status: 1 })

export const EnrollmentModel: Model<EnrollmentDocument> = mongoose.models.Enrollment ?? mongoose.model<EnrollmentDocument>('Enrollment', schema)
