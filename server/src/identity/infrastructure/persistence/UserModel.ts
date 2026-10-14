import mongoose, { Schema, Document, Model } from 'mongoose'
import { RoleType } from '../../domain/value-objects/UserRole'

export interface UserDocument extends Document {
  _id:             mongoose.Types.ObjectId
  username:        string
  email?:          string
  password:        string
  role:            RoleType
  fullName:        string
  phones:          { number: string; relation: string }[]
  stage?:          string
  grade?:          string
  track?:          string
  specialization?: string
  academicStageId?: mongoose.Types.ObjectId
  academicGradeId?: mongoose.Types.ObjectId
  academicTrackId?: mongoose.Types.ObjectId
  academicSpecializationId?: mongoose.Types.ObjectId
  permissions?:    Record<string, { read: boolean; edit: boolean }>
  isSuperAdmin?:   boolean
  isActive:        boolean
  isPaid?:         boolean
  paidPercentage?: number
  sessionId?:       string
  refreshTokenHash?: string
  refreshToken?:     string // Deprecated legacy field, removed on save
  createdAt:       Date
  updatedAt:       Date
}

const userSchema = new Schema<UserDocument>(
  {
    username:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    email:           { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password:        { type: String, required: true },
    role:            { type: String, enum: ['student', 'admin'], required: true },
    fullName:        { type: String, required: true, trim: true },
    phones:          [{ number: String, relation: String }],
    stage:           { type: String },
    grade:           { type: String },
    track:           { type: String },
    specialization:  { type: String },
    academicStageId: { type: Schema.Types.ObjectId, ref: 'AcademicStage' },
    academicGradeId: { type: Schema.Types.ObjectId, ref: 'Grade' },
    academicTrackId: { type: Schema.Types.ObjectId, ref: 'Track' },
    academicSpecializationId: { type: Schema.Types.ObjectId, ref: 'Specialization' },
    permissions:     { type: Map, of: new Schema({ read: Boolean, edit: Boolean }, { _id: false }) },
    isSuperAdmin:    { type: Boolean, default: false },
    isActive:        { type: Boolean, default: true },
    isPaid:          { type: Boolean, default: false },
    paidPercentage:  { type: Number, default: 0 },
    sessionId:       { type: String, select: false },
    refreshTokenHash:{ type: String, select: false },
    refreshToken:    { type: String, select: false }, // Legacy sessions are invalidated and cleared on save
  },
  { timestamps: true }
)

userSchema.index({ role: 1, isActive: 1 })

export const UserModel: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>('User', userSchema)
