import mongoose from 'mongoose'
import { CourseModel, CourseDocument } from '@learning/infrastructure/persistence/CourseModel'
import { LessonModel, LessonDocument } from '@learning/infrastructure/persistence/LessonModel'
import { ClassModel } from '@learning/infrastructure/persistence/ClassModel'
import { SubjectModel } from '@learning/infrastructure/persistence/SubjectModel'
import { EnrollmentModel } from '@learning/infrastructure/persistence/EnrollmentModel'
import { UserModel } from '@identity/infrastructure/persistence/UserModel'
import { GradeModel, TrackModel, SpecializationModel } from '@learning/infrastructure/persistence/TaxonomyModels'
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@shared/errors/AppError'

/** Minimal actor shape (satisfied by req.user). */
export interface PolicyActor {
  sub: string
  role: string
  isSuperAdmin?: boolean
  permissions?: Record<string, { read: boolean; edit: boolean }>
}

/**
 * Plug-in point for P2 (enrollment / payment / revocation).
 * P0 has no entitlement domain, so the default grants nothing.
 */
export interface EntitlementProvider {
  hasCourseAccess(userId: string, courseId: string): Promise<boolean>
}

export const EnrollmentEntitlements: EntitlementProvider = {
  hasCourseAccess: async (userId, courseId) => Boolean(await EnrollmentModel.exists({ studentId: userId, courseId, status: { $in: ['ACTIVE', 'COMPLETED'] } })),
}

let entitlements: EntitlementProvider = EnrollmentEntitlements
export function setEntitlementProvider(provider: EntitlementProvider): void {
  entitlements = provider
}

export function isValidObjectId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id) && mongoose.isValidObjectId(id)
}

export function canManageCourses(actor?: PolicyActor): boolean {
  if (!actor || actor.role !== 'admin') return false
  return actor.isSuperAdmin === true || actor.permissions?.courses?.edit === true
}

export function canReadCourseAdminData(actor?: PolicyActor): boolean {
  if (!actor || actor.role !== 'admin') return false
  return actor.isSuperAdmin === true || actor.permissions?.courses?.read === true || actor.permissions?.courses?.edit === true
}

function courseIsPublic(course: Pick<CourseDocument, 'status' | 'isPublished' | 'isActive'>): boolean {
  const status = course.status ?? (course.isPublished ? 'published' : 'draft')
  return status === 'published' && course.isActive !== false
}

function lessonIsPublic(lesson: Pick<LessonDocument, 'status' | 'isPublished' | 'isActive'>): boolean {
  const status = lesson.status ?? (lesson.isPublished ? 'published' : 'draft')
  return status === 'published' && lesson.isActive !== false
}

export const CourseAccessPolicy = {
  /** Can the actor see this course's metadata/tree? Hidden courses look non-existent. */
  assertCanView(course: CourseDocument | null, actor?: PolicyActor): CourseDocument {
    if (!course) throw new NotFoundError('Course')
    if (canReadCourseAdminData(actor)) return course
    if (!courseIsPublic(course)) throw new NotFoundError('Course')
    return course
  },

  async loadForView(courseId: string, actor?: PolicyActor): Promise<CourseDocument> {
    if (!isValidObjectId(courseId)) throw new NotFoundError('Course')
    const course = await CourseModel.findById(courseId)
    const visible = this.assertCanView(course, actor)
    if (actor?.role === 'student' && !(await this.isAcademicallyEligible(visible, actor))) throw new NotFoundError('Course')
    if (actor?.role === 'student' && (visible.price ?? 0) > 0 && !(await this.hasEntitlement(visible._id.toString(), actor))) {
      throw new ForbiddenError('You do not have access to this course')
    }
    return visible
  },

  /** Resolve placement from the authenticated database record and compare explicit academic IDs. */
  async isAcademicallyEligible(course: CourseDocument, actor?: PolicyActor): Promise<boolean> {
    if (!actor || actor.role !== 'student') return true
    const student = await UserModel.findOne({ _id: actor.sub, role: 'student', isActive: true })
      .select('academicStageId academicGradeId academicTrackId academicSpecializationId').lean()
    if (!student?.academicStageId || !student.academicGradeId) return false
    if (!course.stageId || !course.gradeId || !course.stageId.equals(student.academicStageId) || !course.gradeId.equals(student.academicGradeId)) return false
    const grade = await GradeModel.findById(student.academicGradeId).select('stageId isActive').lean()
    if (!grade?.isActive || !grade.stageId?.equals(student.academicStageId)) return false
    const trackIds = (course.trackIds ?? []).map(String)
    if (course.trackId) trackIds.push(String(course.trackId))
    if (trackIds.length && (!student.academicTrackId || !trackIds.includes(String(student.academicTrackId)))) return false
    if (student.academicTrackId) {
      const track = await TrackModel.findById(student.academicTrackId).select('gradeIds isActive').lean()
      if (!track?.isActive || (track.gradeIds?.length && !track.gradeIds.some((id) => id.equals(student.academicGradeId!)))) return false
    }
    const specializationIds = (course.specializationIds ?? []).map(String)
    if (course.specializationId) specializationIds.push(String(course.specializationId))
    if (specializationIds.length && (!student.academicSpecializationId || !specializationIds.includes(String(student.academicSpecializationId)))) return false
    if (student.academicSpecializationId) {
      const specialization = await SpecializationModel.findById(student.academicSpecializationId).select('trackIds isActive').lean()
      if (!specialization?.isActive || (specialization.trackIds?.length && (!student.academicTrackId || !specialization.trackIds.some((id) => id.equals(student.academicTrackId!))))) return false
    }
    return true
  },

  async eligibleCourseIds(actor?: PolicyActor): Promise<string[] | undefined> {
    if (!actor || actor.role !== 'student') return undefined
    const docs = await CourseModel.find({ status: 'published', isPublished: true, isActive: true })
      .select('_id stageId gradeId trackId trackIds specializationId specializationIds price').lean()
    const eligible: string[] = []
    for (const course of docs) {
      if (!(await this.isAcademicallyEligible(course as unknown as CourseDocument, actor))) continue
      if ((course.price ?? 0) > 0 && !(await this.hasEntitlement(String(course._id), actor))) continue
      eligible.push(String(course._id))
    }
    return eligible
  },

  /** Entitlement check for non-free content. */
  async hasEntitlement(courseId: string, actor?: PolicyActor): Promise<boolean> {
    if (!actor) return false
    if (canManageCourses(actor) || canReadCourseAdminData(actor)) return true
    return entitlements.hasCourseAccess(actor.sub, courseId)
  },
}

export interface ResolvedLesson {
  lesson: LessonDocument
  course: CourseDocument
}

export const LessonAccessPolicy = {
  /** Resolve lesson -> class -> subject -> course using real DB relationships. */
  async resolve(lessonId: string): Promise<ResolvedLesson> {
    if (!isValidObjectId(lessonId)) throw new NotFoundError('Lesson')
    const lesson = await LessonModel.findById(lessonId)
    if (!lesson) throw new NotFoundError('Lesson')
    const cls = await ClassModel.findById(lesson.classId)
    const subject = cls ? await SubjectModel.findById(cls.subjectId) : null
    const course = subject ? await CourseModel.findById(subject.courseId) : null
    if (!cls || !subject || !course) throw new NotFoundError('Lesson')
    return { lesson, course }
  },

  /** Checks if this lesson is the first published lesson in the course (by subject, class, lesson order). */
  async isFirstLessonOfCourse(lesson: LessonDocument, course: CourseDocument): Promise<boolean> {
    const subjects = await SubjectModel.find({ courseId: course._id, isActive: true })
      .sort({ order: 1 })
      .select('_id')
      .lean()
    if (!subjects.length) return false

    for (const sub of subjects) {
      const classes = await ClassModel.find({ subjectId: sub._id, isActive: true })
        .sort({ order: 1 })
        .select('_id')
        .lean()
      for (const cls of classes) {
        const firstLesson = await LessonModel.findOne({
          classId: cls._id,
          isActive: true,
          isPublished: true,
        })
          .sort({ order: 1 })
          .select('_id')
          .lean()
        if (firstLesson) {
          return firstLesson._id.toString() === lesson._id.toString()
        }
      }
    }
    return false
  },

  /** Determines if a lesson can be viewed as a free preview by anyone (guest or non-enrolled user). */
  async isFreePreview(lesson: LessonDocument, course: CourseDocument): Promise<boolean> {
    if (lesson.isFree) return true
    return this.isFirstLessonOfCourse(lesson, course)
  },

  /** Throws unless the actor may open this lesson's content. */
  async authorize(lessonId: string, actor?: PolicyActor): Promise<ResolvedLesson> {
    const resolved = await this.resolve(lessonId)
    const { lesson, course } = resolved

    if (actor && canReadCourseAdminData(actor)) return resolved

    if (!courseIsPublic(course) || !lessonIsPublic(lesson)) throw new NotFoundError('Lesson')

    // First lesson of each course or explicit isFree lessons are available for preview to anyone (guests and registered)
    const isPreview = await this.isFreePreview(lesson, course)
    if (isPreview) {
      return resolved
    }

    // All lessons beyond the preview require the user to be registered and logged in
    if (!actor) {
      throw new UnauthorizedError('يجب تسجيل الدخول لمشاهدة هذا الدرس')
    }

    // Free content is still scoped to the student's official placement.
    if (actor.role === 'student' && !(await CourseAccessPolicy.isAcademicallyEligible(course, actor))) {
      throw new NotFoundError('Lesson')
    }

    if ((course.price ?? 0) <= 0) return resolved

    if (await CourseAccessPolicy.hasEntitlement(course._id.toString(), actor)) return resolved
    throw new ForbiddenError('هذا الدرس متاح فقط للطلاب المشتركين في هذا المقرر')
  },
}

export const MediaAccessPolicy = {
  /** Authorize and return the lesson whose private HLS media may be streamed. */
  async authorizeLessonVideo(lessonId: string, actor?: PolicyActor): Promise<ResolvedLesson> {
    const resolved = await LessonAccessPolicy.authorize(lessonId, actor)
    if (resolved.lesson.videoStatus !== 'ready' || !resolved.lesson.hlsKey) {
      throw new NotFoundError('Video')
    }
    return resolved
  },

  /** Management actions (upload, status of processing) require course edit permission. */
  assertCanManageMedia(actor?: PolicyActor): void {
    if (!actor) throw new UnauthorizedError()
    if (!canManageCourses(actor)) throw new ForbiddenError('You do not have permission to manage media')
  },
}
