'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Coursework, QuizForStudent } from '@/lib/types'
import {
  DownloadSquareIcon,
  PlayCircleIcon,
  LockIcon,
} from '@solar-icons/react/outline'

interface LessonTabsSectionProps {
  courseId: string
  hasAccess: boolean
  unitTitle?: string
  courseworks: Coursework[]
  quizzes: QuizForStudent[]
}

export const LessonTabsSection: React.FC<LessonTabsSectionProps> = ({
  courseId,
  hasAccess,
  unitTitle,
  courseworks,
  quizzes,
}) => {
  const hasCourseworks = courseworks.length > 0
  const hasQuizzes = quizzes.length > 0

  if (!hasCourseworks && !hasQuizzes) {
    return null
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Unit Materials / Courseworks */}
      {hasCourseworks && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground text-right">
            مرفقات {unitTitle || 'الوحدة'} ({courseworks.length})
          </div>

          <div className="divide-y divide-border/30 rounded-2xl border border-border/40 overflow-hidden bg-card/30">
            {courseworks.map((cw) => (
              <div
                key={cw.id}
                className="flex items-center justify-between p-3.5 sm:p-4 text-right"
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-semibold text-foreground">{cw.title}</h4>
                  {cw.description && (
                    <p className="text-[11px] text-muted-foreground">{cw.description}</p>
                  )}
                </div>

                <div className="shrink-0">
                  {hasAccess ? (
                    <div className="flex items-center gap-2">
                      {cw.materialKeys.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border/60 hover:bg-muted/60 transition-colors text-foreground"
                        >
                          <DownloadSquareIcon className="h-3 w-3 text-primary" />
                          <span>تحميل {cw.materialKeys.length > 1 ? i + 1 : ''}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <LockIcon className="h-3 w-3" /> متاح للمشتركين
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unit Quizzes */}
      {hasQuizzes && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground text-right">
            اختبارات {unitTitle || 'الوحدة'} ({quizzes.length})
          </div>

          <div className="divide-y divide-border/30 rounded-2xl border border-border/40 overflow-hidden bg-card/30">
            {quizzes.map((quiz) => (
              <div
                key={quiz._id || quiz.id}
                className="flex items-center justify-between p-3.5 sm:p-4 text-right"
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-semibold text-foreground">{quiz.title}</h4>
                  {quiz.description && (
                    <p className="text-[11px] text-muted-foreground">{quiz.description}</p>
                  )}
                </div>

                <div className="shrink-0">
                  {hasAccess ? (
                    <Link
                      href={`/courses/${courseId}/quiz/${quiz._id || quiz.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
                    >
                      <span>بدء الاختبار</span>
                      <PlayCircleIcon className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                      <LockIcon className="h-3 w-3" /> متاح للمشتركين
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
