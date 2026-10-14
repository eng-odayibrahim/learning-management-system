'use client'

import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Coursework, Course, Subject, AcademicStage, Grade } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddCircleIcon, CloseCircleIcon, FileTextIcon, RefreshIcon } from '@solar-icons/react/outline'

interface CreateCourseworkModalProps {
  open: boolean
  onOpenChange: (val: boolean) => void
  onSuccess: () => void
  coursework?: Coursework | null
  stages?: AcademicStage[]
  grades?: Grade[]
  courses?: Course[]
}

export function CreateCourseworkModal({
  open,
  onOpenChange,
  onSuccess,
  coursework,
  stages: propStages,
  grades: propGrades,
  courses: propCourses,
}: CreateCourseworkModalProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // Hierarchy states: Stage -> Grade -> Course -> Subject
  const [stages, setStages] = useState<AcademicStage[]>(propStages || [])
  const [grades, setGrades] = useState<Grade[]>(propGrades || [])
  const [courses, setCourses] = useState<Course[]>(propCourses || [])
  const [subjects, setSubjects] = useState<{ subject: Subject }[]>([])

  const [selectedStage, setSelectedStage] = useState<string>('')
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [materialKeys, setMaterialKeys] = useState<string[]>([])

  // Load initial taxonomy & courses if not provided
  useEffect(() => {
    if (open) {
      if (!propStages || propStages.length === 0) {
        api.getStages().then(setStages).catch(console.error)
      } else {
        setStages(propStages)
      }

      if (!propGrades || propGrades.length === 0) {
        api.getGrades().then(setGrades).catch(console.error)
      } else {
        setGrades(propGrades)
      }

      if (!propCourses || propCourses.length === 0) {
        api.getCourses({}, 1, 100).then((res) => setCourses(res?.items || [])).catch(console.error)
      } else {
        setCourses(propCourses)
      }
    }
  }, [open, propStages, propGrades, propCourses])

  // Populate data when opening or editing
  useEffect(() => {
    if (open) {
      if (coursework) {
        setTitle(coursework.title)
        setDescription(coursework.description || '')
        setMaterialKeys(coursework.materialKeys || [])
        setSelectedSubject(coursework.subjectId)

        // Try to reverse-locate course, grade, and stage from coursework.subjectId
        findCourseHierarchyForSubject(coursework.subjectId)
      } else {
        setTitle('')
        setDescription('')
        setMaterialKeys([])
        setSelectedStage('')
        setSelectedGrade('')
        setSelectedCourse('')
        setSelectedSubject('')
        setSubjects([])
      }
    }
  }, [open, coursework])

  const findCourseHierarchyForSubject = async (subId: string) => {
    try {
      const allCoursesRes = propCourses?.length ? propCourses : (await api.getCourses({}, 1, 100)).items
      for (const c of allCoursesRes) {
        try {
          const tree = await api.getCurriculumTree(c.id)
          const found = tree.subjects?.find((s) => s.subject.id === subId)
          if (found) {
            setSelectedCourse(c.id)
            if (c.stageId) setSelectedStage(c.stageId)
            if (c.gradeId) setSelectedGrade(c.gradeId)
            setSubjects(tree.subjects as any)
            break
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Failed to reverse lookup hierarchy:', err)
    }
  }

  // Load subjects whenever selectedCourse changes
  useEffect(() => {
    if (selectedCourse) {
      api
        .getCurriculumTree(selectedCourse)
        .then((tree) => {
          setSubjects((tree.subjects as any) || [])
        })
        .catch(console.error)
    } else {
      setSubjects([])
    }
  }, [selectedCourse])

  // Cascading lists
  const availableGrades = selectedStage
    ? grades.filter((g) => g.stageId === selectedStage)
    : []

  const availableCourses =
    selectedStage && selectedGrade
      ? courses.filter((c) => c.stageId === selectedStage && c.gradeId === selectedGrade)
      : []

  const handleSave = async () => {
    if (!title.trim()) {
      alert('الرجاء إدخال عنوان أعمال السنة')
      return
    }
    if (!selectedSubject) {
      alert('الرجاء اختيار المرحلة والصف والمقرر ثم الوحدة الدراسية')
      return
    }

    setLoading(true)
    try {
      if (coursework) {
        await api.updateCoursework(coursework.id, {
          title: title.trim(),
          description: description.trim(),
          materialKeys,
        })
      } else {
        await api.createCoursework({
          title: title.trim(),
          description: description.trim(),
          subjectId: selectedSubject,
          materialKeys,
        })
      }
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'حدث خطأ أثناء حفظ أعمال السنة')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setLoading(true)
    try {
      const uploadPromises = files.map((file) => api.uploadDocument(file, 'materials'))
      const urls = await Promise.all(uploadPromises)
      setMaterialKeys((prev) => [...prev, ...urls])
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'فشل رفع الملفات')
    } finally {
      setLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  const removeMaterial = (url: string) => {
    setMaterialKeys((prev) => prev.filter((k) => k !== url))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl font-bold">
            {coursework ? 'تعديل أعمال السنة' : 'إضافة أعمال سنة جديدة'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            حدد المرحلة التعليمية والصف الدراسي للوصول إلى المقرر والوحدة المستهدفة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-right">
          {/* 1. Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">العنوان *</Label>
            <Input
              placeholder="مثال: واجب الأسبوع الأول - أعمال السنة"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-right text-xs h-10 rounded-xl"
            />
          </div>

          {/* 2. Hierarchical Selectors: Stage -> Grade -> Course -> Unit */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3.5">
            <span className="text-xs font-extrabold text-foreground block border-b border-border/40 pb-2">
              التصنيف الأكاديمي للوحدة والمقرر:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Step 1: Stage */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">1. المرحلة التعليمية *</Label>
                <Select
                  dir="rtl"
                  value={selectedStage || undefined}
                  onValueChange={(val) => {
                    setSelectedStage(val)
                    setSelectedGrade('')
                    setSelectedCourse('')
                    setSelectedSubject('')
                  }}
                  disabled={!!coursework}
                >
                  <SelectTrigger className="w-full text-xs h-10 rounded-xl font-medium" dir="rtl">
                    <SelectValue placeholder="-- اختر المرحلة --" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: Grade */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">2. الصف الدراسي *</Label>
                <Select
                  dir="rtl"
                  value={selectedGrade || undefined}
                  onValueChange={(val) => {
                    setSelectedGrade(val)
                    setSelectedCourse('')
                    setSelectedSubject('')
                  }}
                  disabled={!!coursework || !selectedStage}
                >
                  <SelectTrigger className="w-full text-xs h-10 rounded-xl font-medium" dir="rtl">
                    <SelectValue
                      placeholder={
                        !selectedStage
                          ? '← اختر المرحلة أولاً'
                          : availableGrades.length === 0
                          ? 'لا توجد صفوف مضافة'
                          : '-- اختر الصف --'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                    {availableGrades.map((g) => {
                      const stage = stages.find((s) => s.id === g.stageId)
                      return (
                        <SelectItem key={g.id} value={g.id}>
                          الصف {g.name} {stage ? `(${stage.name})` : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Step 3: Course */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">3. المقرر الدراسي *</Label>
                <Select
                  dir="rtl"
                  value={selectedCourse || undefined}
                  onValueChange={(val) => {
                    setSelectedCourse(val)
                    setSelectedSubject('')
                  }}
                  disabled={!!coursework || !selectedGrade}
                >
                  <SelectTrigger className="w-full text-xs h-10 rounded-xl font-medium" dir="rtl">
                    <SelectValue
                      placeholder={
                        !selectedGrade
                          ? '← اختر الصف أولاً'
                          : availableCourses.length === 0
                          ? 'لا توجد مقررات في هذا الصف'
                          : '-- اختر المقرر --'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                    {availableCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 4: Unit / Subject */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">4. الوحدة الدراسية *</Label>
                <Select
                  dir="rtl"
                  value={selectedSubject || undefined}
                  onValueChange={setSelectedSubject}
                  disabled={!!coursework || !selectedCourse}
                >
                  <SelectTrigger className="w-full text-xs h-10 rounded-xl font-medium" dir="rtl">
                    <SelectValue
                      placeholder={
                        !selectedCourse
                          ? '← اختر المقرر أولاً'
                          : subjects.length === 0
                          ? 'لا توجد وحدات في المقرر'
                          : '-- اختر الوحدة --'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                    {subjects.map((s) => (
                      <SelectItem key={s.subject.id} value={s.subject.id}>
                        {s.subject.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">الوصف أو التعليمات (اختياري)</Label>
            <Textarea
              placeholder="وصف تفصيلي أو تعليمات تسليم أعمال السنة..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-right text-xs rounded-xl resize-none"
            />
          </div>

          {/* Attached Files */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">الملفات المرفقة وأوراق العمل</Label>
              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={loading}
                  multiple
                />
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center justify-center rounded-full text-xs font-semibold border border-input bg-background hover:bg-muted h-8 px-3 gap-1.5 transition-colors"
                >
                  {loading ? <RefreshIcon className="h-3.5 w-3.5 animate-spin" /> : <AddCircleIcon className="h-3.5 w-3.5 text-primary" />}
                  <span>إضافة ملف</span>
                </Label>
              </div>
            </div>

            {materialKeys.length > 0 ? (
              <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                {materialKeys.map((key, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between bg-muted/40 p-2 px-3 rounded-xl border border-border/50 text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileTextIcon className="h-4 w-4 shrink-0 text-primary" />
                      <a href={key} target="_blank" rel="noreferrer" className="truncate hover:underline">
                        ملف مرفق {i + 1}
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMaterial(key)}
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full shrink-0"
                    >
                      <CloseCircleIcon className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-dashed border-border/60 text-center">
                لا توجد ملفات مرفقة حالياً.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/40">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-full text-xs h-9 px-4 font-semibold"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || (!coursework && !selectedSubject)}
            className="rounded-full text-xs h-9 px-5 font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            {loading && <RefreshIcon className="h-3.5 w-3.5 animate-spin ml-1.5" />}
            <span>{coursework ? 'حفظ التعديلات' : 'إضافة أعمال السنة'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
