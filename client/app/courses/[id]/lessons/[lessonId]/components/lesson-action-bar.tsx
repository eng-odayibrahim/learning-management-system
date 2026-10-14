'use client'

import React from 'react'
import Link from 'next/link'
import { Lesson } from '@/lib/types'
import { ArrowLeftIcon, ArrowRightIcon } from '@solar-icons/react/outline'
import { Check, Share2 } from 'lucide-react'

interface LessonActionBarProps {
  courseId: string
  lesson: Lesson
  isCurrentCompleted: boolean
  onToggleComplete: () => void
  prevLesson: Lesson | null
  nextLesson: Lesson | null
  copiedLink: boolean
  onCopyLink: () => void
}

export const LessonActionBar: React.FC<LessonActionBarProps> = ({
  courseId,
  lesson,
  isCurrentCompleted,
  onToggleComplete,
  prevLesson,
  nextLesson,
  copiedLink,
  onCopyLink,
}) => {
  const durationMins = lesson.videoDuration ? Math.floor(lesson.videoDuration / 60) : null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
      {/* Title & Quiet Metadata */}
      <div className="space-y-1.5 text-right">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-snug">
          {lesson.title}
        </h1>

        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>الدرس {lesson.order}</span>
          {durationMins && (
            <>
              <span className="text-border">·</span>
              <span>{durationMins} دقيقة</span>
            </>
          )}
          {lesson.isFree && (
            <>
              <span className="text-border">·</span>
              <span className="text-emerald-600 font-semibold">معاينة مجانية</span>
            </>
          )}
        </div>
      </div>

      {/* Primary Actions: Complete Toggle & Navigation */}
      <div className="flex items-center flex-wrap gap-2.5 shrink-0">
        {/* Apple Style "Mark Completed" Button */}
        <button
          type="button"
          onClick={onToggleComplete}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            isCurrentCompleted
              ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
              : 'border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full flex items-center justify-center transition-colors ${
              isCurrentCompleted
                ? 'bg-emerald-600 text-white'
                : 'border border-muted-foreground/40'
            }`}
          >
            {isCurrentCompleted && <Check className="h-2.5 w-2.5 stroke-[3]" />}
          </div>
          <span>{isCurrentCompleted ? 'مكتمل' : 'تحديد كمكتمل'}</span>
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={onCopyLink}
          className="h-8 w-8 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="مشاركة رابط الدرس"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="sr-only">{copiedLink ? 'تم النسخ' : 'مشاركة'}</span>
        </button>

        {/* Previous / Next Lesson Navigation Pills */}
        <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-full border border-border/40">
          {prevLesson ? (
            <Link
              href={`/courses/${courseId}/lessons/${prevLesson.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              title={prevLesson.title}
            >
              <ArrowRightIcon className="h-3 w-3" />
              <span>السابق</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground/40 cursor-not-allowed">
              <ArrowRightIcon className="h-3 w-3" />
              <span>السابق</span>
            </span>
          )}

          {nextLesson ? (
            <Link
              href={`/courses/${courseId}/lessons/${nextLesson.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
              title={nextLesson.title}
            >
              <span>التالي</span>
              <ArrowLeftIcon className="h-3 w-3" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground/40 cursor-not-allowed">
              <span>التالي</span>
              <ArrowLeftIcon className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
