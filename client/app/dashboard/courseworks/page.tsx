'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { Coursework, Course, AcademicStage, Grade, Subject } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AddCircleIcon,
  BookBookmarkIcon,
  PenIcon,
  TrashBinTrashIcon,
  RefreshIcon,
  LayersIcon,
} from '@solar-icons/react/outline'
import { Badge } from '@/components/ui/badge'

import { CreateCourseworkModal } from './_components/create-coursework-modal'

interface SubjectMeta {
  subjectTitle: string
  courseId: string
  courseTitle: string
  stageId?: string | null
  stageName?: string
  gradeId?: string | null
  gradeName?: string
}

export default function AdminCourseworksPage() {
  const [courseworks, setCourseworks] = useState<Coursework[]>([])
  const [stages, setStages] = useState<AcademicStage[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [subjectMetaMap, setSubjectMetaMap] = useState<Record<string, SubjectMeta>>({})
  const [loading, setLoading] = useState(true)

  // Filters: Stage -> Grade -> Course + Search query
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterGrade, setFilterGrade] = useState<string>('all')
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [openCreate, setOpenCreate] = useState(false)
  const [editingCoursework, setEditingCoursework] = useState<Coursework | null>(null)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [cwRes, stagesRes, gradesRes, coursesRes] = await Promise.all([
        api.getAllCourseworks().catch(() => []),
        api.getStages().catch(() => []),
        api.getGrades().catch(() => []),
        api.getCourses({}, 1, 100).catch(() => ({ items: [] })),
      ])

      setCourseworks(cwRes || [])
      setStages(stagesRes || [])
      setGrades(gradesRes || [])
      const courseList = coursesRes?.items || []
      setCourses(courseList)

      // Map subjects across courses to stage, grade, and course info
      const metaMap: Record<string, SubjectMeta> = {}
      await Promise.all(
        courseList.map(async (c) => {
          try {
            const tree = await api.getCurriculumTree(c.id)
            const stage = stagesRes.find((s) => s.id === c.stageId)
            const grade = gradesRes.find((g) => g.id === c.gradeId)

            tree.subjects?.forEach((s) => {
              metaMap[s.subject.id] = {
                subjectTitle: s.subject.title,
                courseId: c.id,
                courseTitle: c.title,
                stageId: c.stageId,
                stageName: stage?.name,
                gradeId: c.gradeId,
                gradeName: grade ? `الصف ${grade.name}` : undefined,
              }
            })
          } catch (_) {}
        })
      )
      setSubjectMetaMap(metaMap)
    } catch (e) {
      console.error('Error loading courseworks data:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف أعمال السنة هذه؟')) return
    try {
      await api.deleteCoursework(id)
      setCourseworks((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error(e)
      alert('حدث خطأ أثناء الحذف')
    }
  }

  const handleEdit = (cw: Coursework) => {
    setEditingCoursework(cw)
    setOpenCreate(true)
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

  // Filtered courseworks
  const filtered = useMemo(() => {
    return courseworks.filter((cw) => {
      const meta = subjectMetaMap[cw.subjectId]

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
        const matchesTitle = (cw.title || '').toLowerCase().includes(q)
        const matchesCourse = (meta?.courseTitle || '').toLowerCase().includes(q)
        const matchesSubject = (meta?.subjectTitle || '').toLowerCase().includes(q)
        if (!matchesTitle && !matchesCourse && !matchesSubject) return false
      }
      return true
    })
  }, [courseworks, subjectMetaMap, filterStage, filterGrade, filterCourse, searchQuery])

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <BookBookmarkIcon className="text-primary h-6 w-6" />
            أعمال السنة والمذكرات
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            إدارة أعمال السنة والملفات الداعمة المفرزة بحسب المراحل والصفوف التعليمية.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCoursework(null)
            setOpenCreate(true)
          }}
          className="shrink-0 gap-2 rounded-full font-bold text-xs px-5 bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          <AddCircleIcon className="h-4 w-4" /> إضافة أعمال سنة
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

            {/* Filter 4: Text Search */}
            <div className="space-y-1 text-right">
              <label className="text-[11px] font-bold text-muted-foreground">البحث بالاسم:</label>
              <Input
                placeholder="بحث بالعنوان أو الوحدة..."
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
                  <TableHead className="text-right font-bold text-xs text-foreground px-4">العنوان</TableHead>
                  <TableHead className="text-right font-bold text-xs text-foreground px-4">المرحلة والصف</TableHead>
                  <TableHead className="text-right font-bold text-xs text-foreground px-4">المقرر والوحدة</TableHead>
                  <TableHead className="text-center font-bold text-xs text-foreground px-4">الملفات</TableHead>
                  <TableHead className="text-center font-bold text-xs text-foreground px-4">تاريخ الإنشاء</TableHead>
                  <TableHead className="w-[100px] text-left font-bold text-xs text-foreground px-4">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshIcon className="h-6 w-6 animate-spin text-primary" />
                        <span>جاري تحميل بيانات أعمال السنة والتصنيفات...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs font-medium">
                      لا توجد أعمال سنة مطابقة للتصنيف أو البحث المحدد.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((cw, index) => {
                    const cwId =
                      typeof cw.id === 'string' || typeof cw.id === 'number'
                        ? String(cw.id)
                        : (cw as any)._id || `cw-${index}`
                    const meta = subjectMetaMap[cw.subjectId]

                    return (
                      <TableRow key={cwId} className="border-border/40 hover:bg-muted/30 transition-colors">
                        {/* Title */}
                        <TableCell className="font-bold text-xs text-foreground px-4">
                          <div className="space-y-0.5">
                            <span className="block truncate max-w-[220px]">{cw.title}</span>
                            {cw.description && (
                              <span className="text-[11px] text-muted-foreground font-normal line-clamp-1">
                                {cw.description}
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
                        <TableCell className="px-4 text-xs font-medium text-foreground">
                          <div className="space-y-0.5">
                            <span className="block font-bold text-foreground">
                              {meta?.courseTitle || 'غير محدد'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {meta?.subjectTitle || 'وحدة غير معروفة'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Files Count */}
                        <TableCell className="text-center px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                            {cw.materialKeys?.length || 0} ملفات
                          </span>
                        </TableCell>

                        {/* Created Date */}
                        <TableCell className="text-center px-4 text-xs text-muted-foreground">
                          {cw.createdAt && !isNaN(new Date(cw.createdAt).getTime())
                            ? new Date(cw.createdAt).toLocaleDateString('ar-EG')
                            : '—'}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="px-4">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(cw)}
                              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              title="تعديل"
                            >
                              <PenIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => cwId && handleDelete(cwId)}
                              className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                              title="حذف"
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

      {/* Modal */}
      <CreateCourseworkModal
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={loadAllData}
        coursework={editingCoursework}
        stages={stages}
        grades={grades}
        courses={courses}
      />
    </div>
  )
}
