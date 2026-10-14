'use client'

import React, { useState, useEffect } from 'react'
import { AltArrowRightIcon } from '@solar-icons/react/outline'
import { api } from '@/lib/api'
import { CurriculumTreeCourse, AcademicStage, Grade, Track, Specialization } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [step, setStep] = useState(1) // Step 1: Info & Cover, Step 2: Academic Classification
  const [editCourseData, setEditCourseData] = useState({
    title: '',
    description: '',
    stageId: '',
    gradeId: '',
    trackIds: [] as string[],
    specializationIds: [] as string[],
    thumbnail: ''
  })
  const [updatingCourse, setUpdatingCourse] = useState(false)

  useEffect(() => {
    if (open && curriculumTree) {
      setEditCourseData({
        title: curriculumTree.title,
        description: curriculumTree.description || '',
        stageId: curriculumTree.stageId || '',
        gradeId: curriculumTree.gradeId || '',
        trackIds: curriculumTree.trackIds?.length
          ? curriculumTree.trackIds
          : (curriculumTree.trackId ? [curriculumTree.trackId] : []),
        specializationIds: curriculumTree.specializationIds?.length
          ? curriculumTree.specializationIds
          : (curriculumTree.specializationId ? [curriculumTree.specializationId] : []),
        thumbnail: curriculumTree.thumbnail || ''
      })
      setStep(1)
    }
  }, [open, curriculumTree])

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step === 1) {
      if (!editCourseData.title.trim()) {
        alert('يرجى إدخال عنوان المقرر')
        return
      }
      setStep(2)
      return
    }

    if (!editCourseData.stageId || editCourseData.stageId === 'none' || !editCourseData.gradeId || editCourseData.gradeId === 'none') {
      alert('يرجى تحديد المرحلة والصف الدراسي قبل حفظ المقرر')
      return
    }

    setUpdatingCourse(true)
    try {
      await api.updateCourse(courseId, {
        title: editCourseData.title.trim(),
        description: editCourseData.description.trim() || undefined,
        stageId: editCourseData.stageId === 'none' ? null : (editCourseData.stageId || null),
        gradeId: editCourseData.gradeId === 'none' ? null : (editCourseData.gradeId || null),
        trackIds: editCourseData.trackIds,
        specializationIds: editCourseData.specializationIds,
        thumbnail: editCourseData.thumbnail || null
      } as any)

      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      alert(err.message || 'خطأ في تحديث المقرر')
    } finally {
      setUpdatingCourse(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setStep(1)
      }}
    >
      <DialogContent className="max-w-lg bg-card border border-border shadow-none rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-foreground">تعديل بيانات المقرر</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === 1
              ? 'الخطوة 1: المعلومات الأساسية للمقرر والصورة التمثيلية'
              : 'الخطوة 2: ربط المقرر بشجرة الفئات التعليمية'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Visual step indicator ── */}
        <div className="flex items-center gap-2 pt-1 pb-1">
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        <form onSubmit={handleUpdateCourse} className="space-y-5 pt-2">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">عنوان المقرر</Label>
                <Input
                  placeholder="مثال: الرياضيات المتقدمة والتفاضل"
                  value={editCourseData.title}
                  onChange={(e) => setEditCourseData({ ...editCourseData, title: e.target.value })}
                  required
                  className="text-right font-bold h-11"
                />
              </div>

              <ImageUploadWidget
                label="صورة غلاف المقرر"
                folder="courses"
                value={editCourseData.thumbnail}
                onChange={(url) => setEditCourseData({ ...editCourseData, thumbnail: url })}
              />

              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">وصف المقرر (اختياري)</Label>
                <Textarea
                  placeholder="نبذة شاملة عن محتويات المقرر..."
                  value={editCourseData.description}
                  onChange={(e) => setEditCourseData({ ...editCourseData, description: e.target.value })}
                  className="text-right text-xs min-h-[100px]"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-4 text-right">
              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-foreground">المرحلة الدراسية</Label>
                <Select
                  dir="rtl"
                  value={editCourseData.stageId || undefined}
                  onValueChange={(value) =>
                    setEditCourseData({
                      ...editCourseData,
                      stageId: value === 'none' ? '' : value,
                      gradeId: '',
                      trackIds: [],
                      specializationIds: []
                    })
                  }
                >
                  <SelectTrigger className="w-full h-11 text-xs font-semibold" dir="rtl">
                    <SelectValue placeholder="اختر المرحلة (مطلوب)" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                    <SelectItem value="none">اختر المرحلة</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-foreground">الصف الدراسي</Label>
                {(() => {
                  const isStageSelected = Boolean(editCourseData.stageId && editCourseData.stageId !== 'none')
                  const availableGrades = isStageSelected
                    ? grades.filter((g) => g.stageId === editCourseData.stageId)
                    : []
                  return (
                    <Select
                      dir="rtl"
                      disabled={!isStageSelected}
                      value={editCourseData.gradeId || undefined}
                      onValueChange={(value) =>
                        setEditCourseData({
                          ...editCourseData,
                          gradeId: value === 'none' ? '' : value,
                          trackIds: [],
                          specializationIds: []
                        })
                      }
                    >
                      <SelectTrigger className="w-full h-11 text-xs font-semibold disabled:opacity-50" dir="rtl">
                        <SelectValue placeholder={!isStageSelected ? 'اختر المرحلة أولاً' : 'اختر الصف (مطلوب)'} />
                      </SelectTrigger>
                      <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                        {availableGrades.length === 0 ? (
                          <SelectItem value="none" disabled>
                            لا توجد صفوف مضافة لهذه المرحلة
                          </SelectItem>
                        ) : (
                          <>
                            <SelectItem value="none">اختر الصف</SelectItem>
                            {availableGrades.map((g) => {
                              const stage = stages.find((s) => s.id === g.stageId)
                              return (
                                <SelectItem key={g.id} value={g.id}>
                                  الصف {g.name} {stage ? `(${stage.name})` : ''}
                                </SelectItem>
                              )
                            })}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )
                })()}
              </div>

              <div className="col-span-2 rounded-xl border border-border p-3 space-y-2">
                <Label className="font-bold text-xs text-foreground">المسارات التي ينطبق عليها المقرر</Label>
                <p className="text-[11px] text-muted-foreground">
                  اتركها دون تحديد ليكون المقرر مشتركاً بين كل المسارات الصالحة لهذا الصف.
                </p>
                {tracks
                  .filter(
                    (t) =>
                      !editCourseData.gradeId ||
                      editCourseData.gradeId === 'none' ||
                      !t.gradeIds?.length ||
                      t.gradeIds.includes(editCourseData.gradeId)
                  )
                  .map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={editCourseData.trackIds.includes(t.id)}
                        onChange={(e) =>
                          setEditCourseData((prev) => ({
                            ...prev,
                            trackIds: e.target.checked
                              ? [...prev.trackIds, t.id]
                              : prev.trackIds.filter((id) => id !== t.id),
                            specializationIds: []
                          }))
                        }
                      />
                      {t.name}
                    </label>
                  ))}
              </div>

              <div className="col-span-2 rounded-xl border border-border p-3 space-y-2">
                <Label className="font-bold text-xs text-foreground">التخصصات المشمولة (اختياري)</Label>
                <p className="text-[11px] text-muted-foreground">
                  اتركها دون تحديد ليشمل المقرر جميع التخصصات الصالحة للمسار.
                </p>
                {specializations
                  .filter(
                    (sp) =>
                      !editCourseData.trackIds.length ||
                      !sp.trackIds?.length ||
                      sp.trackIds.some((id) => editCourseData.trackIds.includes(id))
                  )
                  .map((sp) => (
                    <label key={sp.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={editCourseData.specializationIds.includes(sp.id)}
                        onChange={(e) =>
                          setEditCourseData((prev) => ({
                            ...prev,
                            specializationIds: e.target.checked
                              ? [...prev.specializationIds, sp.id]
                              : prev.specializationIds.filter((id) => id !== sp.id)
                          }))
                        }
                      />
                      {sp.name}
                    </label>
                  ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-border">
            {step === 1 ? (
              <Button
                type="submit"
                className="w-full font-bold h-11 rounded-full shadow-none"
              >
                الخطوة التالية
                <AltArrowRightIcon className="h-4 w-4 mr-2 rotate-180" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="font-bold h-11 rounded-full"
                >
                  السابق
                </Button>
                <Button
                  type="submit"
                  disabled={updatingCourse}
                  className="flex-1 font-extrabold text-sm h-11 rounded-full shadow-none"
                >
                  {updatingCourse ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
