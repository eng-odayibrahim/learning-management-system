'use client'
import { AddCircleIcon, BookBookmarkIcon, BookIcon, BranchingPathsDownIcon, CheckCircleIcon, CheckReadIcon, CheckSquareIcon, CloseCircleIcon, DangerCircleIcon, DiplomaIcon, LayersIcon, Pen2Icon, PenIcon, PipetteIcon, RefreshIcon, StarIcon, TestTubeIcon, TrashBinTrashIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { AcademicStage, Grade, Track, Specialization } from '@/lib/types'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { ImageUploadWidget } from '@/components/shared/image-upload-widget'

type TabType = 'stages' | 'grades' | 'tracks' | 'specializations'

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('stages')
  const [stages, setStages] = useState<AcademicStage[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [specializations, setSpecializations] = useState<Specialization[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [gradeStageFilter, setGradeStageFilter] = useState('all')

  // Form state
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [image, setImage] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [relatedStageId, setRelatedStageId] = useState('')
  const [relatedGradeIds, setRelatedGradeIds] = useState<string[]>([])
  const [relatedTrackIds, setRelatedTrackIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('categories', 'edit')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [sData, gData, tData, spData] = await Promise.all([
        api.getStages(true),
        api.getGrades(true),
        api.getTracks(true),
        api.getSpecializations(true)
      ])
      setStages(sData)
      setGrades(gData)
      setTracks(tData)
      setSpecializations(spData)
    } catch (err: any) {
      toast.error(err.message || 'فشل في تحميل بيانات الفئات التعليمية')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setIsEditing(false)
    setEditId(null)
    setName('')
    setImage('')
    setDescription('')
    setIsActive(true)
    setRelatedStageId('')
    setRelatedGradeIds([])
    setRelatedTrackIds([])
    setIsModalOpen(false)
  }

  const handleEdit = (item: any) => {
    setIsEditing(true)
    setEditId(item.id)
    setName(item.name.toString())
    setImage(item.image || '')
    setDescription(item.description || '')
    setIsActive(item.isActive ?? true)
    setRelatedStageId(item.stageId || '')
    setRelatedGradeIds(item.gradeIds || [])
    setRelatedTrackIds(item.trackIds || [])
    setIsModalOpen(true)
  }

  const handleOpenNew = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الفئة')
      return
    }
    setSubmitting(true)

    try {
      if (activeTab === 'stages') {
        const payload = { name, isActive, image: image.trim() || undefined, description: description.trim() || undefined }
        if (isEditing && editId) {
          await api.updateStage(editId, payload)
        } else {
          await api.createStage(payload)
        }
      } else if (activeTab === 'grades') {
        if (!relatedStageId) throw new Error('اختر المرحلة الدراسية')
        if (isEditing && editId) {
          await api.updateGrade(editId, { name: Number(name), stageId: relatedStageId, isActive })
        } else {
          await api.createGrade({ name: Number(name), stageId: relatedStageId, isActive })
        }
      } else if (activeTab === 'tracks') {
        if (isEditing && editId) {
          await api.updateTrack(editId, { name, gradeIds: relatedGradeIds, isActive })
        } else {
          await api.createTrack({ name, gradeIds: relatedGradeIds, isActive })
        }
      } else if (activeTab === 'specializations') {
        if (isEditing && editId) {
          await api.updateSpecialization(editId, { name, trackIds: relatedTrackIds, isActive })
        } else {
          await api.createSpecialization({ name, trackIds: relatedTrackIds, isActive })
        }
      }

      toast.success(isEditing ? 'تم تحديث البيانات بنجاح' : 'تمت الإضافة بنجاح')
      resetForm()
      await loadAll()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء حفظ البيانات')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا العنصر؟')) return
    try {
      if (activeTab === 'stages') await api.deleteStage(id)
      else if (activeTab === 'grades') await api.deleteGrade(id)
      else if (activeTab === 'tracks') await api.deleteTrack(id)
      else if (activeTab === 'specializations') await api.deleteSpecialization(id)

      toast.success('تم الحذف بنجاح')
      await loadAll()
    } catch (err: any) {
      toast.error(err.message || 'فشل في عملية الحذف')
    }
  }

  const filteredGrades = gradeStageFilter === 'all' ? grades : grades.filter((g) => g.stageId === gradeStageFilter)

  const tabs: { id: TabType; label: string; icon: typeof DiplomaIcon }[] = [
    { id: 'stages', label: 'المراحل الدراسية', icon: DiplomaIcon },
    { id: 'grades', label: 'الصفوف الدراسية', icon: BookBookmarkIcon },
    { id: 'tracks', label: 'المسارات', icon: BranchingPathsDownIcon },
    { id: 'specializations', label: 'التخصصات', icon: PipetteIcon },
  ]

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Tabs Navigation — pill nav, always a single row; icon-only on small screens */}
      <div className="flex flex-nowrap items-center gap-2 p-1.5 bg-card rounded-full transition-colors overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            onClick={() => { setActiveTab(tab.id); resetForm(); }}
            className={`flex-1 gap-2.5 rounded-full font-bold transition-all py-6 shadow-none whitespace-nowrap ${activeTab === tab.id
                ? 'bg-foreground text-background hover:bg-foreground/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-background'
              }`}
          >
            <tab.icon className="h-6 w-6 sm:h-7 sm:w-7 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Dialog Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-extrabold flex items-center gap-2">
              {isEditing ? <Pen2Icon className="h-5 w-5 text-primary" /> : <AddCircleIcon className="h-5 w-5 text-primary" />}
              {isEditing ? 'تعديل البيانات' : 'إضافة فئة جديدة'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل البيانات لتظهر في قوائم المقررات
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name" className="font-bold text-sm">
                    الاسم <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="item-name"
                    type={activeTab === 'grades' ? 'number' : 'text'}
                    placeholder={
                      activeTab === 'stages' ? 'مثال: المرحلة الأساسية / المرحلة الثانوية' :
                        activeTab === 'grades' ? 'مثال: 1 / 2 / 3' :
                          activeTab === 'tracks' ? 'مثال: المسار العلمي / المسار الأدبي' :
                            'مثال: هندسة وبرمجيات / أحياء وطب'
                    }
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 font-semibold"
                    required
                  />
                </div>

                {activeTab === 'grades' && (
                  <div className="space-y-2">
                    <Label className="font-bold text-sm">المرحلة الدراسية</Label>
                    <select required value={relatedStageId} onChange={(e) => setRelatedStageId(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm">
                      <option value="">اختر المرحلة</option>
                      {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                    </select>
                  </div>
                )}
                {activeTab === 'tracks' && (
                  <div className="space-y-2">
                    <Label className="font-bold text-sm">الصفوف التي ينطبق عليها المسار</Label>
                    <p className="text-xs text-muted-foreground">اترك دون تحديد ليكون المسار متاحاً لكل الصفوف.</p>
                    {grades.map((grade) => <label key={grade.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={relatedGradeIds.includes(grade.id)} onChange={(e) => setRelatedGradeIds((ids) => e.target.checked ? [...ids, grade.id] : ids.filter((id) => id !== grade.id))} />الصف {grade.name} ({stages.find((stage) => stage.id === grade.stageId)?.name || 'مرحلة غير محددة'})</label>)}
                  </div>
                )}
                {activeTab === 'specializations' && (
                  <div className="space-y-2">
                    <Label className="font-bold text-sm">المسارات التي ينتمي إليها التخصص</Label>
                    <p className="text-xs text-muted-foreground">اترك دون تحديد ليكون التخصص عاماً.</p>
                    {tracks.map((track) => <label key={track.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={relatedTrackIds.includes(track.id)} onChange={(e) => setRelatedTrackIds((ids) => e.target.checked ? [...ids, track.id] : ids.filter((id) => id !== track.id))} />{track.name}</label>)}
                  </div>
                )}
                
                {activeTab === 'stages' && (
                  <>
                    <div className="pt-1">
                      <ImageUploadWidget
                        label="الصورة (اختياري)"
                        folder="categories"
                        value={image}
                        onChange={setImage}
                      />
                    </div>
                    <div className="space-y-2 pt-1">
                      <Label htmlFor="item-desc" className="font-bold text-sm text-muted-foreground">
                        الوصف (اختياري)
                      </Label>
                      <Input
                        id="item-desc"
                        type="text"
                        placeholder="وصف مختصر للمرحلة..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-11 font-semibold"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 gap-3 pt-1">
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center space-x-2 space-x">
                      <Switch
                        id="is-active"
                        checked={isActive}
                        onCheckedChange={setIsActive}
                      />
                      <Label htmlFor="is-active" className="font-bold text-sm cursor-pointer">
                        {isActive ? 'مفعّل' : 'معطّل'}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button
                    type="submit"
                    disabled={submitting || !name.trim()}
                    className="flex-1 h-11 font-bold"
                  >
                    {submitting ? (
                      <RefreshIcon className="h-5 w-5 animate-spin" />
                    ) : isEditing ? (
                      'حفظ التعديلات'
                    ) : (
                      'إضافة الآن'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="h-11 font-bold px-4"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* List Panel */}
      <div className="w-full">
        <Card className="shadow-none border-border bg-transparent sm:bg-card">
          <CardHeader className="px-0 sm:px-6 pb-4 mb-4 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-extrabold text-xl text-foreground">
                {
                  activeTab === 'stages' ? 'المراحل الدراسية' :
                    activeTab === 'grades' ? 'الصفوف الدراسية' :
                      activeTab === 'tracks' ? 'المسارات الأكاديمية' :
                        'التخصصات العلمية'
                }
              </CardTitle>
                <CardDescription className="text-sm font-semibold mt-1">
                  العدد الكلي: {
                    activeTab === 'stages' ? stages.length :
                      activeTab === 'grades' ? filteredGrades.length :
                        activeTab === 'tracks' ? tracks.length :
                          specializations.length
                  }
                </CardDescription>
              </div>
              {canEdit && (
                <Button onClick={handleOpenNew} className="gap-2 font-bold shadow-none">
                  <AddCircleIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">إضافة جديد</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <RefreshIcon className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">جاري تحميل البيانات...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTab === 'grades' && (
                    <div className="flex items-center gap-2 px-1">
                      <Label className="text-xs font-bold text-muted-foreground">تصفية حسب المرحلة:</Label>
                      <select
                        value={gradeStageFilter}
                        onChange={(e) => setGradeStageFilter(e.target.value)}
                        className="h-8 px-2.5 rounded-xl border border-border bg-card text-xs font-semibold"
                      >
                        <option value="all">كل المراحل ({grades.length})</option>
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({grades.filter((g) => g.stageId === s.id).length})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          {activeTab === 'stages' && <TableHead className="w-[100px] font-bold text-right">الصورة</TableHead>}
                          <TableHead className="font-bold text-right">الاسم</TableHead>
                          {activeTab === 'grades' && <TableHead className="font-bold text-right">المرحلة الدراسية</TableHead>}
                          {activeTab === 'stages' && <TableHead className="font-bold text-right hidden md:table-cell">الوصف</TableHead>}
                          <TableHead className="w-[100px] font-bold text-center">الحالة</TableHead>
                          {canEdit && <TableHead className="text-left font-bold w-[120px]">الإجراءات</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(activeTab === 'stages' ? stages :
                          activeTab === 'grades' ? filteredGrades :
                            activeTab === 'tracks' ? tracks :
                              specializations
                        ).map((item: any) => (
                          <TableRow key={item.id} className="group hover:bg-muted/50 transition-colors">
                            {activeTab === 'stages' && (
                              <TableCell>
                                <div className="h-12 w-16 rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center relative shrink-0">
                                  {item.image && (item.image.startsWith('http') || item.image.startsWith('/')) ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <DiplomaIcon className="h-6 w-6 text-muted-foreground opacity-50" />
                                  )}
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="font-black text-base text-foreground">
                              {activeTab === 'grades' ? `الصف ${item.name}` : item.name}
                            </TableCell>
                            {activeTab === 'grades' && (
                              <TableCell className="text-sm font-bold">
                                {(() => {
                                  const stage = stages.find((s) => s.id === item.stageId)
                                  return stage ? (
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                      {stage.name}
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                                      غير مرتبط بمرحلة
                                    </Badge>
                                  )
                                })()}
                              </TableCell>
                            )}
                            {activeTab === 'stages' && (
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                                {item.description || <span className="opacity-50">لا يوجد وصف</span>}
                              </TableCell>
                            )}
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                {item.isActive ? (
                                  <Badge variant="default" className="bg-primary/10 text-primary border-primary/20 gap-1.5 shadow-none">
                                    <CheckCircleIcon className="h-3.5 w-3.5" /> مفعّل
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5 shadow-none">
                                    <CloseCircleIcon className="h-3.5 w-3.5" /> معطّل
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          {canEdit && (
                            <TableCell className="text-left">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(item)}
                                  className="h-8 w-8 rounded-full hover:bg-muted"
                                  title="تعديل"
                                >
                                  <Pen2Icon className="h-4 w-4 text-foreground/70" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item.id)}
                                  className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  title="حذف"
                                >
                                  <TrashBinTrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {(activeTab === 'stages' ? stages :
                        activeTab === 'grades' ? filteredGrades :
                          activeTab === 'tracks' ? tracks :
                            specializations
                      ).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={activeTab === 'stages' ? (canEdit ? 5 : 4) : activeTab === 'grades' ? (canEdit ? 4 : 3) : (canEdit ? 3 : 2)} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <LayersIcon className="h-10 w-10 opacity-20 mb-3" />
                              <p className="font-bold">لا توجد عناصر مضافة حتى الآن</p>
                              <p className="text-xs opacity-70 mt-1">استخدم زر إضافة جديد لإضافة أول عنصر</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            </CardContent>
          </Card>
        </div>
    </div>
  )
}
