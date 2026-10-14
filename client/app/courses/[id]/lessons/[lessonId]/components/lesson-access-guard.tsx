'use client'

import React from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LockIcon, PlayCircleIcon, ArrowRightIcon, DangerCircleIcon } from '@solar-icons/react/outline'
import { WHATSAPP_REGISTER_URL } from '@/lib/whatsapp'
import { Lesson } from '@/lib/types'

interface GuestPreviewBannerProps {
  courseId: string
  lessonId: string
}

export const GuestPreviewBanner: React.FC<GuestPreviewBannerProps> = ({ courseId, lessonId }) => {
  return (
    <div className="border-b border-border/40 bg-muted/40 backdrop-blur-md px-4 sm:px-8 py-2 text-xs">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-right">
        <p className="font-medium text-muted-foreground">
          أنت تشاهد المعاينة المجانية. سجل دخولك لحفظ تقدمك والوصول لكامل المذكرات والاختبارات.
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/login?callbackUrl=/courses/${courseId}/lessons/${lessonId}`}
            className="px-3.5 py-1 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            تسجيل الدخول
          </Link>
          <a
            href={WHATSAPP_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-full text-xs font-medium border border-border/80 text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          >
            تفعيل الاشتراك
          </a>
        </div>
      </div>
    </div>
  )
}

interface AccessErrorCardProps {
  courseId: string
  lessonId: string
  isUnauthorized: boolean
  isForbidden: boolean
  error: string | null
  firstLesson: Lesson | null
}

export const AccessErrorCard: React.FC<AccessErrorCardProps> = ({
  courseId,
  lessonId,
  isUnauthorized,
  isForbidden,
  error,
  firstLesson,
}) => {
  if (isUnauthorized) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 text-center min-h-[75vh] bg-background pt-20 sm:pt-24">
        <div className="max-w-md w-full p-8 sm:p-10 space-y-6 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <LockIcon className="h-8 w-8" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              تسجيل الدخول مطلوب
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              هذا الدرس متاح للطلاب المسجلين. يرجى تسجيل الدخول بحسابك لمتابعة المحاضرة.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href={`/login?callbackUrl=/courses/${courseId}/lessons/${lessonId}`}
              className="w-full py-2.5 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              تسجيل الدخول
            </Link>

            <a
              href={WHATSAPP_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-full text-xs font-medium border border-border/80 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
            >
              إنشاء حساب جديد
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (isForbidden) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 text-center min-h-[75vh] bg-background pt-20 sm:pt-24">
        <div className="max-w-md w-full p-8 sm:p-10 space-y-6 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <LockIcon className="h-8 w-8" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              المحتوى متاح للمشتركين
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              يرجى تفعيل اشتراكك في هذا المقرر لمتابعة كافة الدروس والواجبات.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            {firstLesson && firstLesson.id !== lessonId && (
              <Link
                href={`/courses/${courseId}/lessons/${firstLesson.id}`}
                className="w-full py-2.5 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <PlayCircleIcon className="h-4 w-4" />
                <span>مشاهدة الدرس الأول مجاناً</span>
              </Link>
            )}

            <a
              href={WHATSAPP_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-full text-xs font-semibold bg-[#25D366] text-white hover:bg-[#1EBE5D] transition-colors flex items-center justify-center gap-1.5"
            >
              تفعيل الاشتراك عبر واتساب
            </a>

            <Link
              href={`/courses/${courseId}`}
              className="text-xs font-medium text-muted-foreground hover:text-foreground pt-1"
            >
              العودة إلى صفحة المقرر
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center min-h-[70vh] bg-background pt-20 sm:pt-24">
      <div className="max-w-md p-8 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl space-y-4">
        <DangerCircleIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-bold text-foreground">تعذر عرض هذا الدرس</h2>
        <p className="text-xs text-muted-foreground">
          {error || 'الدرس غير متاح حالياً أو تم تغيير مساره.'}
        </p>
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2"
        >
          <ArrowRightIcon className="h-3.5 w-3.5" /> العودة إلى المقرر
        </Link>
      </div>
    </div>
  )
}
