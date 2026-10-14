'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { Quiz, Class, Course, AcademicStage, Grade } from '@/lib/types'
import { toast } from 'sonner'

import {
  AddCircleIcon,
  MagicWand2Icon,
  PenIcon,
  RefreshIcon,
  TrashBinTrashIcon,
} from '@solar-icons/react/outline'
import { CreateQuizModal } from './_components/create-quiz-modal'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ClassMeta {
  classId: string
  classTitle: string
  subjectTitle: string
  courseId: string
  courseTitle: string
  stageId?: string | null
  stageName?: string
  gradeId?: string | null
  gradeName?: string
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [stages, setStages] = useState<AcademicStage[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [courseClassMap, setCourseClassMap] = useState<
    Record<string, { classItem: Class; subjectTitle?: string }[]>
  >({})
  const [classMetaMap, setClassMetaMap] = useState<Record<string, ClassMeta>>({})
  const [loading, setLoading] = useState(true)

  // Filters: Stage -> Grade -> Course + Search query
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Quiz | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [quizData, stagesRes, gradesRes, coursesRes] = await Promise.all([
        api.getQuizzes().catch(() => [] as any),
        api.getStages().catch(() => []),
        api.getGrades().catch(() => []),
        api.getCourses({}, 1, 100).catch(() => ({ items: [] })),
      ])

      const raw = quizData as any
      setQuizzes(Array.isArray(raw) ? raw : raw?.items ?? [])
      setStages(stagesRes || [])
      setGrades(gradesRes || [])
      const courseList = coursesRes?.items || []
      setCourses(courseList)

      const map: Record<string, { classItem: Class; subjectTitle?: string }[]> = {}
      const metaMap: Record<string, ClassMeta> = {}

      await Promise.all(
        courseList.map(async (course) => {
          try {
            const tree = await api.getCurriculumTree(course.id)
            const stage = stagesRes.find((s) => s.id === course.stageId)
            const grade = gradesRes.find((g) => g.id === course.gradeId)
            const items: { classItem: Class; subjectTitle?: string }[] = []

            tree.subjects?.forEach((s) => {
              s.classes?.forEach((c) => {
                items.push({ classItem: c.classItem, subjectTitle: s.subject.title })
                metaMap[c.classItem.id] = {
                  classId: c.classItem.id,
                  classTitle: c.classItem.title,
                  subjectTitle: s.subject.title,
                  courseId: course.id,
                  courseTitle: course.title,
                  stageId: course.stageId,
                  stageName: stage?.name,
                  gradeId: course.gradeId,
                  gradeName: grade ? `الصف ${grade.name}` : undefined,
                }
              })
            })
            map[course.id] = items
          } catch {
            map[course.id] = []
          }
        })
      )

      setCourseClassMap(map)
      setClassMetaMap(metaMap)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) return
    setDeletingId(id)
    try {
      await api.deleteQuiz(id)
      toast.success('تم حذف الاختبار بنجاح')
      setQuizzes((prev) => prev.filter((q) => (q._id ?? q.id) !== id))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggle = async (id: string) => {
    setTogglingId(id)
    try {
      await api.toggleQuiz(id)
      setQuizzes((prev) =>
        prev.map((q) => ((q._id ?? q.id) === id ? { ...q, isActive: !q.isActive } : q))
      )
      toast.success('تم تغيير حالة الاختبار')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  const openCreate = () => {
    setEditTarget(null)
    setShowModal(true)
  }
  const openEdit = (q: Quiz) => {
    setEditTarget(q)
    setShowModal(true)
  }

  // Cascading options for filters
  const availableFilterGrades = useMemo(() => {
    if (filterStage === 'all') return grades
    return grades.filter((g) => g.stageId === filterStage)
  }, [grades, filterStage])

  const availableFilterCourses = useMemo(() => {
    let list = courses
    if (filterStage !== 'all') {
      list = list.filter((c) => c.stageId === filterStage)
    }
    if (filterGrade !== 'all') {
      list = list.filter((c) => c.gradeId === filterGrade)
    }
    return list
  }, [courses, filterStage, filterGrade])

  // Filtered quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const meta = classMetaMap[quiz.classId]

      if (filterStage !== 'all' && meta?.stageId !== filterStage) {
        return false
      }
      if (filterGrade !== 'all' && meta?.gradeId !== filterGrade) {
        return false
      }
      if (filterCourse !== 'all' && meta?.courseId !== filterCourse) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = (quiz.title || '').toLowerCase().includes(q)
        const matchesCourse = (meta?.courseTitle || '').toLowerCase().includes(q)
        const matchesSubject = (meta?.subjectTitle || '').toLowerCase().includes(q)
        const matchesClass = (meta?.classTitle || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesCourse && !matchesSubject && !matchesClass) return false
      }
      return true
    })
  }, [quizzes, classMetaMap, filterStage, filterGrade, filterCourse, searchQuery])

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">إدارة الاختبارات والتقييمات</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            إنشاء وإدارة الاختبارات المفرزة بدقة وفق المراحل والصفوف والمقررات الدراسية.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
        >
          <AddCircleIcon className="h-4 w-4" /> اختبار جديد
        </Button>
      </div>

      <Card className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* ── Cascading Filter Bar: Stage -> Grade -> Course ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/40 p-3.5 rounded-2xl border border-border/40">
            {/* Filter 1: Stage */}
            <div className="space-y-1 text-right">
              <label className="text-[11px] font-bold text-muted-foreground">المرحلة التعليمية:</label>
              <Select
                dir="rtl"
                value={filterStage}
                onValueChange={(val) => {
                  setFilterStage(val)
                  setFilterGrade('all')
                  setFilterCourse('all')
                }}
              >
                <SelectTrigger className="w-full text-xs h-9 rounded-xl font-medium" dir="rtl">
                  <SelectValue placeholder="كافة المراحل" />
                </SelectTrigger>
                <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                  <SelectItem value="all">كافة المراحل التعليمية</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 2: Grade */}
            <div className="space-y-1 text-right">
              <label className="text-[11px] font-bold text-muted-foreground">الصف الدراسي:</label>
              <Select
                dir="rtl"
                value={filterGrade}
                onValueChange={(val) => {
                  setFilterGrade(val)
                  setFilterCourse('all')
                }}
                disabled={filterStage !== 'all' && availableFilterGrades.length === 0}
              >
                <SelectTrigger className="w-full text-xs h-9 rounded-xl font-medium" dir="rtl">
                  <SelectValue placeholder="كافة الصفوف" />
                </SelectTrigger>
                <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                  <SelectItem value="all">كافة الصفوف الدراسية</SelectItem>
                  {availableFilterGrades.map((g) => {
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

            {/* Filter 3: Course */}
            <div className="space-y-1 text-right">
              <label className="text-[11px] font-bold text-muted-foreground">المقرر الدراسي:</label>
              <Select
                dir="rtl"
                value={filterCourse}
                onValueChange={setFilterCourse}
                disabled={availableFilterCourses.length === 0}
              >
                <SelectTrigger className="w-full text-xs h-9 rounded-xl font-medium" dir="rtl">
                  <SelectValue placeholder="كافة المقررات" />
                </SelectTrigger>
                <SelectContent dir="rtl" position="popper" side="bottom" className="w-full">
                  <SelectItem value="all">كافة المقررات الدراسية</SelectItem>
                  {availableFilterCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 4: Search Input */}
            <div className="space-y-1 text-right">
              <label className="text-[11px] font-bold text-muted-foreground">البحث بالاسم:</label>
              <Input
                placeholder="بحث باسم الاختبار أو الوحدة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs h-9 rounded-xl text-right font-medium"
              />
            </div>
          </div>

          {/* ── Table ── */}
          <div className="rounded-2xl border border-border/50 overflow-hidden">
            <Table dir="rtl">
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border/60">
                  <TableHead className="text-right px-4 text-xs font-bold text-foreground">اسم الاختبار</TableHead>
                  <TableHead className="text-right px-4 text-xs font-bold text-foreground">المرحلة والصف</TableHead>
                  <TableHead className="text-right px-4 text-xs font-bold text-foreground">المقرر والوحدة</TableHead>
                  <TableHead className="text-center px-4 text-xs font-bold text-foreground">عدد الأسئلة</TableHead>
                  <TableHead className="text-center px-4 text-xs font-bold text-foreground">الحالة</TableHead>
                  <TableHead className="text-left px-4 text-xs font-bold text-foreground">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshIcon className="h-6 w-6 animate-spin text-primary" />
                        <span>جاري تحميل بيانات الاختبارات...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredQuizzes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs font-medium">
                      لا توجد اختبارات مطابقة للتصنيف أو البحث المحدد.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuizzes.map((quiz) => {
                    const qId = quiz._id ?? quiz.id
                    const meta = classMetaMap[quiz.classId]

                    return (
                      <TableRow key={qId} className="border-border/40 hover:bg-muted/30 transition-colors">
                        {/* Title */}
                        <TableCell className="px-4 font-bold text-xs text-foreground">
                          <div className="space-y-0.5">
                            <span className="block truncate max-w-[200px]">{quiz.title}</span>
                            {quiz.description && (
                              <span className="text-[11px] text-muted-foreground font-normal line-clamp-1">
                                {quiz.description}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Stage & Grade */}
                        <TableCell className="px-4">
                          <div className="flex flex-col gap-1 text-xs">
                            {meta?.stageName ? (
                              <Badge variant="outline" className="text-[10px] w-fit rounded-md px-2 py-0 border-primary/20 text-primary bg-primary/5 font-semibold">
                                {meta.stageName}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                            {meta?.gradeName && (
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {meta.gradeName}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Course & Unit */}
                        <TableCell className="px-4 text-xs font-medium">
                          <div className="space-y-0.5">
                            <span className="block font-bold text-foreground">
                              {meta?.courseTitle || 'غير محدد'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {meta?.subjectTitle ? `${meta.subjectTitle} - ` : ''}
                              {meta?.classTitle || quiz.classId}
                            </span>
                          </div>
                        </TableCell>

                        {/* Questions count */}
                        <TableCell className="text-center px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                            {quiz.questions?.length ?? 0} سؤال
                          </span>
                        </TableCell>

                        {/* Toggle active status */}
                        <TableCell className="text-center px-4">
                          <Switch
                            checked={quiz.isActive}
                            disabled={togglingId === qId}
                            onCheckedChange={() => handleToggle(qId)}
                          />
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="px-4">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(quiz)}
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              title="تعديل الاختبار والأسئلة"
                            >
                              <PenIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(qId)}
                              disabled={deletingId === qId}
                              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                              title="حذف الاختبار"
                            >
                              <TrashBinTrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal with Stage -> Grade -> Course -> Class Hierarchy */}
      <CreateQuizModal
        open={showModal}
        onOpenChange={setShowModal}
        onSuccess={fetchData}
        quiz={editTarget}
        stages={stages}
        grades={grades}
        courses={courses}
        courseClassMap={courseClassMap}
      />
    </div>
  )
}
