'use client'
import { AddCircleIcon, ArrowRightIcon, EyeIcon, RefreshIcon, SettingsIcon, TrashBinTrashIcon, VideocameraIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { CurriculumTreeCourse, Lesson } from '@/lib/types'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'

import { CreateLessonModal } from '../../../_components/create-lesson-modal'
import { EditLessonModal } from '../../../_components/edit-lesson-modal'

export default function SubjectLessonsPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const subjectId = params.subjectId as string
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('courses', 'edit')

  const [curriculumTree, setCurriculumTree] = useState<CurriculumTreeCourse | null>(null)
  const [loadingTree, setLoadingTree] = useState(true)

  // Modals
  const [openCreateLesson, setOpenCreateLesson] = useState(false)
  const [openEditLesson, setOpenEditLesson] = useState(false)
  const [editLessonData, setEditLessonData] = useState<Lesson | null>(null)

  // Delete Lesson state
  const [lessonToDelete, setLessonToDelete] = useState<{ id: string; title: string } | null>(null)
  const [deletingLesson, setDeletingLesson] = useState(false)

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return
    setDeletingLesson(true)
    try {
      await api.deleteLesson(lessonToDelete.id)
      setLessonToDelete(null)
      loadTree()
    } catch (err: any) {
      alert(err.message || 'فشل حذف الدرس')
    } finally {
      setDeletingLesson(false)
    }
  }

  useEffect(() => {
    if (courseId) {
      loadTree()
    }
  }, [courseId])

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

  const openEditModal = (lesson: any) => {
    setEditLessonData(lesson)
    setOpenEditLesson(true)
  }

  const subjectData = curriculumTree?.subjects?.find(s => s.subject.id === subjectId)
  const allLessons = subjectData?.classes ? subjectData.classes.flatMap(c => c?.lessons || []) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/courses/${courseId}`)} className="rounded-full text-foreground hover:bg-muted">
          <ArrowRightIcon className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-black text-foreground">
            {subjectData ? subjectData.subject.title : 'دروس الوحدة'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة الدروس الخاصة بهذه الوحدة
          </p>
        </div>
        <div className="mr-auto">
          <Button
            onClick={() => setOpenCreateLesson(true)}
            size="sm"
            className="font-bold gap-2 rounded-full shadow-none"
            disabled={!subjectData || !canEdit}
          >
            <AddCircleIcon className="h-4 w-4" /> إضافة درس
          </Button>
        </div>
      </div>

      <Card className="shadow-none border-border">
        <CardContent className="p-0">
          {loadingTree ? (
            <div className="py-12 text-center">
              <RefreshIcon className="mx-auto h-8 w-8 animate-spin text-primary mb-3" />
              <span className="text-sm font-bold text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : !subjectData ? (
            <div className="py-12 text-center">
              <span className="text-sm font-bold text-muted-foreground">الوحدة غير موجودة</span>
            </div>
          ) : allLessons.length === 0 ? (
            <div className="text-sm text-center font-bold text-muted-foreground/70 py-12">
              لا توجد دروس مضافة في هذه الوحدة حتى الآن.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {allLessons.map((lesson, lIdx) => (
                <div key={lesson.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 hover:bg-muted/30 transition-colors">
                  
                  {/* Cover */}
                  <div className="h-16 w-24 shrink-0 bg-muted rounded-lg overflow-hidden border border-border relative">
                    {(lesson as any).coverImage && ((lesson as any).coverImage.startsWith('http') || (lesson as any).coverImage.startsWith('/')) ? (
                      <img src={(lesson as any).coverImage} alt={lesson.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center opacity-30">
                        <VideocameraIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h4 className="font-bold text-base text-foreground truncate" title={lesson.title}>
                      <span className="text-muted-foreground mr-1">الدرس {lIdx + 1}:</span> {lesson.title}
                    </h4>
                    <div className="text-xs font-semibold text-muted-foreground mt-2 flex flex-wrap items-center gap-4">
                      <span className="bg-muted/50 px-2 py-1 rounded-md">
                        فيديو: {
                          lesson.videoStatus === 'ready' ? 'تم' :
                          lesson.videoStatus === 'pending' ? 'قيد الانتظار' :
                          lesson.videoStatus === 'processing' ? 'جاري التجهيز' : 'خطأ'
                        }
                      </span>
                      {lesson.videoDuration ? (
                        <span>المدة: {Math.floor(lesson.videoDuration / 60)}:{String(Math.floor(lesson.videoDuration % 60)).padStart(2, '0')}</span>
                      ) : null}
                    </div>
                  </div>
                  
                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-4 shrink-0 mt-4 sm:mt-0">
                      <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-full border border-border">
                        <span className="text-[10px] font-bold">{lesson.isPublished ? 'منشور' : 'مسودة'}</span>
                        <Switch
                          checked={lesson.isPublished}
                          disabled={!canEdit}
                          onCheckedChange={async (checked) => {
                            try {
                              await api.publishLesson(lesson.id, checked)
                              loadTree()
                            } catch (e) {
                              alert('حدث خطأ أثناء تعديل حالة الدرس')
                            }
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(lesson)}
                            className="h-8 text-xs font-bold gap-1.5 rounded-full shadow-none"
                          >
                            <SettingsIcon className="h-3.5 w-3.5" /> تعديل
                          </Button>
                        )}
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold gap-1.5 rounded-full shadow-none"
                        >
                          <Link href={`/courses/${curriculumTree?.id}/lessons/${lesson.id}`} target="_blank">
                            <EyeIcon className="h-3.5 w-3.5" /> معاينة
                          </Link>
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLessonToDelete({ id: lesson.id, title: lesson.title })}
                            className="h-8 text-xs font-bold gap-1 rounded-full shadow-none text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="حذف الدرس"
                          >
                            <TrashBinTrashIcon className="h-3.5 w-3.5" /> حذف
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Lesson Dialog */}
        <ConfirmDeleteDialog
          open={Boolean(lessonToDelete)}
          onOpenChange={(open) => !open && setLessonToDelete(null)}
          title="حذف الدرس"
          itemName={lessonToDelete?.title}
          description="هل أنت متأكد من رغبتك في حذف هذا الدرس؟ سيتم إخفاء وحذف الدرس ومحتواه."
          loading={deletingLesson}
          onConfirm={handleDeleteLesson}
        />

        {/* Modals */}
        <CreateLessonModal
        open={openCreateLesson}
        onOpenChange={setOpenCreateLesson}
        onSuccess={loadTree}
        curriculumTree={curriculumTree}
        initialSubjectId={subjectId}
      />

      <EditLessonModal
        open={openEditLesson}
        onOpenChange={setOpenEditLesson}
        onSuccess={loadTree}
        lesson={editLessonData}
      />
    </div>
  )
}
