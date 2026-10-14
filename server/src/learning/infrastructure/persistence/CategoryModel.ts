import mongoose, { Schema, Document, Model } from 'mongoose'

export interface CategoryDocument extends Document {
  _id:          mongoose.Types.ObjectId
  name:         string
  slug:         string
  parentId:     mongoose.Types.ObjectId | null
  description?: string
  icon?:        string
  order:        number
  isActive:     boolean
  createdAt:    Date
  updatedAt:    Date
}

const schema = new Schema<CategoryDocument>(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true },
    parentId:    { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, default: '' },
    icon:        { type: String },
    order:       { type: Number, default: 0 },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
)

// Fast lookup of children
schema.index({ parentId: 1, isActive: 1 })
// Sorting by order within a parent
schema.index({ parentId: 1, order: 1 })
// Slug lookups
schema.index({ slug: 1 }, { unique: true })

export const CategoryModel: Model<CategoryDocument> =
  mongoose.models.Category ?? mongoose.model<CategoryDocument>('Category', schema)
