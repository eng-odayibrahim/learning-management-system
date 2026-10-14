'use client'

import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { CurriculumTreeCourse, CategoryNode, AcademicStage, Grade, Track, Specialization } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageUploadWidget } from '@/components/shared/image-upload-widget'

interface EditCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  courseId: string
  curriculumTree: CurriculumTreeCourse | null
  stages: AcademicStage[]
  grades: Grade[]
  tracks: Track[]
  specializations: Specialization[]
}

export function EditCourseModal({
  open,
  onOpenChange,
  onSuccess,
  courseId,
  curriculumTree,
  stages,
  grades,
  tracks,
  specializations
}: EditCourseModalProps) {
  const [editCourseData, setEditCourseData] = useState({
    title: '', description: '', stageId: '', gradeId: '', trackIds: [] as string[], specializationIds: [] as string[], thumbnail: ''
  })
  const [updatingCourse, setUpdatingCourse] = useState(false)

  useEffect(() => {
    if (open && curriculumTree) {
      setEditCourseData({
        title: curriculumTree.title,
        description: curriculumTree.description || '',
        stageId: curriculumTree.stageId || '',
        gradeId: curriculumTree.gradeId || '',
        trackIds: curriculumTree.trackIds?.length ? curriculumTree.trackIds : (curriculumTree.trackId ? [curriculumTree.trackId] : []),
        specializationIds: curriculumTree.specializationIds?.length ? curriculumTree.specializationIds : (curriculumTree.specializationId ? [curriculumTree.specializationId] : []),
        thumbnail: curriculumTree.thumbnail || ''
      })
    }
  }, [open, curriculumTree])

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCourseData.stageId || !editCourseData.gradeId) {
      alert('يرجى تحديد المرحلة والصف الدراسي قبل حفظ المقرر')
      return
    }
    setUpdatingCourse(true)
    try {
      await api.updateCourse(courseId, {
        title: editCourseData.title.trim(),
        description: editCourseData.description.trim() || undefined,
        stageId: editCourseData.stageId || null,
        gradeId: editCourseData.gradeId || null,
        trackIds: editCourseData.trackIds,
        specializationIds: editCourseData.specializationIds,
        thumbnail: editCourseData.thumbnail || null
      } as any)
      
      onSuccess()
    } catch (err: any) {
      alert(err.message || 'خطأ في تحديث المقرر')
    } finally {
      setUpdatingCourse(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5 bg-card border border-border shadow-none rounded-2xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-lg font-black text-foreground">تعديل بيانات المقرر</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdateCourse} className="space-y-3 pt-1">
          <div className="space-y-1 text-right">
            <Label className="font-bold text-xs text-foreground">عنوان المقرر</Label>
            <Input
              value={editCourseData.title}
              onChange={(e) => setEditCourseData({ ...editCourseData, title: e.target.value })}
              required
              className="text-right font-bold h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-right">
            <div className="space-y-1">
              <Label className="font-bold text-[10px] text-foreground">المرحلة الدراسية (مطلوبة)</Label>
              <select
                value={editCourseData.stageId}
                onChange={(e) => setEditCourseData({ ...editCourseData, stageId: e.target.value, gradeId: '', trackIds: [], specializationIds: [] })}
                className="w-full h-8 px-2 rounded-xl border border-border bg-card text-foreground text-xs font-semibold"
              >
                <option value="">اختر المرحلة</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="font-bold text-[10px] text-foreground">الصف الدراسي (مطلوب)</Label>
              {(() => {
                const availableGrades = grades.filter((g) => !editCourseData.stageId || g.stageId === editCourseData.stageId)
                return (
                  <select
                    value={editCourseData.gradeId}
                    disabled={!editCourseData.stageId}
                    onChange={(e) => setEditCourseData({ ...editCourseData, gradeId: e.target.value, trackIds: [], specializationIds: [] })}
                    className="w-full h-8 px-2 rounded-xl border border-border bg-card text-foreground text-xs font-semibold disabled:opacity-50"
                  >
                    <option value="">
                      {!editCourseData.stageId
                        ? 'اختر المرحلة أولاً'
                        : availableGrades.length === 0
                          ? 'لا توجد صفوف مضافة لهذه المرحلة'
                          : 'اختر الصف'}
                    </option>
                    {availableGrades.map((g) => {
                      const stage = stages.find((s) => s.id === g.stageId)
                      return (
                        <option key={g.id} value={g.id}>
                          الصف {g.name} {stage ? `(${stage.name})` : ''}
                        </option>
                      )
                    })}
                  </select>
                )
              })()}
            </div>
            <div className="col-span-2 rounded-xl border border-border p-3 space-y-2">
              <Label className="font-bold text-[10px] text-foreground">المسارات التي ينطبق عليها المقرر</Label>
              <p className="text-[10px] text-muted-foreground">اتركها دون تحديد ليكون المقرر مشتركاً بين جميع المسارات الصالحة.</p>
              {tracks.filter((t) => !editCourseData.gradeId || !t.gradeIds?.length || t.gradeIds.includes(editCourseData.gradeId)).map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={editCourseData.trackIds.includes(t.id)} onChange={(e) => setEditCourseData({ ...editCourseData, trackIds: e.target.checked ? [...editCourseData.trackIds, t.id] : editCourseData.trackIds.filter((id) => id !== t.id), specializationIds: [] })} />{t.name}
                </label>
              ))}
            </div>
            <div className="col-span-2 rounded-xl border border-border p-3 space-y-2">
              <Label className="font-bold text-[10px] text-foreground">التخصصات التي ينطبق عليها المقرر</Label>
              <p className="text-[10px] text-muted-foreground">اتركها دون تحديد ليكون المقرر مشتركاً بين جميع التخصصات الصالحة.</p>
              {specializations.filter((sp) => !editCourseData.trackIds.length || !sp.trackIds?.length || sp.trackIds.some((id) => editCourseData.trackIds.includes(id))).map((sp) => (
                <label key={sp.id} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={editCourseData.specializationIds.includes(sp.id)} onChange={(e) => setEditCourseData({ ...editCourseData, specializationIds: e.target.checked ? [...editCourseData.specializationIds, sp.id] : editCourseData.specializationIds.filter((id) => id !== sp.id) })} />{sp.name}
                </label>
              ))}
            </div>

          </div>

          <ImageUploadWidget
            label="صورة الغلاف"
            folder="courses"
            value={editCourseData.thumbnail}
            onChange={(url) => setEditCourseData({ ...editCourseData, thumbnail: url })}
            compact={true}
          />

          <div className="space-y-1 text-right">
            <Label className="font-bold text-xs text-foreground">وصف المقرر</Label>
            <Textarea
              value={editCourseData.description}
              onChange={(e) => setEditCourseData({ ...editCourseData, description: e.target.value })}
              className="text-right text-xs resize-none h-16"
            />
          </div>

          <Button type="submit" disabled={updatingCourse} className="w-full h-9 text-xs font-bold rounded-full shadow-none">
            {updatingCourse ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
