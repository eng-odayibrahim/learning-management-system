'use client'
import { AddCircleIcon, ArrowLeftIcon, BookBookmarkIcon, BookIcon, LayersIcon, RefreshIcon, SettingsIcon, TrashBinTrashIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { CurriculumTreeCourse, Lesson, AcademicStage, Grade, Track, Specialization } from '@/lib/types'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'

import { EditCourseModal } from '../_components/edit-course-modal'
import { CreateSubjectModal } from '../_components/create-subject-modal'

export default function AdminCourseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('courses', 'edit')

  const [curriculumTree, setCurriculumTree] = useState<CurriculumTreeCourse | null>(null)
  const [loadingTree, setLoadingTree] = useState(true)

  // Taxonomy for course editing and display
  const [stages, setStages] = useState<AcademicStage[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [specializations, setSpecializations] = useState<Specialization[]>([])

  // Modals State
  const [openEditCourse, setOpenEditCourse] = useState(false)
  const [openCreateSubject, setOpenCreateSubject] = useState(false)

  // Deletion states
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false)
  const [deletingCourse, setDeletingCourse] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: string; title: string } | null>(null)
  const [deletingSubject, setDeletingSubject] = useState(false)

  const handleDeleteCourse = async () => {
    setDeletingCourse(true)
    try {
      await api.deleteCourse(courseId)
      router.push('/dashboard/courses')
    } catch (err: any) {
      alert(err.message || 'فشل حذف المقرر')
      setDeletingCourse(false)
    }
  }

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return
    setDeletingSubject(true)
    try {
      await api.deleteSubject(subjectToDelete.id)
      setSubjectToDelete(null)
      loadTree()
    } catch (err: any) {
      alert(err.message || 'فشل حذف الوحدة')
    } finally {
      setDeletingSubject(false)
    }
  }

  useEffect(() => {
    if (courseId) {
      loadTree()
      loadTaxonomy()
    }
  }, [courseId])

  const loadTaxonomy = async () => {
    try {
      const taxRes = await api.getTaxonomy(true)
      if (taxRes) {
        setStages(taxRes.stages || [])
        setGrades(taxRes.grades || [])
        setTracks(taxRes.tracks || [])
        setSpecializations(taxRes.specializations || [])
      }
    } catch (e) { }
  }

  const loadTree = async () => {
    setLoadingTree(true)
    try {
      const tree = await api.getCurriculumTree(courseId)
      setCurriculumTree(tree)
    } catch (e) {
      setCurriculumTree(null)
    } finally {
      setLoadingTree(false)
    }
  }

  const getTaxonomyName = (id: string | null | undefined, list: { id: string; name: string | number }[]) => {
    if (!id) return null
    return list.find(x => x.id === id)?.name
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/courses')} className="rounded-full text-foreground hover:bg-muted">
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-black flex items-center gap-2 text-foreground">
          <BookBookmarkIcon className="h-5 w-5 text-primary" />
          إدارة المقرر الدراسي
        </h2>
      </div>

      {!loadingTree && !curriculumTree ? (
        <div className="py-16 text-center border-dashed border-2 border-border rounded-xl bg-muted/30 p-8 space-y-4">
          <h3 className="text-lg font-bold text-foreground">المقرر الدراسي غير موجود أو تم حذفه</h3>
          <p className="text-xs text-muted-foreground">ربما تم حذف هذا المقرر أو أن الرابط غير صحيح.</p>
          <Button onClick={() => router.push('/dashboard/courses')} size="sm" className="rounded-full font-bold">
            العودة لقائمة المقررات
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
          <div className="p-5 border-b border-border rounded-t-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-5 w-full">
              {curriculumTree?.thumbnail && (curriculumTree.thumbnail.startsWith('http') || curriculumTree.thumbnail.startsWith('/')) && (
                <div className="h-20 w-32 rounded-xl overflow-hidden border border-border shrink-0">
                  <img src={curriculumTree.thumbnail} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="space-y-2 text-center md:text-right flex-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <Badge className={`font-bold text-[10px] px-2 py-0.5 shadow-none rounded-full ${curriculumTree?.isPublished ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`} variant={curriculumTree?.isPublished ? 'default' : 'outline'}>
                    {curriculumTree?.isPublished ? 'منشور للعامة' : 'مسودة'}
                  </Badge>
                  
                  {/* Taxonomy Details */}
                  {curriculumTree?.stageId && (
                    <Badge variant="secondary" className="font-semibold text-[10px] rounded-full">
                      المرحلة: {getTaxonomyName(curriculumTree.stageId, stages)}
                    </Badge>
                  )}
                  {curriculumTree?.gradeId && (
                    <Badge variant="secondary" className="font-semibold text-[10px] rounded-full">
                      الصف: {getTaxonomyName(curriculumTree.gradeId, grades)}
                    </Badge>
                  )}
                  {curriculumTree?.trackId && (
                    <Badge variant="secondary" className="font-semibold text-[10px] rounded-full">
                      المسار: {getTaxonomyName(curriculumTree.trackId, tracks)}
                    </Badge>
                  )}
                  {curriculumTree?.specializationId && (
                    <Badge variant="secondary" className="font-semibold text-[10px] rounded-full">
                      التخصص: {getTaxonomyName(curriculumTree.specializationId, specializations)}
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-black text-foreground">{curriculumTree?.title}</h2>
                {curriculumTree?.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{curriculumTree.description}</p>
                )}
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  onClick={() => setOpenEditCourse(true)}
                  variant="outline"
                  size="sm"
                  className="font-bold gap-1 text-xs rounded-full shadow-none"
                >
                  <SettingsIcon className="h-3.5 w-3.5" />
                  <span>تعديل المقرر</span>
                </Button>
                <Button
                  onClick={() => setOpenCreateSubject(true)}
                  variant="outline"
                  size="sm"
                  className="font-bold gap-1 text-xs rounded-full shadow-none"
                >
                  <AddCircleIcon className="h-3.5 w-3.5" />
                  <span>إضافة وحدة</span>
                </Button>
                <Button
                  onClick={() => setDeleteCourseOpen(true)}
                  variant="destructive"
                  size="sm"
                  className="font-bold gap-1 text-xs rounded-full shadow-none"
                >
                  <TrashBinTrashIcon className="h-3.5 w-3.5" />
                  <span>حذف المقرر</span>
                </Button>
              </div>
            )}
          </div>

          <CardContent className="p-5 space-y-4">
            {loadingTree ? (
              <div className="py-12 text-center">
                <RefreshIcon className="mx-auto h-8 w-8 animate-spin text-primary mb-3" />
                <span className="text-sm font-bold text-muted-foreground">جاري تحميل هيكل المنهج...</span>
              </div>
            ) : !curriculumTree?.subjects || curriculumTree.subjects.length === 0 ? (
              <div className="py-12 text-center border-dashed border-2 border-border rounded-xl bg-muted/50">
                <LayersIcon className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                <h4 className="text-base font-bold text-foreground">لا توجد وحدات دراسية مضافة حتى الآن</h4>
                <p className="text-xs text-muted-foreground font-medium mb-3">ابدأ بإضافة أول وحدة دراسية لهذا المقرر</p>
                {canEdit && (
                  <Button onClick={() => setOpenCreateSubject(true)} size="sm" className="font-bold rounded-full shadow-none">إضافة وحدة</Button>
                )}
              </div>
            ) : (
              curriculumTree.subjects.map(({ subject, classes }, sIdx) => {
                const allLessons = classes.flatMap(c => c.lessons)
                const allQuizzes = classes.flatMap(c => c.quizzes || [])
                return (
                  <div key={subject.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/20 border border-border rounded-xl gap-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary font-black text-lg">
                        {sIdx + 1}
                      </div>
                      <div className="space-y-1">
                        <Link href={`/dashboard/courses/${courseId}/subjects/${subject.id}`} className="text-lg font-black text-foreground hover:text-primary transition-colors">
                          {subject.title}
                        </Link>
                        <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                          <span>{allLessons.length} درس</span>
                          {allQuizzes.length > 0 && <span>• {allQuizzes.length} اختبار</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-xs font-bold">{subject.isActive ? 'مفعل' : 'معطل'}</span>
                        <Switch
                          checked={subject.isActive}
                          disabled={!canEdit}
                          onCheckedChange={async (checked) => {
                            try {
                              await api.updateSubject(subject.id, { isActive: checked })
                              loadTree()
                            } catch (e: any) {
                              alert('حدث خطأ أثناء تعديل حالة الوحدة')
                            }
                          }}
                        />
                      </div>
                      <Button
                        asChild
                        size="sm"
                        className="font-bold rounded-full px-4 shadow-none gap-2"
                      >
                        <Link href={`/dashboard/courses/${courseId}/subjects/${subject.id}`}>
                          إدارة الدروس <ArrowLeftIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSubjectToDelete({ id: subject.id, title: subject.title })}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="حذف الوحدة"
                        >
                          <TrashBinTrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Delete Course Dialog */}
      <ConfirmDeleteDialog
        open={deleteCourseOpen}
        onOpenChange={setDeleteCourseOpen}
        title="حذف المقرر الدراسي"
        itemName={curriculumTree?.title}
        description="هل أنت متأكد من رغبتك في حذف هذا المقرر بالكامل؟ سيتم إخفاء وحذف المقرر وجميع الوحدات والدروس والاختبارات التابعة له."
        loading={deletingCourse}
        onConfirm={handleDeleteCourse}
      />

      {/* Delete Subject Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(subjectToDelete)}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
        title="حذف الوحدة الدراسية"
        itemName={subjectToDelete?.title}
        description="هل أنت متأكد من رغبتك في حذف هذه الوحدة؟ سيتم حذف جميع الدروس والاختبارات التابعة لها."
        loading={deletingSubject}
        onConfirm={handleDeleteSubject}
      />

      {/* ── Modals ── */}
      <EditCourseModal
        open={openEditCourse}
        onOpenChange={setOpenEditCourse}
        onSuccess={loadTree}
        courseId={courseId}
        curriculumTree={curriculumTree}
        stages={stages}
        grades={grades}
        tracks={tracks}
        specializations={specializations}
      />

      <CreateSubjectModal
        open={openCreateSubject}
        onOpenChange={setOpenCreateSubject}
        onSuccess={loadTree}
        courseId={courseId}
        order={(curriculumTree?.subjects?.length || 0) * 10}
      />
    </div>
  )
}