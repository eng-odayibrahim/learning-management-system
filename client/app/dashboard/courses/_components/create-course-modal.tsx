'use client'
import { AltArrowRightIcon } from '@solar-icons/react/outline';


import React, { useState } from 'react'
import { api } from '@/lib/api'
import { CategoryNode, Course, AcademicStage, Grade, Track, Specialization } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { ImageUploadWidget } from '@/components/shared/image-upload-widget'

interface CreateCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (course: Course) => void
  stages: AcademicStage[]
  grades: Grade[]
  tracks: Track[]
  specializations: Specialization[]
}

export function CreateCourseModal({
  open,
  onOpenChange,
  onSuccess,
  stages,
  grades,
  tracks,
  specializations
}: CreateCourseModalProps) {
  const [step, setStep] = useState(1) // Stage 1 (Info), Stage 2 (Taxonomy)
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseStageId, setCourseStageId] = useState('')
  const [courseGradeId, setCourseGradeId] = useState('')
  const [courseTrackId, setCourseTrackId] = useState('')
  const [courseTrackIds, setCourseTrackIds] = useState<string[]>([])
  const [courseSpecializationIds, setCourseSpecializationIds] = useState<string[]>([])
  const [courseThumb, setCourseThumb] = useState('')
  const [submittingCourse, setSubmittingCourse] = useState(false)

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step === 1) {
      setStep(2)
      return
    }

    if (!courseStageId || courseStageId === 'none' || !courseGradeId || courseGradeId === 'none') {
      alert('يرجى تحديد المرحلة والصف الدراسي قبل إنشاء المقرر')
      return
    }

    setSubmittingCourse(true)
    try {
      const newCourse = await api.createCourse({
        title: courseTitle.trim(),
        description: courseDesc.trim() || undefined,
        stageId: courseStageId === 'none' ? undefined : (courseStageId || undefined),
        gradeId: courseGradeId === 'none' ? undefined : (courseGradeId || undefined),
        trackId: courseTrackId === 'none' ? undefined : (courseTrackId || undefined),
        trackIds: courseTrackIds,
        specializationIds: courseSpecializationIds,
        thumbnail: courseThumb.trim() || undefined,
      })
      
      onSuccess(newCourse)
      
      // reset
      setCourseTitle(''); setCourseDesc(''); setCourseStageId(''); setCourseGradeId(''); 
      setCourseTrackId(''); setCourseTrackIds([]); setCourseSpecializationIds([]); setCourseThumb(''); 
      setStep(1);
    } catch (err: any) {
      alert(err.message || 'خطأ في إنشاء المقرر')
    } finally {
      setSubmittingCourse(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (!v) setStep(1);
    }}>
      <DialogContent className="max-w-lg bg-card border border-border shadow-none rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-foreground">إنشاء مقرر دراسي جديد</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === 1 ? 'الخطوة 1: المعلومات الأساسية للمقرر والصورة التمثيلية' : 'الخطوة 2: ربط المقرر بشجرة الفئات التعليمية'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateCourse} className="space-y-5 pt-2">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">عنوان المقرر</Label>
                <Input
                  placeholder="مثال: الرياضيات المتقدمة والتفاضل"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  required
                  className="text-right font-bold h-11"
                />
              </div>

              <ImageUploadWidget
                label="صورة غلاف المقرر"
                folder="courses"
                value={courseThumb}
                onChange={setCourseThumb}
              />

              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">وصف المقرر (اختياري)</Label>
                <Textarea
                  placeholder="نبذة شاملة عن محتويات المقرر..."
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  className="text-right text-xs min-h-[100px]"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-4 text-right">
              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-foreground">المرحلة الدراسية</Label>
                <Select dir="rtl" value={courseStageId || undefined} onValueChange={(value) => { setCourseStageId(value); setCourseGradeId(''); setCourseTrackId(''); setCourseTrackIds([]); setCourseSpecializationIds([]) }}>
                  <SelectTrigger className="w-full h-11 text-xs font-semibold" dir="rtl">
                    <SelectValue placeholder="اختر المرحلة (مطلوب)" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                    <SelectItem value="none">اختر المرحلة</SelectItem>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-foreground">الصف الدراسي</Label>
                {(() => {
                  const isStageSelected = Boolean(courseStageId && courseStageId !== 'none')
                  const availableGrades = isStageSelected
                    ? grades.filter((g) => g.stageId === courseStageId)
                    : []
                  return (
                    <Select
                      dir="rtl"
                      disabled={!isStageSelected}
                      value={courseGradeId || undefined}
                      onValueChange={(value) => { setCourseGradeId(value); setCourseTrackId(''); setCourseTrackIds([]); setCourseSpecializationIds([]) }}
                    >
                      <SelectTrigger className="w-full h-11 text-xs font-semibold disabled:opacity-50" dir="rtl">
                        <SelectValue placeholder={!isStageSelected ? 'اختر المرحلة أولاً' : 'اختر الصف (مطلوب)'} />
                      </SelectTrigger>
                      <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                        {availableGrades.length === 0 ? (
                          <SelectItem value="none" disabled>لا توجد صفوف مضافة لهذه المرحلة</SelectItem>
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

              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-foreground">المسار الدراسي</Label>
                <Select dir="rtl" value={courseTrackId || undefined} onValueChange={(value) => { setCourseTrackId(value); setCourseSpecializationIds([]) }}>
                  <SelectTrigger className="w-full h-11 text-xs font-semibold" dir="rtl">
                    <SelectValue placeholder="-- اختياري --" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                    <SelectItem value="none">-- اختياري --</SelectItem>
                    {tracks.filter((t) => !courseGradeId || courseGradeId === 'none' || !t.gradeIds?.length || t.gradeIds.includes(courseGradeId)).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 rounded-xl border border-border p-3 space-y-2">
                <Label className="font-bold text-xs text-foreground">المسارات التي ينطبق عليها المقرر</Label>
                <p className="text-[11px] text-muted-foreground">اتركها دون تحديد ليكون المقرر مشتركاً بين كل المسارات الصالحة لهذا الصف.</p>
                {tracks.filter((t) => !courseGradeId || courseGradeId === 'none' || !t.gradeIds?.length || t.gradeIds.includes(courseGradeId)).map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={courseTrackIds.includes(t.id)} onChange={(e) => setCourseTrackIds((ids) => e.target.checked ? [...ids, t.id] : ids.filter((id) => id !== t.id))} />
                    {t.name}
                  </label>
                ))}
              </div>
              <div className="col-span-2 rounded-xl border border-border p-3 space-y-2">
                <Label className="font-bold text-xs text-foreground">التخصصات المشمولة (اختياري)</Label>
                <p className="text-[11px] text-muted-foreground">اتركها دون تحديد ليشمل المقرر جميع التخصصات الصالحة للمسار.</p>
                {specializations.filter((sp) => (!courseTrackId || courseTrackId === 'none' || !sp.trackIds?.length || sp.trackIds.includes(courseTrackId)) && (!courseTrackIds.length || !sp.trackIds?.length || sp.trackIds.some((id) => courseTrackIds.includes(id)))).map((sp) => (
                  <label key={sp.id} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={courseSpecializationIds.includes(sp.id)} onChange={(e) => setCourseSpecializationIds((ids) => e.target.checked ? [...ids, sp.id] : ids.filter((id) => id !== sp.id))} />
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
                  disabled={submittingCourse}
                  className="flex-1 font-extrabold text-sm h-11 rounded-full shadow-none"
                >
                  {submittingCourse ? 'جاري الإنشاء...' : 'إنشاء المقرر وحفظه'}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
