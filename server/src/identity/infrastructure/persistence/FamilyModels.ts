import mongoose, { Schema, Document, Model } from 'mongoose'

export interface RelationCategoryDocument extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const relationCategorySchema = new Schema<RelationCategoryDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const RelationCategoryModel: Model<RelationCategoryDocument> =
  mongoose.models.RelationCategory ?? mongoose.model<RelationCategoryDocument>('RelationCategory', relationCategorySchema)


export interface FamilyGroupDocument extends Document {
  _id: mongoose.Types.ObjectId
  categoryId: mongoose.Types.ObjectId
  studentIds: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const familyGroupSchema = new Schema<FamilyGroupDocument>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'RelationCategory', required: true },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

export const FamilyGroupModel: Model<FamilyGroupDocument> =
  mongoose.models.FamilyGroup ?? mongoose.model<FamilyGroupDocument>('FamilyGroup', familyGroupSchema)
