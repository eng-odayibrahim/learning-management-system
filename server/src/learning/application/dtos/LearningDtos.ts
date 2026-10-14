import { z } from 'zod'

// ── Course ─────────────────────────────────────────────────────────────────
export const CreateCourseSchema = z.object({
  title:            z.string().min(2).max(200),
  description:      z.string().default(''),
  stageId:          z.string().length(24).nullable().optional(),
  gradeId:          z.string().length(24).nullable().optional(),
  trackId:          z.string().length(24).nullable().optional(),
  trackIds:         z.array(z.string().length(24)).optional(),
  specializationId: z.string().length(24).nullable().optional(),
  specializationIds:z.array(z.string().length(24)).optional(),
  thumbnail:        z.string().nullable().optional(),
  order:            z.number().int().min(0).default(0),
})

export const UpdateCourseSchema = z.object({
  title:            z.string().min(2).max(200).optional(),
  description:      z.string().optional(),
  stageId:          z.string().length(24).nullable().optional(),
  gradeId:          z.string().length(24).nullable().optional(),
  trackId:          z.string().length(24).nullable().optional(),
  trackIds:         z.array(z.string().length(24)).optional(),
  specializationId: z.string().length(24).nullable().optional(),
  specializationIds:z.array(z.string().length(24)).optional(),
  thumbnail:        z.string().nullable().optional(),
  order:            z.number().int().min(0).optional(),
})

// ── Subject ────────────────────────────────────────────────────────────────
export const CreateSubjectSchema = z.object({
  title:       z.string().min(2).max(200),
  description: z.string().default(''),
  courseId:    z.string().length(24),
  thumbnail:   z.string().url().nullable().optional(),
  order:       z.number().int().min(0).default(0),
})

export const UpdateSubjectSchema = CreateSubjectSchema
  .omit({ courseId: true })
  .extend({ isActive: z.boolean() })
  .partial()

// ── Class ──────────────────────────────────────────────────────────────────
export const CreateClassSchema = z.object({
  title:     z.string().min(2).max(200),
  subjectId: z.string().length(24),
  order:     z.number().int().min(0).default(0),
})

export const UpdateClassSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  order: z.number().int().min(0).optional(),
})

// ── Lesson ─────────────────────────────────────────────────────────────────
export const CreateLessonSchema = z.object({
  title:       z.string().min(2).max(300),
  classId:     z.string().length(24),
  order:       z.number().int().min(1),
  type:        z.enum(['video', 'worksheet', 'mixed']),
  description: z.string().optional(),
  coverImage:  z.string().nullable().optional(),
  isFree:      z.boolean().default(false),
})

export const UpdateLessonSchema = z.object({
  title:       z.string().min(2).max(300).optional(),
  order:       z.number().int().min(1).optional(),
  type:        z.enum(['video', 'worksheet', 'mixed']).optional(),
  description: z.string().optional(),
  coverImage:  z.string().nullable().optional(),
  isFree:      z.boolean().optional(),
})

// ── Pagination ─────────────────────────────────────────────────────────────
export const PaginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateCourseDto  = z.infer<typeof CreateCourseSchema>
export type UpdateCourseDto  = z.infer<typeof UpdateCourseSchema>
export type CreateSubjectDto = z.infer<typeof CreateSubjectSchema>
export type UpdateSubjectDto = z.infer<typeof UpdateSubjectSchema>
export type CreateClassDto   = z.infer<typeof CreateClassSchema>
export type UpdateClassDto   = z.infer<typeof UpdateClassSchema>
export type CreateLessonDto  = z.infer<typeof CreateLessonSchema>
export type UpdateLessonDto  = z.infer<typeof UpdateLessonSchema>
export type PaginationDto    = z.infer<typeof PaginationSchema>
