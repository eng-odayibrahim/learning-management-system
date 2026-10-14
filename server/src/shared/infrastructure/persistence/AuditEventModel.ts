import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export interface AuditEventDocument extends Document {
  _id: Types.ObjectId
  actorId: Types.ObjectId
  action: string
  resourceType: string
  resourceId: string
  outcome: 'success' | 'denied' | 'failure'
  requestId?: string
  createdAt: Date
}

const schema = new Schema<AuditEventDocument>({
  actorId: { type: Schema.Types.ObjectId, required: true, index: true },
  action: { type: String, required: true, maxlength: 100 },
  resourceType: { type: String, required: true, maxlength: 100 },
  resourceId: { type: String, required: true, maxlength: 200 },
  outcome: { type: String, enum: ['success', 'denied', 'failure'], required: true },
  requestId: { type: String, maxlength: 100 },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false })

schema.index({ createdAt: -1 })

export const AuditEventModel: Model<AuditEventDocument> = mongoose.models.AuditEvent ?? mongoose.model<AuditEventDocument>('AuditEvent', schema)
