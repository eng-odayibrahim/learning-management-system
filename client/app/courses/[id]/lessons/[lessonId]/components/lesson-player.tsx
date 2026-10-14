'use client'

import React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Lesson } from '@/lib/types'
import { WHATSAPP_REGISTER_URL } from '@/lib/whatsapp'
import {
  LockIcon,
  PlayCircleIcon,
  ArrowLeftIcon,
} from '@solar-icons/react/outline'
import { Play } from 'lucide-react'

const HlsVideoPlayer = dynamic(() => import('@/components/shared/hls-video-player'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video w-full animate-pulse rounded-2xl sm:rounded-3xl bg-neutral-950 flex flex-col items-center justify-center gap-2 text-neutral-500">
      <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <span className="text-xs font-medium">جاري تجهيز الفيديو...</span>
    </div>
  ),
})

interface LessonPlayerProps {
  courseId: string
  lesson: Lesson
  canViewCurrent: boolean
  playbackLoading: boolean
  playbackUrl: string | null
  playbackError: { status?: number; message?: string } | null
  countdown: number | null
  nextLesson: Lesson | null
  initialResumeTime: number
  onTimeUpdate: (currentTime: number, duration: number) => void
  onVideoEnded: () => void
  onCancelCountdown: () => void
  onRetryPlayback: () => void
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({
  courseId,
  lesson,
  canViewCurrent,
  playbackLoading,
  playbackUrl,
  playbackError,
  countdown,
  nextLesson,
  initialResumeTime,
  onTimeUpdate,
  onVideoEnded,
  onCancelCountdown,
  onRetryPlayback,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-black ring-1 ring-border/20 shadow-2xl">
      {/* ── Autoplay Next Countdown Overlay (Apple TV style) ── */}
      {countdown !== null && nextLesson && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/85 backdrop-blur-xl p-6 text-center text-white animate-in fade-in duration-300">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold tracking-wider text-neutral-400">
              التالي خلال {countdown} ثوانٍ
            </p>
            <h3 className="text-lg sm:text-xl font-bold max-w-md line-clamp-1">
              {nextLesson.title}
            </h3>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <Link
              href={`/courses/${courseId}/lessons/${nextLesson.id}`}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-colors"
            >
              <span>تشغيل الآن</span>
              <ArrowLeftIcon className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={onCancelCountdown}
              className="px-4 py-2 rounded-full text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ── Player Stage States ── */}
      {!canViewCurrent ? (
        <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center bg-card/60 gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <LockIcon className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">الدرس مخصص للمشتركين</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              يرجى تسجيل الدخول بحسابك أو تفعيل الاشتراك لمتابعة الشرح.
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <Link
              href={`/login?callbackUrl=/courses/${courseId}/lessons/${lesson.id}`}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              تسجيل الدخول
            </Link>
            <a
              href={WHATSAPP_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-full text-xs font-medium border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              تفعيل الاشتراك
            </a>
          </div>
        </div>
      ) : playbackLoading ? (
        <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center bg-neutral-950 text-neutral-400 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-xs font-medium">جاري تجهيز مشغل الفيديو...</p>
        </div>
      ) : playbackUrl ? (
        <HlsVideoPlayer
          src={playbackUrl}
          poster={lesson.coverImage}
          autoPlay={true}
          initialTime={initialResumeTime}
          onTimeUpdate={onTimeUpdate}
          onEnded={onVideoEnded}
          className="aspect-video w-full"
        />
      ) : playbackError ? (
        <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center bg-card/60 gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <LockIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              {playbackError.status === 401
                ? 'يرجى تسجيل الدخول'
                : playbackError.status === 403
                ? 'المحتوى متاح للمشتركين فقط'
                : 'تعذر تشغيل الفيديو'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {playbackError.status === 401
                ? 'يجب تسجيل الدخول بحسابك لمشاهدة الفيديو.'
                : playbackError.status === 403
                ? 'هذا الدرس مخصص للمشتركين في المقرر.'
                : playbackError.message || 'يرجى المحاولة مرة أخرى لاحقاً.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onRetryPlayback}
            className="mt-1 px-4 py-1.5 rounded-full text-xs font-medium border border-border/80 hover:bg-muted/50 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="aspect-video w-full flex flex-col items-center justify-center p-8 text-center bg-neutral-950 text-neutral-400 gap-2">
          <Play className="h-8 w-8 opacity-40" />
          <p className="text-xs">الفيديو غير متوفر حالياً</p>
        </div>
      )}
    </div>
  )
}
