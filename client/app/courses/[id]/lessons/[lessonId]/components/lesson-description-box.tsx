'use client'

import React from 'react'
import { Lesson } from '@/lib/types'
import { DownloadSquareIcon } from '@solar-icons/react/outline'

interface LessonDescriptionBoxProps {
  lesson: Lesson
  unitTitle?: string
}

export const LessonDescriptionBox: React.FC<LessonDescriptionBoxProps> = ({
  lesson,
}) => {
  const hasDescription = Boolean(lesson.description?.trim())
  const hasMaterials = Boolean(lesson.materialKeys && lesson.materialKeys.length > 0)

  if (!hasDescription && !hasMaterials) {
    return null
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-4 text-right">
      {hasDescription && (
        <p className="text-sm text-muted-foreground leading-relaxed font-normal whitespace-pre-line">
          {lesson.description}
        </p>
      )}

      {hasMaterials && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
          <span className="text-xs font-medium text-muted-foreground ml-1">
            مرفقات الدرس:
          </span>
          {lesson.materialKeys?.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border/60 hover:bg-muted/60 transition-colors text-foreground"
            >
              <DownloadSquareIcon className="h-3 w-3 text-primary" />
              <span>ملف {lesson.materialKeys && lesson.materialKeys.length > 1 ? i + 1 : ''}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
