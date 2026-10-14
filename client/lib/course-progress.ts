/**
 * Course and Lesson Progress Tracker
 * Manages real client-side watch progress, completed lessons, and video timestamps
 * persisting in localStorage, scoped by student user ID and course ID.
 */

export interface CourseProgressRecord {
  courseId: string
  userId?: string
  completedLessonIds: string[]
  lastLessonId?: string
  lastLessonTitle?: string
  lessonTimestamps: Record<string, number> // lessonId -> seconds
  updatedAt: string
}

function getStorageKey(courseId: string, userId?: string): string {
  const userPrefix = userId ? `u_${userId}_` : 'guest_'
  return `athar_progress_${userPrefix}${courseId}`
}

function safeGetStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function getCourseProgress(courseId: string, userId?: string): CourseProgressRecord {
  const storage = safeGetStorage()
  if (!storage) {
    return {
      courseId,
      userId,
      completedLessonIds: [],
      lessonTimestamps: {},
      updatedAt: new Date().toISOString(),
    }
  }

  try {
    const raw = storage.getItem(getStorageKey(courseId, userId))
    if (!raw) {
      return {
        courseId,
        userId,
        completedLessonIds: [],
        lessonTimestamps: {},
        updatedAt: new Date().toISOString(),
      }
    }
    const parsed = JSON.parse(raw)
    return {
      courseId,
      userId,
      completedLessonIds: Array.isArray(parsed.completedLessonIds) ? parsed.completedLessonIds : [],
      lastLessonId: parsed.lastLessonId,
      lastLessonTitle: parsed.lastLessonTitle,
      lessonTimestamps: parsed.lessonTimestamps || {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return {
      courseId,
      userId,
      completedLessonIds: [],
      lessonTimestamps: {},
      updatedAt: new Date().toISOString(),
    }
  }
}

export function saveCourseProgress(record: CourseProgressRecord): void {
  const storage = safeGetStorage()
  if (!storage) return
  try {
    storage.setItem(getStorageKey(record.courseId, record.userId), JSON.stringify(record))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('course-progress-updated', {
          detail: { courseId: record.courseId, userId: record.userId, progress: record },
        })
      )
    }
  } catch (err) {
    console.warn('Failed to save course progress:', err)
  }
}

export function isLessonCompleted(courseId: string, lessonId: string, userId?: string): boolean {
  const progress = getCourseProgress(courseId, userId)
  return progress.completedLessonIds.includes(lessonId)
}

export function toggleLessonCompleted(
  courseId: string,
  lessonId: string,
  userId?: string,
  forceStatus?: boolean
): boolean {
  const progress = getCourseProgress(courseId, userId)
  const isCurrentlyCompleted = progress.completedLessonIds.includes(lessonId)
  const shouldBeCompleted = forceStatus !== undefined ? forceStatus : !isCurrentlyCompleted

  let newCompleted: string[]
  if (shouldBeCompleted) {
    newCompleted = Array.from(new Set([...progress.completedLessonIds, lessonId]))
  } else {
    newCompleted = progress.completedLessonIds.filter((id) => id !== lessonId)
  }

  const updated: CourseProgressRecord = {
    ...progress,
    completedLessonIds: newCompleted,
    updatedAt: new Date().toISOString(),
  }

  saveCourseProgress(updated)
  return shouldBeCompleted
}

export function saveLessonTimestamp(
  courseId: string,
  lessonId: string,
  currentTime: number,
  userId?: string
): void {
  if (currentTime < 2) return // Don't record negligible time
  const progress = getCourseProgress(courseId, userId)
  const updated: CourseProgressRecord = {
    ...progress,
    lessonTimestamps: {
      ...progress.lessonTimestamps,
      [lessonId]: Math.floor(currentTime),
    },
    updatedAt: new Date().toISOString(),
  }
  saveCourseProgress(updated)
}

export function getLessonTimestamp(
  courseId: string,
  lessonId: string,
  userId?: string
): number {
  const progress = getCourseProgress(courseId, userId)
  return progress.lessonTimestamps[lessonId] || 0
}

export function setLastAccessedLesson(
  courseId: string,
  lessonId: string,
  lessonTitle?: string,
  userId?: string
): void {
  const progress = getCourseProgress(courseId, userId)
  const updated: CourseProgressRecord = {
    ...progress,
    lastLessonId: lessonId,
    lastLessonTitle: lessonTitle || progress.lastLessonTitle,
    updatedAt: new Date().toISOString(),
  }
  saveCourseProgress(updated)
}
