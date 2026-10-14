import { z } from 'zod'

/**
 * Student registration requires a canonical academic placement using validated
 * taxonomy ObjectIds. Free-text stage/grade strings are not accepted for new
 * students; they belong to the legacy migration layer only.
 */
export const RegisterStudentSchema = z.object({
  fullName:          z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').max(100),
  phones:            z.array(z.object({ number: z.string(), relation: z.string() })).optional(),
  stageId:           z.string().length(24, 'المرحلة الدراسية مطلوبة'),
  gradeId:           z.string().length(24, 'الصف الدراسي مطلوب'),
  trackId:           z.string().length(24).nullable().optional(),
  specializationId:  z.string().length(24).nullable().optional(),
})

export const RegisterAdminSchema = z.object({
  fullName: z.string().min(3).max(100),
  email:    z.string().email('بريد إلكتروني غير صالح'),
  permissions: z.record(z.object({ read: z.boolean(), edit: z.boolean() }))
})

export const UpdatePermissionsSchema = z.object({
  permissions: z.record(z.object({ read: z.boolean(), edit: z.boolean() }))
})

export const LoginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

export const UpdateProfileSchema = z.object({
  fullName:        z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').max(100).optional(),
  email:           z.string().email('بريد إلكتروني غير صالح').optional(),
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة').optional(),
  newPassword:     z.string().min(8, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل').optional(),
  phones:          z.array(z.object({ number: z.string(), relation: z.string() })).optional(),
})

export const ToggleAccountSchema = z.object({
  activate: z.boolean(),
})

export const UpdateFinanceSchema = z.object({
  isPaid: z.boolean(),
  paidPercentage: z.number().finite().min(0).max(100),
})

export type RegisterStudentDto = z.infer<typeof RegisterStudentSchema>
export type RegisterAdminDto   = z.infer<typeof RegisterAdminSchema>
export type LoginDto           = z.infer<typeof LoginSchema>
export type RefreshTokenDto    = z.infer<typeof RefreshTokenSchema>
export type UpdateProfileDto   = z.infer<typeof UpdateProfileSchema>
