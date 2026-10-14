import mongoose, { Schema, Document, Model } from 'mongoose'

export interface CourseDocument extends Document {
  _id:              mongoose.Types.ObjectId
  title:            string
  titleKey?:         string
  slug:             string
  description:      string
  stageId?:         mongoose.Types.ObjectId
  gradeId?:         mongoose.Types.ObjectId
  trackId?:         mongoose.Types.ObjectId
  trackIds?:        mongoose.Types.ObjectId[]
  specializationId?: mongoose.Types.ObjectId
  specializationIds?: mongoose.Types.ObjectId[]
  thumbnail?:       string
  price?:           number
  status?:          'draft' | 'review' | 'published' | 'archived'
  isPublished:      boolean
  isActive:         boolean
  order:            number
  createdAt:        Date
  updatedAt:        Date
}

const schema = new Schema<CourseDocument>(
  {
    title:            { type: String, required: true },
    titleKey:         { type: String, select: false },
    slug:             { type: String, required: true, unique: true },
    description:      { type: String, default: '' },
    stageId:          { type: Schema.Types.ObjectId, ref: 'AcademicStage' },
    gradeId:          { type: Schema.Types.ObjectId, ref: 'Grade' },
    trackId:          { type: Schema.Types.ObjectId, ref: 'Track' },
    trackIds:         [{ type: Schema.Types.ObjectId, ref: 'Track' }],
    specializationId: { type: Schema.Types.ObjectId, ref: 'Specialization' },
    specializationIds:[{ type: Schema.Types.ObjectId, ref: 'Specialization' }],
    thumbnail:        { type: String },
    price:            { type: Number, min: 0 },
    status:           { type: String, enum: ['draft', 'review', 'published', 'archived'], default: 'draft' },
    isPublished:      { type: Boolean, default: false },
    isActive:         { type: Boolean, default: true },
    order:            { type: Number, default: 0 },
  },
  { timestamps: true }
)

schema.index({ stageId: 1, isPublished: 1, isActive: 1 })
schema.index({ gradeId: 1, isPublished: 1, isActive: 1 })
schema.index({ trackId: 1, isPublished: 1, isActive: 1 })
schema.index({ specializationId: 1, isPublished: 1, isActive: 1 })
schema.index({ isPublished: 1, isActive: 1, order: 1 })
schema.index({ stageId: 1, gradeId: 1, trackIds: 1, isPublished: 1, isActive: 1 })
schema.index({ stageId: 1, gradeId: 1, specializationIds: 1, isPublished: 1, isActive: 1 })
// Partial unique index protects active, classified offerings while leaving legacy
// records without a normalized key available for manual migration review.
schema.index(
  { stageId: 1, gradeId: 1, titleKey: 1 },
  { unique: true, partialFilterExpression: { stageId: { $type: 'objectId' }, gradeId: { $type: 'objectId' }, titleKey: { $type: 'string' }, isActive: true } },
)
schema.pre('validate', function () {
  this.titleKey = this.title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
})

export const CourseModel: Model<CourseDocument> =
  mongoose.models.Course ?? mongoose.model<CourseDocument>('Course', schema)
