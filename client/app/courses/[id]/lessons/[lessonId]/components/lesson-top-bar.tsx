'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from '@solar-icons/react/outline'
import { ListVideo, Maximize2, Minimize2 } from 'lucide-react'

interface LessonTopBarProps {
  courseId: string
  courseTitle: string
  unitTitle?: string
  lessonTitle: string
  totalLessons: number
  theaterMode: boolean
  onToggleTheaterMode: () => void
  autoplayNext: boolean
  onToggleAutoplay: () => void
  mobileView: 'video' | 'playlist'
  onSetMobileView: (view: 'video' | 'playlist') => void
}

export const LessonTopBar: React.FC<LessonTopBarProps> = ({
  courseId,
  courseTitle,
  unitTitle,
  lessonTitle,
  totalLessons,
  theaterMode,
  onToggleTheaterMode,
  autoplayNext,
  onToggleAutoplay,
  mobileView,
  onSetMobileView,
}) => {
  return (
    <div className="sticky top-16 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl px-4 sm:px-8 py-2.5">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground truncate">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors shrink-0 text-foreground font-semibold"
          >
            <ArrowRightIcon className="h-3.5 w-3.5" />
            <span>{courseTitle}</span>
          </Link>

          {unitTitle && (
            <>
              <span className="text-border">/</span>
              <span className="hidden md:inline truncate">{unitTitle}</span>
            </>
          )}

          <span className="text-border">/</span>
          <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-[320px]">
            {lessonTitle}
          </span>
        </div>

        {/* Controls: Mobile switcher, Theater mode & Autoplay toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Playlist Switcher */}
          <div className="lg:hidden flex items-center bg-muted/50 p-0.5 rounded-full text-xs font-medium border border-border/40">
            <button
              type="button"
              onClick={() => onSetMobileView('video')}
              className={`px-3 py-1 rounded-full transition-all ${
                mobileView === 'video'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              الفيديو
            </button>
            <button
              type="button"
              onClick={() => onSetMobileView('playlist')}
              className={`px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                mobileView === 'playlist'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              <ListVideo className="h-3.5 w-3.5" />
              <span>الفهرس ({totalLessons})</span>
            </button>
          </div>

          {/* Autoplay Toggle (Quiet Apple switch) */}
          <button
            type="button"
            onClick={onToggleAutoplay}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              autoplayNext
                ? 'border-border/60 bg-muted/60 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            title="تشغيل الدرس التالي تلقائياً عند انتهاء الفيديو"
          >
            <span>التشغيل التلقائي</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                autoplayNext ? 'bg-emerald-500' : 'bg-muted-foreground/40'
              }`}
            />
          </button>

          {/* Desktop Theater Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTheaterMode}
            className="hidden lg:inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={theaterMode ? 'عرض عادي' : 'وضع المسرح'}
          >
            {theaterMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
