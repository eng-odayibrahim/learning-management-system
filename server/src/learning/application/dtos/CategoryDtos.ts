import { z } from 'zod'

export const CreateCategorySchema = z.object({
  name:        z.string().min(2).max(120).trim(),
  parentId:    z.string().length(24).optional(),     // MongoDB ObjectId hex string
  description: z.string().max(500).optional(),
  icon:        z.string().max(50).optional(),
  order:       z.number().int().min(0).default(0),
})

export const UpdateCategorySchema = z.object({
  name:        z.string().min(2).max(120).trim().optional(),
  description: z.string().max(500).optional(),
  icon:        z.string().max(50).optional(),
  order:       z.number().int().min(0).optional(),
})

export const MoveCategorySchema = z.object({
  parentId: z.string().length(24).nullable(),   // null → promote to root
})

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>
export type MoveCategoryDto   = z.infer<typeof MoveCategorySchema>
