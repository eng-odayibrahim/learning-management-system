'use client'
import { AddCircleIcon, BookBookmarkIcon, BookIcon, MagnifierIcon, RefreshIcon, SquareShareLineIcon, StarIcon, TrashBinTrashIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Course, AcademicStage, Grade, Track, Specialization } from '@/lib/types'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { CreateCourseModal } from './_components/create-course-modal'

export default function AdminCoursesManagerPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  
  // Taxonomy states
  const [stages, setStages] = useState<AcademicStage[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [specializations, setSpecializations] = useState<Specialization[]>([])
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [stageId, setStageId] = useState<string>('all')
  const [gradeId, setGradeId] = useState<string>('all')
  const [trackId, setTrackId] = useState<string>('all')
  const [specId, setSpecId] = useState<string>('all')

  const [loading, setLoading] = useState(true)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('courses', 'edit')

  const [openCreateCourse, setOpenCreateCourse] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null)
  const [deletingCourse, setDeletingCourse] = useState(false)

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return
    setDeletingCourse(true)
    try {
      await api.deleteCourse(courseToDelete.id)
      setCourses(prev => prev.filter(c => c.id !== courseToDelete.id))
      setCourseToDelete(null)
    } catch (err: any) {
      alert(err.message || 'فشل حذف المقرر')
    } finally {
      setDeletingCourse(false)
    }
  }

  // 1. Load Taxonomy first
  useEffect(() => {
    loadTaxonomy()
  }, [])

  // 2. Load Courses whenever filters change
  useEffect(() => {
    loadCourses()
  }, [stageId, gradeId, trackId, specId])

  const loadTaxonomy = async () => {
    try {
      const taxRes = await api.getTaxonomy(true)
      if (taxRes) {
        setStages(taxRes.stages || [])
        setGrades(taxRes.grades || [])
        setTracks(taxRes.tracks || [])
        setSpecializations(taxRes.specializations || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadCourses = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (stageId !== 'all') filters.stageId = stageId
      if (gradeId !== 'all') filters.gradeId = gradeId
      if (trackId !== 'all') filters.trackId = trackId
      if (specId !== 'all') filters.specializationId = specId
      
      const res = await api.getCourses(filters, 1, 100)
      setCourses(res?.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublish = async (course: Course) => {
    if (!canEdit) return
    try {
      // Optimistic update
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isPublished: !c.isPublished } : c))
      await api.publishCourse(course.id, !course.isPublished)
    } catch (err: any) {
      // Revert if failed
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isPublished: course.isPublished } : c))
      alert(err.message || 'فشل تغيير حالة النشر')
    }
  }

  // Local text search
  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Cascading grades based on selected stage
  const availableGrades = useMemo(() => {
    if (stageId === 'all') return grades
    return grades.filter((g) => g.stageId === stageId)
  }, [grades, stageId])

  const renderTaxonomyCell = (c: Course) => {
    const s = stages.find(x => x.id === c.stageId)?.name
    const g = grades.find(x => x.id === c.gradeId)?.name

    const activeTrackIds = c.trackIds?.length ? c.trackIds : (c.trackId ? [c.trackId] : [])
    const assignedTracks = tracks.filter(t => activeTrackIds.includes(t.id)).map(t => t.name)

    const activeSpecIds = c.specializationIds?.length ? c.specializationIds : (c.specializationId ? [c.specializationId] : [])
    const assignedSpecs = specializations.filter(sp => activeSpecIds.includes(sp.id)).map(sp => sp.name)

    if (!s && !g) {
      return (
        <Badge variant="outline" className="text-[10px] font-bold text-destructive border-destructive/30 bg-destructive/5 rounded-full">
          غير مصنف
        </Badge>
      )
    }

    const isShared = assignedTracks.length > 1 || assignedSpecs.length > 1

    return (
      <div className="flex flex-col gap-1 items-start text-right">
        <span className="text-xs font-bold text-foreground">
          {s} {g ? `• الصف ${g}` : ''}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {isShared && (
            <Badge variant="outline" className="text-[9px] font-black text-amber-600 bg-amber-500/10 border-amber-500/30 rounded-full px-1.5 py-0">
              مشترك
            </Badge>
          )}
          {assignedTracks.map((tName, i) => (
            <Badge key={i} variant="outline" className="text-[10px] font-semibold text-primary bg-primary/5 border-primary/20 rounded-full px-1.5 py-0">
              {tName}
            </Badge>
          ))}
          {assignedSpecs.map((spName, i) => (
            <Badge key={i} variant="outline" className="text-[10px] font-semibold text-muted-foreground bg-muted border-border rounded-full px-1.5 py-0">
              {spName}
            </Badge>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Top Actions Bar ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black flex items-center gap-2 text-foreground">
          <BookBookmarkIcon className="h-5 w-5 text-primary" />
          إدارة المقررات الدراسية
          <Badge variant="outline" className="font-bold text-xs rounded-full">{filteredCourses.length} مقرر</Badge>
        </h2>
        {canEdit && (
          <Button
            onClick={() => setOpenCreateCourse(true)}
            className="font-bold gap-2 rounded-full shadow-none"
          >
            <AddCircleIcon className="h-4 w-4" />
            <span>مقرر جديد</span>
          </Button>
        )}
      </div>

      {/* ── Filters Bar ── */}
      <Card className="shadow-none border-border">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:w-80 lg:w-96 shrink-0">
            <MagnifierIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              dir="rtl"
              placeholder="بحث باسم المقرر..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-3 pr-9 h-10 font-semibold text-sm rounded-xl w-full"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:mr-auto md:w-auto">
            <Select
              value={stageId}
              onValueChange={(val) => {
                setStageId(val)
                setGradeId('all')
                setTrackId('all')
                setSpecId('all')
              }}
              dir="rtl"
            >
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl w-full md:w-36" dir="rtl">
                <SelectValue placeholder="المرحلة الدراسية" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل المراحل</SelectItem>
                {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={gradeId} onValueChange={setGradeId} dir="rtl">
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl w-full md:w-48" dir="rtl">
                <SelectValue placeholder="الصف الدراسي" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل الصفوف</SelectItem>
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

            <Select value={trackId} onValueChange={setTrackId} dir="rtl">
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl w-full md:w-36" dir="rtl">
                <SelectValue placeholder="المسار" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل المسارات</SelectItem>
                {tracks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={specId} onValueChange={setSpecId} dir="rtl">
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl w-full md:w-36" dir="rtl">
                <SelectValue placeholder="التخصص" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل التخصصات</SelectItem>
                {specializations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Courses Table ── */}
      <Card className="shadow-none border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs font-bold text-muted-foreground flex flex-col items-center gap-2">
              <RefreshIcon className="h-6 w-6 animate-spin text-primary" />
              جاري تحميل المقررات...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-16 text-center text-sm font-bold text-muted-foreground">
              لا توجد مقررات تطابق البحث.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-right px-4 text-muted-foreground font-bold">الصورة</TableHead>
                    <TableHead className="text-right px-4 text-muted-foreground font-bold">عنوان المقرر</TableHead>
                    <TableHead className="text-right px-4 text-muted-foreground font-bold">الهيكل التعليمي</TableHead>
                    <TableHead className="text-right px-4 text-muted-foreground font-bold">النشر</TableHead>
                    <TableHead className="text-right px-4 text-muted-foreground font-bold">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((c) => (
                    <TableRow
                      key={c.id}
                      onClick={() => router.push(`/dashboard/courses/${c.id}`)}
                      className="border-border cursor-pointer transition-colors hover:bg-muted/50 group"
                    >
                      {/* Thumbnail */}
                      <TableCell className="py-3 px-4">
                        <div className="h-12 w-20 rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                          {c.thumbnail ? (
                            <img src={c.thumbnail} alt={c.title} className="h-full w-full object-cover" />
                          ) : (
                            <BookBookmarkIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Title */}
                      <TableCell className="py-3 px-4">
                        <span className="font-black text-sm text-foreground">
                          {c.title}
                        </span>
                      </TableCell>
                      
                      {/* Taxonomy */}
                      <TableCell className="py-3 px-4">
                        {renderTaxonomyCell(c)}
                      </TableCell>
                      
                      {/* Switch (Publish Status) */}
                      <TableCell className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={c.isPublished}
                            onCheckedChange={() => handleTogglePublish(c)}
                            disabled={!canEdit}
                          />
                          <span className="text-xs font-semibold text-muted-foreground w-12">
                            {c.isPublished ? 'منشور' : 'مسودة'}
                          </span>
                        </div>
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" title="معاينة المقرر كطالب">
                            <Link href={`/courses/${c.id}`} target="_blank">
                              <SquareShareLineIcon className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setCourseToDelete(c)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="حذف المقرر"
                            >
                              <TrashBinTrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={Boolean(courseToDelete)}
        onOpenChange={(open) => !open && setCourseToDelete(null)}
        title="حذف المقرر الدراسي"
        itemName={courseToDelete?.title}
        description="هل أنت متأكد من رغبتك في حذف هذا المقرر؟ سيتم إخفاء وحذف المقرر وجميع الوحدات والدروس التابعة له."
        loading={deletingCourse}
        onConfirm={handleDeleteCourse}
      />

      <CreateCourseModal
        open={openCreateCourse}
        onOpenChange={setOpenCreateCourse}
        onSuccess={(newCourse) => {
          setOpenCreateCourse(false)
          loadCourses() // reload to get proper data
          router.push(`/dashboard/courses/${newCourse.id}`)
        }}
        stages={stages}
        grades={grades}
        tracks={tracks}
        specializations={specializations}
      />
    </div>
  )
}