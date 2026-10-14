'use client'

import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { Lesson, CurriculumTreeCourse } from '@/lib/types'
import { ChevronDown, ChevronUp, Check, Play } from 'lucide-react'
import { LockIcon, VideoFrame2Icon } from '@solar-icons/react/outline'

interface CoursePlaylistSidebarProps {
  courseId: string
  lessonId: string
  curriculum: CurriculumTreeCourse | null
  flattenedLessons: {
    lesson: Lesson
    subjectId: string
    subjectTitle: string
    classId: string
    classTitle: string
    globalIndex: number
  }[]
  hasAccess: boolean
  completedLessonIds: string[]
  progressPercentage: number
  completedCount: number
  totalLessonsCount: number
  currentItemIndex: number
}

export const CoursePlaylistSidebar: React.FC<CoursePlaylistSidebarProps> = ({
  courseId,
  lessonId,
  curriculum,
  flattenedLessons,
  hasAccess,
  completedLessonIds,
  progressPercentage,
  completedCount,
  totalLessonsCount,
  currentItemIndex,
}) => {
  const activeLessonRef = useRef<HTMLDivElement | null>(null)
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({})

  // Auto-expand current unit on mount or lesson change
  useEffect(() => {
    if (curriculum?.subjects) {
      const initialExpanded: Record<string, boolean> = {}
      curriculum.subjects.forEach(({ subject, classes }) => {
        const hasCurrentLesson = classes.some((c) =>
          c.lessons?.some((l) => l.id === lessonId)
        )
        initialExpanded[subject.id] = hasCurrentLesson
      })
      setExpandedUnits((prev) => ({ ...initialExpanded, ...prev }))
    }
  }, [curriculum, lessonId])

  // Scroll active playlist item into view
  useEffect(() => {
    if (activeLessonRef.current) {
      activeLessonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [lessonId, curriculum])

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }))
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl overflow-hidden text-right">
      {/* ── Playlist Header (Apple TV style) ── */}
      <div className="p-4 border-b border-border/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground truncate">
            {curriculum?.title || 'فهرس المقرر'}
          </h3>
          <span className="text-[11px] font-medium text-muted-foreground shrink-0">
            {currentItemIndex + 1} / {totalLessonsCount}
          </span>
        </div>

        {/* Quiet Hairline Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>الدروس المكتملة</span>
            <span>{completedCount} من {totalLessonsCount} ({progressPercentage}%)</span>
          </div>
          <Progress value={progressPercentage} className="h-1 rounded-full bg-muted/60" />
        </div>
      </div>

      {/* ── Scrollable Unit & Lesson Rows ── */}
      <div className="max-h-[calc(100vh-260px)] overflow-y-auto divide-y divide-border/20">
        {curriculum?.subjects?.map(({ subject, classes }, sIdx) => {
          const isExpanded = expandedUnits[subject.id] ?? true
          const unitLessons = classes.flatMap((c) => c.lessons || [])
          const unitCompletedCount = unitLessons.filter((l) =>
            completedLessonIds.includes(l.id)
          ).length

          return (
            <div key={subject.id}>
              {/* Unit Header */}
              <button
                type="button"
                onClick={() => toggleUnit(subject.id)}
                className="w-full flex items-center justify-between p-3 px-4 hover:bg-muted/40 transition-colors text-right select-none"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {subject.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    ({unitCompletedCount}/{unitLessons.length})
                  </span>
                </div>

                <div className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground">
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
              </button>

              {/* Lessons in Unit */}
              {isExpanded && (
                <div className="p-1.5 space-y-0.5">
                  {unitLessons.map((l) => {
                    const isCurrent = l.id === lessonId
                    const isLessonFirst =
                      flattenedLessons.findIndex((i) => i.lesson.id === l.id) === 0
                    const canViewLesson = hasAccess || l.isFree || isLessonFirst
                    const isCompleted = completedLessonIds.includes(l.id)
                    const lessonDurationMins = l.videoDuration
                      ? Math.floor(l.videoDuration / 60)
                      : null

                    return (
                      <div
                        key={l.id}
                        ref={isCurrent ? activeLessonRef : null}
                      >
                        {canViewLesson ? (
                          <Link
                            href={`/courses/${courseId}/lessons/${l.id}`}
                            className={`group flex items-center justify-between gap-3 p-2 rounded-xl text-xs transition-colors ${
                              isCurrent
                                ? 'bg-muted/80 text-foreground font-semibold shadow-2xs'
                                : 'hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {/* Right: Status/Order + Thumbnail + Title */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Status Icon */}
                              <div className="w-4 shrink-0 text-center">
                                {isCurrent ? (
                                  <div className="h-2 w-2 rounded-full bg-primary mx-auto animate-pulse" />
                                ) : isCompleted ? (
                                  <Check className="h-3 w-3 text-emerald-600 stroke-[3] mx-auto" />
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/60">
                                    {l.order}
                                  </span>
                                )}
                              </div>

                              {/* Mini Thumbnail */}
                              <div className="relative shrink-0 w-12 aspect-video rounded-md overflow-hidden bg-neutral-900 ring-1 ring-border/20 flex items-center justify-center">
                                {l.coverImage ? (
                                  <img
                                    src={l.coverImage}
                                    alt={l.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <VideoFrame2Icon className="h-3 w-3 text-muted-foreground" />
                                )}

                                {isCurrent && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Play className="h-2.5 w-2.5 text-white fill-current" />
                                  </div>
                                )}
                              </div>

                              {/* Title */}
                              <span className="truncate text-xs">
                                {l.title}
                              </span>
                            </div>

                            {/* Left: Duration or Free Badge */}
                            <div className="shrink-0 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              {l.isFree && !hasAccess && (
                                <span className="text-emerald-600 font-medium">مجاني</span>
                              )}
                              {lessonDurationMins && <span>{lessonDurationMins}د</span>}
                            </div>
                          </Link>
                        ) : (
                          <div
                            className="flex items-center justify-between gap-3 p-2 rounded-xl text-xs text-muted-foreground/50 opacity-60 cursor-not-allowed"
                            title="متاح للمشتركين فقط"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-4 text-[10px] text-center">{l.order}</span>
                              <div className="shrink-0 w-12 aspect-video rounded-md bg-muted/60 flex items-center justify-center">
                                <LockIcon className="h-3 w-3 text-muted-foreground/40" />
                              </div>
                              <span className="truncate text-xs">{l.title}</span>
                            </div>

                            <LockIcon className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
