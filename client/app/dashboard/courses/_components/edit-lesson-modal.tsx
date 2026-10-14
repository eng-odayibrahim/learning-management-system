'use client'
import { RefreshIcon, VideoLibraryIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { Lesson } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { ImageUploadWidget } from '@/components/shared/image-upload-widget'

const VideoUploadForm = dynamic(() => import('@/components/shared/video-upload-form'), {
  ssr: false,
  loading: () => <div className="p-4 animate-pulse bg-muted/50 rounded-xl text-center text-xs font-bold text-muted-foreground border border-border">جاري تحميل أداة رفع ومعالجة الفيديو (HLS Transcoder)...</div>
})

interface EditLessonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  lesson: Lesson | null
}

export function EditLessonModal({
  open,
  onOpenChange,
  onSuccess,
  lesson
}: EditLessonModalProps) {
  const [editLessonTitle, setEditLessonTitle] = useState('')
  const [editLessonDesc, setEditLessonDesc] = useState('')
  const [editLessonCoverImage, setEditLessonCoverImage] = useState('')
  const [updatingLesson, setUpdatingLesson] = useState(false)

  useEffect(() => {
    if (open && lesson) {
      setEditLessonTitle(lesson.title || '')
      setEditLessonDesc(lesson.description || '')
      setEditLessonCoverImage(lesson.coverImage || '')
    }
  }, [open, lesson])

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lesson) return
    setUpdatingLesson(true)
    try {
      await api.updateLesson(lesson.id, {
        title: editLessonTitle.trim(),
        description: editLessonDesc.trim() || undefined,
        coverImage: editLessonCoverImage,
      })
      onSuccess()
      alert('تم حفظ البيانات بنجاح')
    } catch (err: any) {
      alert(err.message || 'خطأ في تحديث الدرس')
    } finally {
      setUpdatingLesson(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 bg-card border border-border shadow-none rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg font-black text-right text-foreground">تعديل الدرس</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-right">
          <form onSubmit={handleUpdateLesson} className="space-y-3">
            <div className="space-y-1">
              <Label className="font-bold text-xs text-foreground">عنوان الدرس</Label>
              <Input
                value={editLessonTitle}
                onChange={(e) => setEditLessonTitle(e.target.value)}
                required
                className="text-right font-bold h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-xs text-foreground">وصف الدرس</Label>
              <Textarea
                value={editLessonDesc}
                onChange={(e) => setEditLessonDesc(e.target.value)}
                className="text-right text-xs resize-none h-14"
              />
            </div>

            <ImageUploadWidget
              label="صورة الغلاف"
              folder="lesson-covers"
              value={editLessonCoverImage}
              onChange={setEditLessonCoverImage}
              compact={true}
            />

            <Button type="submit" disabled={updatingLesson} className="w-full font-bold text-xs h-9 rounded-full shadow-none">
              {updatingLesson ? <RefreshIcon className="h-3 w-3 animate-spin" /> : 'حفظ التعديلات'}
            </Button>
          </form>

          {lesson && (
            <div className="pt-3 border-t border-border">
              <Label className="font-bold text-xs mb-2 text-muted-foreground flex items-center gap-1">
                <VideoLibraryIcon className="h-3.5 w-3.5" /> إعادة رفع الفيديو (اختياري)
              </Label>
              <div className="bg-muted/50 border border-border rounded-xl p-2">
                <VideoUploadForm
                  lessonId={lesson.id}
                  onSuccess={onSuccess}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
