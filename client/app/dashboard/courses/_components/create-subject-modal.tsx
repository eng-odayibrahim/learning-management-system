'use client'

import React, { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface CreateSubjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  courseId: string
  order: number
}

export function CreateSubjectModal({
  open,
  onOpenChange,
  onSuccess,
  courseId,
  order
}: CreateSubjectModalProps) {
  const [subjectTitle, setSubjectTitle] = useState('')
  const [subjectDesc, setSubjectDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.createSubject({
        title: subjectTitle.trim(),
        description: subjectDesc.trim() || undefined,
        courseId: courseId,
        order: order
      })
      onSuccess()
      setSubjectTitle('')
      setSubjectDesc('')
    } catch (err: any) {
      alert(err.message || 'خطأ في إضافة الوحدة')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v)
      if (!v) {
        setSubjectTitle('')
        setSubjectDesc('')
      }
    }}>
      <DialogContent className="max-w-md p-5 bg-card border border-border shadow-none rounded-2xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg font-black text-foreground">إضافة وحدة دراسية جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateSubject} className="space-y-3 pt-1">
          <div className="space-y-1 text-right">
            <Label className="font-bold text-xs text-foreground">عنوان الوحدة</Label>
            <Input
              placeholder="مثال: الوحدة الأولى - المقدمة"
              value={subjectTitle}
              onChange={(e) => setSubjectTitle(e.target.value)}
              required
              className="text-right font-bold h-9"
            />
          </div>
          <div className="space-y-1 text-right">
            <Label className="font-bold text-xs text-foreground">وصف الوحدة (اختياري)</Label>
            <Textarea
              placeholder="نبذة بسيطة عما سيتعلمه الطالب..."
              value={subjectDesc}
              onChange={(e) => setSubjectDesc(e.target.value)}
              className="text-right text-xs resize-none h-16"
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full font-bold h-9 text-xs rounded-full shadow-none">
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ وإضافة الوحدة'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
