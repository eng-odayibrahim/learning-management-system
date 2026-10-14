'use client'
import { CheckCircleIcon, RefreshIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { Lesson, CurriculumTreeCourse } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

import { ImageUploadWidget } from '@/components/shared/image-upload-widget'

const VideoUploadForm = dynamic(() => import('@/components/shared/video-upload-form'), {
  ssr: false,
  loading: () => <div className="p-4 animate-pulse bg-muted/50 rounded-xl text-center text-xs font-bold text-muted-foreground border border-border">جاري تحميل أداة رفع ومعالجة الفيديو (HLS Transcoder)...</div>
})

interface CreateLessonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  curriculumTree: CurriculumTreeCourse | null
  initialSubjectId?: string
}

export function CreateLessonModal({
  open,
  onOpenChange,
  onSuccess,
  curriculumTree,
  initialSubjectId
}: CreateLessonModalProps) {
  const [targetSubjectId, setTargetSubjectId] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDesc, setLessonDesc] = useState('')
  const [lessonCoverImage, setLessonCoverImage] = useState('')
  const [createdLesson, setCreatedLesson] = useState<Lesson | null>(null)
  const [submittingLesson, setSubmittingLesson] = useState(false)

  useEffect(() => {
    if (open) {
      if (initialSubjectId) {
        setTargetSubjectId(initialSubjectId)
      } else if (curriculumTree?.subjects && curriculumTree.subjects.length > 0) {
        setTargetSubjectId(curriculumTree.subjects[0].subject.id)
      }
    }
  }, [open, initialSubjectId, curriculumTree])

  const resetModal = () => {
    setLessonTitle('')
    setLessonDesc('')
    setLessonCoverImage('')
    setCreatedLesson(null)
    onOpenChange(false)
  }

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetSubjectId) return
    setSubmittingLesson(true)
    try {
      const subjectData = curriculumTree?.subjects?.find(s => s.subject.id === targetSubjectId)
      const subjectName = subjectData?.subject.title || 'وحدة'

      const existingClasses = subjectData?.classes || []
      let classId: string
      if (existingClasses.length > 0) {
        classId = existingClasses[0].classItem.id
      } else {
        const newClass = await api.createClass({
          title: subjectName,
          subjectId: targetSubjectId,
          order: 10
        })
        classId = newClass.id
      }

      const newLesson = await api.createLesson({
        title: lessonTitle.trim(),
        classId,
        order: (subjectData?.classes?.reduce((sum, c) => sum + c.lessons.length, 0) || 0) + 1,
        type: 'video',
        description: lessonDesc.trim() || undefined,
        isFree: false,
      })

      if (lessonCoverImage) {
        await api.updateLesson(newLesson.id, { coverImage: lessonCoverImage }).catch(() => { })
      }

      setCreatedLesson(newLesson)
      onSuccess()
    } catch (err: any) {
      alert(err.message || 'خطأ في إنشاء الدرس')
    } finally {
      setSubmittingLesson(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) resetModal()
      else onOpenChange(v)
    }}>
      <DialogContent className="max-w-md p-5 bg-card border border-border shadow-none rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg font-black text-right text-foreground">إضافة درس جديد</DialogTitle>
          <DialogDescription className="text-right text-[11px] leading-tight mt-1 text-muted-foreground">
            أدخل بيانات الدرس، وسينقلك لخطوة رفع الفيديو.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-0">
          {!createdLesson ? (
            <form onSubmit={handleCreateLesson} className="space-y-3 text-right">
              <div className="space-y-1">
                <Label className="font-bold text-xs text-foreground">الوحدة الدراسية</Label>
                <select
                  value={targetSubjectId}
                  onChange={(e) => setTargetSubjectId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border h-9 bg-card text-foreground px-3 text-xs font-bold"
                >
                  <option value="" disabled>-- اختر الوحدة --</option>
                  {curriculumTree?.subjects?.map(s => (
                    <option key={s.subject.id} value={s.subject.id}>{s.subject.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-xs text-foreground">عنوان الدرس</Label>
                <Input
                  placeholder="مثال: الدرس الأول"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  required
                  className="text-right font-bold h-9 text-sm"
                />
              </div>

              <ImageUploadWidget
                label="صورة غلاف الدرس (اختياري)"
                folder="lesson-covers"
                value={lessonCoverImage}
                onChange={setLessonCoverImage}
                compact={true}
              />

              <Button type="submit" disabled={submittingLesson} className="w-full font-bold text-xs h-9 mt-2 rounded-full shadow-none">
                {submittingLesson ? <RefreshIcon className="h-4 w-4 animate-spin" /> : 'حفظ والانتقال لرفع الفيديو'}
              </Button>
            </form>
          ) : (
            <div className="space-y-3 text-right">
              <div className="flex items-center justify-between bg-primary/10 p-2 rounded-xl mb-2">
                <span className="font-bold text-xs text-primary flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" /> تم الحفظ
                </span>
                <span className="text-xs font-bold line-clamp-1 text-foreground">{createdLesson.title}</span>
              </div>

              <div className="bg-muted/50 rounded-xl p-2 border border-border">
                <VideoUploadForm
                  lessonId={createdLesson.id}
                  onSuccess={onSuccess}
                />
              </div>

              <Button variant="outline" size="sm" className="w-full font-bold h-8 text-xs mt-1 rounded-full" onClick={resetModal}>
                تم، أغلق النافذة
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
