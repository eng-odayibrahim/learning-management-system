'use client'

import React, { useState, useEffect, useRef, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { CurriculumTreeCourse, Lesson } from '@/lib/types'
import {
  getCourseProgress,
  toggleLessonCompleted,
  saveLessonTimestamp,
  getLessonTimestamp,
  setLastAccessedLesson,
} from '@/lib/course-progress'

// Modular components
import { LessonTopBar } from './components/lesson-top-bar'
import { GuestPreviewBanner, AccessErrorCard } from './components/lesson-access-guard'
import { LessonPlayer } from './components/lesson-player'
import { LessonActionBar } from './components/lesson-action-bar'
import { LessonDescriptionBox } from './components/lesson-description-box'
import { LessonTabsSection } from './components/lesson-tabs-section'
import { CoursePlaylistSidebar } from './components/course-playlist-sidebar'

export default function LessonClassroomPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const resolvedParams = use(params)
  const { id: courseId, lessonId } = resolvedParams

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Data states
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [curriculum, setCurriculum] = useState<CurriculumTreeCourse | null>(null)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [playbackLoading, setPlaybackLoading] = useState(false)
  const [playbackError, setPlaybackError] = useState<{ status?: number; message?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)

  // Layout & interaction states
  const [theaterMode, setTheaterMode] = useState(false)
  const [autoplayNext, setAutoplayNext] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [mobileView, setMobileView] = useState<'video' | 'playlist'>('video')

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Subscribe to course progress updates
  useEffect(() => {
    const p = getCourseProgress(courseId, user?.id)
    setCompletedLessonIds(p.completedLessonIds)

    const handleProgressUpdate = (e: any) => {
      if (e.detail?.courseId === courseId) {
        setCompletedLessonIds(e.detail.progress.completedLessonIds)
      }
    }
    window.addEventListener('course-progress-updated', handleProgressUpdate)
    return () => window.removeEventListener('course-progress-updated', handleProgressUpdate)
  }, [courseId, user?.id])

  // Load classroom and curriculum tree data
  useEffect(() => {
    loadClassroomData()
  }, [courseId, lessonId, user])

  // Auto-poll when video is processing/pending
  useEffect(() => {
    if (lesson?.videoStatus === 'processing' || lesson?.videoStatus === 'pending') {
      const interval = setInterval(async () => {
        try {
          const updated = await api.getLesson(lessonId)
          if (updated?.videoStatus === 'ready' || updated?.hasVideo) {
            setLesson(updated)
            setPlaybackLoading(true)
            try {
              const pb = await api.getLessonPlayback(lessonId)
              if (pb?.url) {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
                setPlaybackUrl(pb.url.startsWith('http') ? pb.url : `${apiBase}${pb.url}`)
                setPlaybackError(null)
              }
            } catch (pbErr: any) {
              setPlaybackError({
                status: pbErr?.status,
                message: pbErr?.message || 'تعذر تشغيل الفيديو',
              })
            } finally {
              setPlaybackLoading(false)
            }
            clearInterval(interval)
          }
        } catch (_) {}
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [lesson?.videoStatus, lessonId])

  // Clear countdown timer when switching lessons
  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCountdown(null)
  }, [lessonId])

  const loadClassroomData = async () => {
    setLoading(true)
    setError(null)
    setErrorStatus(null)
    setPlaybackUrl(null)
    setPlaybackError(null)

    try {
      const treeData = await api.getCurriculumTree(courseId)
      setCurriculum(treeData)
    } catch (treeErr) {
      console.warn('Failed to fetch tree data:', treeErr)
    }

    try {
      const lessonData = await api.getLesson(lessonId)
      setLesson(lessonData)

      // Record last accessed lesson
      setLastAccessedLesson(courseId, lessonId, lessonData.title, user?.id)

      if (lessonData.hasVideo || lessonData.videoStatus === 'ready') {
        setPlaybackLoading(true)
        try {
          const pb = await api.getLessonPlayback(lessonId)
          if (pb?.url) {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
            const fullUrl = pb.url.startsWith('http') ? pb.url : `${apiBase}${pb.url}`
            setPlaybackUrl(fullUrl)
            setPlaybackError(null)
          }
        } catch (pbErr: any) {
          console.warn('Playback URL fetch error:', pbErr?.message)
          setPlaybackError({
            status: pbErr?.status,
            message: pbErr?.message || 'تعذر جلب رابط تشغيل الفيديو.',
          })
        } finally {
          setPlaybackLoading(false)
        }
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ أثناء تحميل الدرس.')
      setErrorStatus(e.status || (e.message?.toLowerCase().includes('unauthor') ? 401 : null))
    } finally {
      setLoading(false)
    }
  }

  // Flattened lessons list with unit metadata
  const flattenedLessons = useMemo(() => {
    if (!curriculum?.subjects) return []
    const items: {
      lesson: Lesson
      subjectId: string
      subjectTitle: string
      classId: string
      classTitle: string
      globalIndex: number
    }[] = []

    let idx = 0
    for (const sub of curriculum.subjects) {
      for (const cls of sub.classes) {
        for (const l of cls.lessons || []) {
          items.push({
            lesson: l,
            subjectId: sub.subject.id,
            subjectTitle: sub.subject.title,
            classId: cls.classItem.id,
            classTitle: cls.classItem.title,
            globalIndex: idx++,
          })
        }
      }
    }
    return items
  }, [curriculum])

  // Navigation targets
  const currentItemIndex = flattenedLessons.findIndex((item) => item.lesson.id === lessonId)
  const prevLesson = currentItemIndex > 0 ? flattenedLessons[currentItemIndex - 1].lesson : null
  const nextLesson =
    currentItemIndex >= 0 && currentItemIndex < flattenedLessons.length - 1
      ? flattenedLessons[currentItemIndex + 1].lesson
      : null

  const firstLesson = flattenedLessons.length > 0 ? flattenedLessons[0].lesson : null

  // Current unit info (courseworks & quizzes)
  const currentUnitInfo = useMemo(() => {
    if (!curriculum?.subjects) return null
    for (const sub of curriculum.subjects) {
      const foundClass = sub.classes.find((c) =>
        c.lessons?.some((l) => l.id === lessonId)
      )
      if (foundClass) {
        return {
          subject: sub.subject,
          classItem: foundClass.classItem,
          courseworks: sub.courseworks || [],
          quizzes: foundClass.quizzes || [],
        }
      }
    }
    return null
  }, [curriculum, lessonId])

  // Permissions & access
  const hasAccess = !!user
  const isFirstLesson = currentItemIndex === 0
  const canViewCurrent = hasAccess || isFirstLesson || Boolean(lesson?.isFree)

  // Progress metrics
  const totalLessonsCount = flattenedLessons.length
  const completedCount = completedLessonIds.filter((id) =>
    flattenedLessons.some((item) => item.lesson.id === id)
  ).length
  const progressPercentage =
    totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0
  const isCurrentCompleted = completedLessonIds.includes(lessonId)

  // Handlers
  const handleToggleComplete = () => {
    toggleLessonCompleted(courseId, lessonId, user?.id)
  }

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (currentTime > 2) {
      saveLessonTimestamp(courseId, lessonId, currentTime, user?.id)
    }
    if (duration > 0 && currentTime / duration >= 0.9 && !isCurrentCompleted) {
      toggleLessonCompleted(courseId, lessonId, user?.id, true)
    }
  }

  const handleVideoEnded = () => {
    toggleLessonCompleted(courseId, lessonId, user?.id, true)

    if (autoplayNext && nextLesson) {
      setCountdown(5)
      let count = 5
      countdownIntervalRef.current = setInterval(() => {
        count -= 1
        if (count <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
          setCountdown(null)
          router.push(`/courses/${courseId}/lessons/${nextLesson.id}`)
        } else {
          setCountdown(count)
        }
      }, 1000)
    }
  }

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    setCountdown(null)
  }

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[75vh] p-8 bg-background pt-24">
        <div className="flex flex-col items-center gap-3 text-muted-foreground animate-pulse">
          <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-xs font-semibold">جاري فتح الدرس...</p>
        </div>
      </div>
    )
  }

  // Error / Access Guard state
  if (error || !lesson) {
    const isUnauthorized =
      !user ||
      errorStatus === 401 ||
      (error && (error.toLowerCase().includes('unauthor') || error.includes('تسجيل الدخول')))
    const isForbidden = errorStatus === 403 || (error && error.includes('مشتركين'))

    return (
      <AccessErrorCard
        courseId={courseId}
        lessonId={lessonId}
        isUnauthorized={Boolean(isUnauthorized)}
        isForbidden={Boolean(isForbidden)}
        error={error}
        firstLesson={firstLesson}
      />
    )
  }

  const initialResumeTime = getLessonTimestamp(courseId, lessonId, user?.id)

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20 pt-16">
      {/* ── 1. Top Bar ── */}
      <LessonTopBar
        courseId={courseId}
        courseTitle={curriculum?.title || 'المقرر'}
        unitTitle={currentUnitInfo?.subject.title}
        lessonTitle={lesson.title}
        totalLessons={totalLessonsCount}
        theaterMode={theaterMode}
        onToggleTheaterMode={() => setTheaterMode(!theaterMode)}
        autoplayNext={autoplayNext}
        onToggleAutoplay={() => setAutoplayNext(!autoplayNext)}
        mobileView={mobileView}
        onSetMobileView={setMobileView}
      />

      {/* ── 2. Guest Preview Notice ── */}
      {!user && <GuestPreviewBanner courseId={courseId} lessonId={lessonId} />}

      {/* ── 3. Main Stage: Two-Column / Theater Layout ── */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        <div
          className={`grid gap-6 lg:gap-8 items-start ${
            theaterMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
          }`}
        >
          {/* Main Video & Content Column */}
          <div
            className={`space-y-6 ${
              theaterMode
                ? 'w-full'
                : mobileView === 'playlist'
                ? 'hidden lg:block lg:col-span-8'
                : 'lg:col-span-8'
            }`}
          >
            {/* Video Player */}
            <LessonPlayer
              courseId={courseId}
              lesson={lesson}
              canViewCurrent={canViewCurrent}
              playbackLoading={playbackLoading}
              playbackUrl={playbackUrl}
              playbackError={playbackError}
              countdown={countdown}
              nextLesson={nextLesson}
              initialResumeTime={initialResumeTime}
              onTimeUpdate={handleTimeUpdate}
              onVideoEnded={handleVideoEnded}
              onCancelCountdown={cancelCountdown}
              onRetryPlayback={loadClassroomData}
            />

            {/* Title & Action Bar */}
            <LessonActionBar
              courseId={courseId}
              lesson={lesson}
              isCurrentCompleted={isCurrentCompleted}
              onToggleComplete={handleToggleComplete}
              prevLesson={prevLesson}
              nextLesson={nextLesson}
              copiedLink={copiedLink}
              onCopyLink={handleCopyLink}
            />

            {/* Description / Summary Box (if present) */}
            <LessonDescriptionBox
              lesson={lesson}
              unitTitle={currentUnitInfo?.subject.title}
            />

            {/* Materials & Quizzes Section (if present) */}
            <LessonTabsSection
              courseId={courseId}
              hasAccess={hasAccess}
              unitTitle={currentUnitInfo?.subject.title}
              courseworks={currentUnitInfo?.courseworks || []}
              quizzes={currentUnitInfo?.quizzes || []}
            />
          </div>

          {/* Up Next & Syllabus Sidebar */}
          <div
            className={`space-y-4 ${
              theaterMode
                ? 'w-full'
                : mobileView === 'video'
                ? 'hidden lg:block lg:col-span-4'
                : 'lg:col-span-4'
            }`}
          >
            <div className="lg:sticky lg:top-24 space-y-4">
              <CoursePlaylistSidebar
                courseId={courseId}
                lessonId={lessonId}
                curriculum={curriculum}
                flattenedLessons={flattenedLessons}
                hasAccess={hasAccess}
                completedLessonIds={completedLessonIds}
                progressPercentage={progressPercentage}
                completedCount={completedCount}
                totalLessonsCount={totalLessonsCount}
                currentItemIndex={currentItemIndex}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}