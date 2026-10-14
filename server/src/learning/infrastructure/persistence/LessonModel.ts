import mongoose, { Schema, Document, Model } from 'mongoose'
import { LessonType } from '../../domain/entities/Lesson'
import { VideoStatusType } from '../../domain/value-objects/VideoStatus'

export type VideoStageType = 'idle' | 'uploading' | 'queued' | 'transcoding' | 'uploading_r2' | 'retrying' | 'done' | 'failed'

export interface LessonDocument extends Document {
  _id: mongoose.Types.ObjectId
  title: string; classId: mongoose.Types.ObjectId
  order: number; type: LessonType; description?: string
  videoKey?: string; hlsKey?: string; hlsUrl?: string
  videoDuration?: number; videoStatus: VideoStatusType
  videoStage?: VideoStageType
  videoProgress?: number
  retryCount?: number
  lastVideoError?: string
  videoJobId?: string
  materialKeys: string[]
  coverImage?: string
  status?: 'draft' | 'published' | 'archived'
  isFree: boolean; isPublished: boolean; isActive: boolean
  createdAt: Date; updatedAt: Date
}

const schema = new Schema<LessonDocument>(
  {
    title:         { type: String, required: true },
    classId:       { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    order:         { type: Number, required: true },
    type:          { type: String, enum: ['video','worksheet','mixed'], required: true },
    description:   { type: String },
    videoKey:      { type: String },
    hlsKey:        { type: String },
    hlsUrl:        { type: String },
    videoDuration: { type: Number },
    videoStatus:   { type: String, enum: ['pending','processing','ready','failed'], default: 'pending' },
    videoStage:    { type: String, enum: ['idle','uploading','queued','transcoding','uploading_r2','retrying','done','failed'], default: 'idle' },
    videoProgress: { type: Number, default: 0 },
    retryCount:    { type: Number, default: 0 },
    lastVideoError: { type: String },
    videoJobId:    { type: String },
    materialKeys:  [{ type: String }],
    coverImage:    { type: String },
    isFree:        { type: Boolean, default: false },
    status:        { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    isPublished:   { type: Boolean, default: false },
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
)

schema.index({ classId: 1, order: 1 })
schema.index({ videoKey: 1 })
schema.index({ videoStatus: 1 })

export const LessonModel: Model<LessonDocument> =
  mongoose.models.Lesson ?? mongoose.model<LessonDocument>('Lesson', schema)

