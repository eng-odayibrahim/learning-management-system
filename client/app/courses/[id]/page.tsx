'use client'

import React, { useState, useEffect, use, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { Course, CurriculumTreeCourse, Lesson, AcademicStage } from '@/lib/types'
import { Progress } from '@/components/ui/progress'
import { WHATSAPP_REGISTER_URL } from '@/lib/whatsapp'
import { getCourseProgress } from '@/lib/course-progress'

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookBookmarkIcon,
  CheckCircleIcon,
  ClockCircleIcon,
  DangerCircleIcon,
  DownloadSquareIcon,
  LayersIcon,
  LockIcon,
  PlayCircleIcon,
  VideoFrame2Icon,
} from '@solar-icons/react/outline'

import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Play,
  Share2,
} from 'lucide-react'

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const courseId = resolvedParams.id

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [course, setCourse] = useState<Course | null>(null)
  const [curriculum, setCurriculum] = useState<CurriculumTreeCourse | null>(null)
  const [stages, setStages] = useState<AcademicStage[]>([])
  const [loading, setLoading] = useState(true)

  // Segmented control state: 'curriculum' | 'materials' | 'quizzes'
  const [activeTab, setActiveTab] = useState<'curriculum' | 'materials' | 'quizzes'>('curriculum')
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({})
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [lastLessonId, setLastLessonId] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Load progress
  useEffect(() => {
    const progress = getCourseProgress(courseId, user?.id)
    setCompletedLessonIds(progress.completedLessonIds)
    setLastLessonId(progress.lastLessonId || null)

    const handleProgressUpdate = (e: any) => {
      if (e.detail?.courseId === courseId) {
        setCompletedLessonIds(e.detail.progress.completedLessonIds)
        setLastLessonId(e.detail.progress.lastLessonId || null)
      }
    }
    window.addEventListener('course-progress-updated', handleProgressUpdate)
    return () => window.removeEventListener('course-progress-updated', handleProgressUpdate)
  }, [courseId, user?.id])

  useEffect(() => {
    loadCourseData()
  }, [courseId, user])

  const loadCourseData = async () => {
    setLoading(true)
    try {
      const [courseData, treeData, stagesData] = await Promise.all([
        api.getCourse(courseId),
        api.getCurriculumTree(courseId),
        api.getStages(false).catch(() => []),
      ])
      setCourse(courseData)
      setCurriculum(treeData)
      setStages(stagesData || [])

      // Expand all units by default for effortless scanning
      if (treeData?.subjects) {
        const initExpanded: Record<string, boolean> = {}
        treeData.subjects.forEach((s) => {
          initExpanded[s.subject.id] = true
        })
        setExpandedUnits(initExpanded)
      }
    } catch (e) {
      // Error handling handled in render
    } finally {
      setLoading(false)
    }
  }

  // Flattened list of lessons for quick lookup
  const flattenedLessons = useMemo(() => {
    if (!curriculum?.subjects) return []
    const list: { lesson: Lesson; subjectTitle: string; unitIndex: number }[] = []
    curriculum.subjects.forEach((sub, sIdx) => {
      sub.classes.forEach((cls) => {
        ;(cls.lessons || []).forEach((l) => {
          list.push({ lesson: l, subjectTitle: sub.subject.title, unitIndex: sIdx + 1 })
        })
      })
    })
    return list
  }, [curriculum])

  // Aggregate materials and quizzes
  const allCourseworks = useMemo(() => {
    if (!curriculum?.subjects) return []
    return curriculum.subjects.flatMap((sub) =>
      (sub.courseworks || []).map((cw) => ({ ...cw, unitTitle: sub.subject.title }))
    )
  }, [curriculum])

  const allQuizzes = useMemo(() => {
    if (!curriculum?.subjects) return []
    return curriculum.subjects.flatMap((sub) =>
      sub.classes.flatMap((cls) =>
        (cls.quizzes || []).map((q) => ({ ...q, unitTitle: sub.subject.title }))
      )
    )
  }, [curriculum])

  // Total duration in minutes / hours
  const totalDurationMinutes = useMemo(() => {
    const totalSecs = flattenedLessons.reduce((acc, item) => acc + (item.lesson.videoDuration || 0), 0)
    return Math.round(totalSecs / 60)
  }, [flattenedLessons])

  // Formatted duration string (e.g., "ساعتان و 15 دقيقة" or "45 دقيقة")
  const formattedDuration = useMemo(() => {
    if (totalDurationMinutes <= 0) return null
    if (totalDurationMinutes < 60) return `${totalDurationMinutes} دقيقة`
    const hours = Math.floor(totalDurationMinutes / 60)
    const mins = totalDurationMinutes % 60
    return mins > 0 ? `${hours} س و ${mins} د` : `${hours} ساعة`
  }, [totalDurationMinutes])

  // First lesson for starting or previewing
  const firstLesson = flattenedLessons.length > 0 ? flattenedLessons[0].lesson : null

  // Resume target lesson
  const resumeLesson = useMemo(() => {
    if (lastLessonId) {
      const match = flattenedLessons.find((item) => item.lesson.id === lastLessonId)
      if (match) return match.lesson
    }
    const nextUncompleted = flattenedLessons.find(
      (item) => !completedLessonIds.includes(item.lesson.id)
    )
    if (nextUncompleted) return nextUncompleted.lesson
    return firstLesson
  }, [lastLessonId, flattenedLessons, completedLessonIds, firstLesson])

  // Progress metrics
  const totalLessons = flattenedLessons.length
  const completedCount = completedLessonIds.filter((id) =>
    flattenedLessons.some((item) => item.lesson.id === id)
  ).length
  const progressPercentage =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }))
  }

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[75vh] p-8 bg-background pt-24">
        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
          <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground tracking-wide">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!course || !curriculum) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 min-h-[70vh] bg-background pt-24 text-center">
        <div className="max-w-md p-8 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-4">
          <DangerCircleIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">المقرر غير متوفر</h2>
          <p className="text-xs text-muted-foreground">
            تعذر العثور على هذا المقرر الدراسي أو تم نقله.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline pt-2"
          >
            <ArrowRightIcon className="h-3.5 w-3.5" /> العودة لكافة المقررات
          </Link>
        </div>
      </div>
    )
  }

  const hasAccess = !!user
  const stageInfo = course.stageId ? stages.find((s) => s.id === course.stageId) : null

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20 pt-20 sm:pt-24">
      {/* ── Sub-navigation / Back link ── */}
      <div className="border-b border-border/40 bg-background/60 backdrop-blur-xl px-6 sm:px-10 lg:px-16 py-3 sticky top-16 z-20">
        <div className="mx-auto max-w-6xl flex items-center justify-between text-xs font-medium text-muted-foreground">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            <span>المقررات الدراسية</span>
          </Link>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded-full hover:bg-muted/60"
            title="مشاركة رابط المقرر"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>{copiedLink ? 'تم النسخ' : 'مشاركة'}</span>
          </button>
        </div>
      </div>

      {/* ── Hero: Apple Minimalist Cinematic Layout ── */}
      <section className="pt-8 sm:pt-14 pb-8 sm:pb-12">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Right in RTL (Text & Actions) */}
            <div className="lg:col-span-7 space-y-6 text-right">
              {/* Category / Stage Eyebrow */}
              {stageInfo && (
                <div className="text-xs font-semibold tracking-wider text-muted-foreground">
                  {stageInfo.name}
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                {course.title}
              </h1>

              {/* Description */}
              {course.description && (
                <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed max-w-xl">
                  {course.description}
                </p>
              )}

              {/* Clean Inline Stats (Apple Style middle dot separators) */}
              <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground pt-1">
                <span>{curriculum.subjects?.length || 0} وحدات</span>
                <span className="text-border">·</span>
                <span>{totalLessons} درساً</span>
                {formattedDuration && (
                  <>
                    <span className="text-border">·</span>
                    <span>{formattedDuration}</span>
                  </>
                )}
              </div>

              {/* Action Buttons & Integrated Progress Bar */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  {resumeLesson ? (
                    <Link
                      href={`/courses/${course.id}/lessons/${resumeLesson.id}`}
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>{completedCount > 0 ? 'متابعة الدرس' : 'بدء المقرر'}</span>
                    </Link>
                  ) : firstLesson ? (
                    <Link
                      href={`/courses/${course.id}/lessons/${firstLesson.id}`}
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>بدء الدرس الأول</span>
                    </Link>
                  ) : null}

                  {!hasAccess && (
                    <a
                      href={WHATSAPP_REGISTER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium border border-border/80 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      تفعيل الاشتراك
                    </a>
                  )}
                </div>

                {/* Subtle Inline Progress (Apple Fitness style) */}
                {totalLessons > 0 && completedCount > 0 && (
                  <div className="max-w-xs space-y-1.5 pt-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>إنجاز المشاهدة</span>
                      <span className="font-semibold text-foreground">
                        {completedCount} من {totalLessons} ({progressPercentage}%)
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-1.5 rounded-full bg-muted/60" />
                  </div>
                )}
              </div>
            </div>

            {/* Left in RTL (Cinematic Video / Media Frame) */}
            <div className="lg:col-span-5">
              <div className="relative group rounded-3xl overflow-hidden aspect-video bg-neutral-950 ring-1 ring-border/20 shadow-2xl flex items-center justify-center">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <VideoFrame2Icon className="h-10 w-10 stroke-1" />
                  </div>
                )}

                {/* Play Button Overlay */}
                {firstLesson && (
                  <Link
                    href={`/courses/${course.id}/lessons/${resumeLesson?.id || firstLesson.id}`}
                    className="absolute inset-0 bg-black/25 backdrop-blur-[1px] hover:bg-black/35 transition-colors flex items-center justify-center group"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-black shadow-xl transition-transform group-hover:scale-110 active:scale-95">
                      <Play className="h-6 w-6 fill-current ml-0.5" />
                    </div>
                  </Link>
                )}

                {!hasAccess && (
                  <div className="absolute top-3.5 right-3.5 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium px-3 py-1 rounded-full border border-white/10">
                    معاينة مجانية
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Segmented Control (Apple Style Pills) ── */}
      <section className="mt-4 sm:mt-8 border-t border-border/40 pt-8 sm:pt-10">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 lg:px-16">
          <div className="flex items-center justify-start gap-1 p-1 bg-muted/40 rounded-full w-fit border border-border/40">
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'curriculum'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              الدروس ({totalLessons})
            </button>

            {allCourseworks.length > 0 && (
              <button
                onClick={() => setActiveTab('materials')}
                className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'materials'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                المرفقات ({allCourseworks.length})
              </button>
            )}

            {allQuizzes.length > 0 && (
              <button
                onClick={() => setActiveTab('quizzes')}
                className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'quizzes'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                الاختبارات ({allQuizzes.length})
              </button>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════
              TAB 1: CURRICULUM (Apple Music / Apple Podcasts Style Playlist)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'curriculum' && (
            <div className="mt-8 space-y-10">
              {(!curriculum.subjects || curriculum.subjects.length === 0) ? (
                <div className="text-center py-16 text-muted-foreground text-xs">
                  لا توجد دروس مضافة لهذا المقرر حتى الآن.
                </div>
              ) : (
                curriculum.subjects.map(({ subject, classes }, sIdx) => {
                  const isExpanded = expandedUnits[subject.id] ?? true
                  const unitLessons = classes.flatMap((c) => c.lessons || [])
                  const unitCompleted = unitLessons.filter((l) =>
                    completedLessonIds.includes(l.id)
                  ).length

                  return (
                    <div key={subject.id} className="space-y-3">
                      {/* Chapter / Unit Header */}
                      <button
                        type="button"
                        onClick={() => toggleUnit(subject.id)}
                        className="w-full flex items-center justify-between py-2 text-right group select-none"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {String(sIdx + 1).padStart(2, '0')}
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                            {subject.title}
                          </h3>
                          <span className="text-xs text-muted-foreground font-normal">
                            ({unitLessons.length} دروس)
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {unitCompleted > 0 && (
                            <span className="text-[11px] font-medium hidden sm:inline">
                              {unitCompleted}/{unitLessons.length} مكتمل
                            </span>
                          )}
                          <div className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </button>

                      {/* Lesson Rows List (Apple Minimalist Table / Row Style) */}
                      {isExpanded && (
                        <div className="divide-y divide-border/30 rounded-2xl border border-border/40 overflow-hidden bg-card/30">
                          {unitLessons.length === 0 ? (
                            <div className="p-6 text-center text-xs text-muted-foreground">
                              لا توجد دروس في هذه الوحدة حالياً.
                            </div>
                          ) : (
                            unitLessons.map((lesson, lIdx) => {
                              const isFirst = lesson.id === firstLesson?.id
                              const canView = hasAccess || isFirst || lesson.isFree
                              const isCompleted = completedLessonIds.includes(lesson.id)
                              const lessonDurationMins = lesson.videoDuration
                                ? Math.floor(lesson.videoDuration / 60)
                                : null

                              return (
                                <Link
                                  key={lesson.id}
                                  href={
                                    canView
                                      ? `/courses/${course.id}/lessons/${lesson.id}`
                                      : `/login?callbackUrl=/courses/${course.id}/lessons/${lesson.id}`
                                  }
                                  className={`group flex items-center justify-between gap-4 p-3.5 sm:p-4 transition-colors ${
                                    canView
                                      ? 'hover:bg-muted/50 cursor-pointer'
                                      : 'opacity-60 hover:bg-muted/30 cursor-pointer'
                                  }`}
                                >
                                  {/* Right side in RTL: Order, Thumbnail, Title */}
                                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                                    {/* Number / Status Icon */}
                                    <div className="w-6 shrink-0 text-center">
                                      {isCompleted ? (
                                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                                          <Check className="h-3 w-3 stroke-[3]" />
                                        </div>
                                      ) : (
                                        <span className="text-xs font-mono font-medium text-muted-foreground group-hover:text-foreground">
                                          {String(lIdx + 1).padStart(2, '0')}
                                        </span>
                                      )}
                                    </div>

                                    {/* Compact 16:9 Thumbnail preview */}
                                    <div className="relative shrink-0 w-16 sm:w-20 aspect-video rounded-lg overflow-hidden bg-neutral-900 ring-1 ring-border/20 flex items-center justify-center">
                                      {lesson.coverImage ? (
                                        <img
                                          src={lesson.coverImage}
                                          alt={lesson.title}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                          <VideoFrame2Icon className="h-4 w-4" />
                                        </div>
                                      )}

                                      {/* Play overlay on hover */}
                                      {canView && (
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <Play className="h-3.5 w-3.5 text-white fill-current" />
                                        </div>
                                      )}

                                      {!canView && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                          <LockIcon className="h-3 w-3 text-neutral-300" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Title & Metadata */}
                                    <div className="min-w-0 space-y-0.5 text-right">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                          {lesson.title}
                                        </h4>
                                        {(lesson.isFree || isFirst) && !hasAccess && (
                                          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                                            معاينة
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Left side in RTL: Duration & Action indicator */}
                                  <div className="flex items-center gap-3 shrink-0 text-xs font-medium text-muted-foreground">
                                    {lessonDurationMins && (
                                      <span>{lessonDurationMins} د</span>
                                    )}

                                    {canView ? (
                                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-background transition-colors">
                                        <ArrowLeftIcon className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                                      </div>
                                    ) : (
                                      <LockIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
                                    )}
                                  </div>
                                </Link>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 2: MATERIALS (Clean Apple Document Rows)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'materials' && (
            <div className="mt-8 space-y-3">
              {allCourseworks.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-xs">
                  لا توجد مذكرات أو ملفات مرفقة بهذا المقرر.
                </div>
              ) : (
                <div className="divide-y divide-border/30 rounded-2xl border border-border/40 overflow-hidden bg-card/30">
                  {allCourseworks.map((cw) => (
                    <div
                      key={cw.id}
                      className="flex items-center justify-between p-4 sm:p-5 text-right"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {cw.unitTitle}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground">{cw.title}</h4>
                        {cw.description && (
                          <p className="text-xs text-muted-foreground max-w-lg">{cw.description}</p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {hasAccess ? (
                          <div className="flex items-center gap-2">
                            {cw.materialKeys?.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border/80 hover:bg-muted transition-colors text-foreground"
                              >
                                <DownloadSquareIcon className="h-3.5 w-3.5 text-primary" />
                                <span>تحميل {cw.materialKeys.length > 1 ? i + 1 : ''}</span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <LockIcon className="h-3 w-3" /> متاح للمشتركين
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TAB 3: QUIZZES (Clean Apple Assessment Rows)
             ════════════════════════════════════════════════════════════ */}
          {activeTab === 'quizzes' && (
            <div className="mt-8 space-y-3">
              {allQuizzes.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-xs">
                  لا توجد اختبارات مضافة لهذا المقرر حتى الآن.
                </div>
              ) : (
                <div className="divide-y divide-border/30 rounded-2xl border border-border/40 overflow-hidden bg-card/30">
                  {allQuizzes.map((quiz) => (
                    <div
                      key={quiz._id || quiz.id}
                      className="flex items-center justify-between p-4 sm:p-5 text-right"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {quiz.unitTitle}
                        </span>
                        <h4 className="text-sm font-bold text-foreground">{quiz.title}</h4>
                        {quiz.description && (
                          <p className="text-xs text-muted-foreground max-w-lg">{quiz.description}</p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {hasAccess ? (
                          <Link
                            href={`/courses/${course.id}/quiz/${quiz._id || quiz.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                          >
                            <span>بدء الاختبار</span>
                            <ArrowLeftIcon className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <LockIcon className="h-3 w-3" /> متاح للمشتركين
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
