'use client'
import { AddCircleIcon, CheckCircleIcon, CheckSquareIcon, CopyIcon, DangerCircleIcon, EyeIcon, MagnifierIcon, Pen2Icon, RefreshIcon, StopIcon, TrashBinTrashIcon, UserPlusIcon, UsersGroupRoundedIcon } from '@solar-icons/react/outline';

import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { User, FullTaxonomy } from '@/lib/types'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { FinanceTab } from './finance-tab'
import { FamilyTab } from './family-tab'
import { SecurityTab } from './security-tab'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

import Link from 'next/link'

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<User[]>([])
  const [taxonomy, setTaxonomy] = useState<FullTaxonomy | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [placementFilter, setPlacementFilter] = useState<'all' | 'placed' | 'unplaced'>('all')

  // Selected students for batch actions
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Create Student Modal state
  const [openCreate, setOpenCreate] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phones, setPhones] = useState<{ number: string; relation: string }[]>([{ number: '', relation: '' }])
  const [stageId, setStageId] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [trackId, setTrackId] = useState('')
  const [specializationId, setSpecializationId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Single Student Placement Modal state
  const [editingStudent, setEditingStudent] = useState<User | null>(null)
  const [editStageId, setEditStageId] = useState('')
  const [editGradeId, setEditGradeId] = useState('')
  const [editTrackId, setEditTrackId] = useState('')
  const [editSpecializationId, setEditSpecializationId] = useState('')
  const [savingPlacement, setSavingPlacement] = useState(false)
  const [placementError, setPlacementError] = useState<string | null>(null)

  // Batch Placement Modal state
  const [openBatchModal, setOpenBatchModal] = useState(false)
  const [batchStageId, setBatchStageId] = useState('')
  const [batchGradeId, setBatchGradeId] = useState('')
  const [batchTrackId, setBatchTrackId] = useState('')
  const [batchSpecializationId, setBatchSpecializationId] = useState('')
  const [batchSubmitting, setBatchSubmitting] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)

  // Credentials modal state
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null)
  const [regenSubmitting, setRegenSubmitting] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('students', 'edit')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [studData, taxData] = await Promise.all([
        api.getStudents(),
        api.getTaxonomy(false),
      ])
      setStudents(studData || [])
      setTaxonomy(taxData || null)
    } catch (e) {
      // error
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 4000)
  }

  // Helper to check if student is in Secondary School Grade 3 (الصف الثالث الثانوي)
  const isSecondaryThirdGrade = (stageIdVal?: string, gradeIdVal?: string) => {
    if (!stageIdVal || !gradeIdVal || !taxonomy) return false
    const stage = taxonomy.stages.find((s) => s.id === stageIdVal)
    const grade = taxonomy.grades.find((g) => g.id === gradeIdVal)
    if (!stage || !grade) return false

    const normStage = (stage.name || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim()
    const isSecondary =
      normStage.includes('ثانوي') ||
      normStage.includes('secondary') ||
      normStage.includes('high')

    const rawGrade = String(grade.name || '').trim()
    const normGrade = rawGrade
      .toLowerCase()
      .replace(/^(الصف|صف)\s+/gi, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim()

    const isThird =
      normGrade === '3' ||
      normGrade === '٣' ||
      normGrade === '12' ||
      normGrade.includes('ثالث') ||
      normGrade.includes('ثاني عشر') ||
      normGrade === 'grade 3' ||
      normGrade === 'grade 12'

    return isSecondary && isThird
  }

  // Derived taxonomy lists for Create Modal
  const isCreateSec3 = isSecondaryThirdGrade(stageId, gradeId)
  const filteredGrades = taxonomy?.grades.filter((g) => !stageId || g.stageId === stageId) ?? []
  const filteredTracks = isCreateSec3
    ? (taxonomy?.tracks.filter((t) =>
        !gradeId || !t.gradeIds?.length || t.gradeIds.includes(gradeId)
      ) ?? [])
    : []
  const filteredSpecializations = isCreateSec3
    ? (taxonomy?.specializations.filter((sp) =>
        !trackId || !sp.trackIds?.length || sp.trackIds.includes(trackId)
      ) ?? [])
    : []

  // Derived taxonomy lists for Edit Placement Modal
  const isEditSec3 = isSecondaryThirdGrade(editStageId, editGradeId)
  const editFilteredGrades = taxonomy?.grades.filter((g) => !editStageId || g.stageId === editStageId) ?? []
  const editFilteredTracks = isEditSec3
    ? (taxonomy?.tracks.filter((t) =>
        !editGradeId || !t.gradeIds?.length || t.gradeIds.includes(editGradeId)
      ) ?? [])
    : []
  const editFilteredSpecializations = isEditSec3
    ? (taxonomy?.specializations.filter((sp) =>
        !editTrackId || !sp.trackIds?.length || sp.trackIds.includes(editTrackId)
      ) ?? [])
    : []

  // Derived taxonomy lists for Batch Placement Modal
  const isBatchSec3 = isSecondaryThirdGrade(batchStageId, batchGradeId)
  const batchFilteredGrades = taxonomy?.grades.filter((g) => !batchStageId || g.stageId === batchStageId) ?? []
  const batchFilteredTracks = isBatchSec3
    ? (taxonomy?.tracks.filter((t) =>
        !batchGradeId || !t.gradeIds?.length || t.gradeIds.includes(batchGradeId)
      ) ?? [])
    : []
  const batchFilteredSpecializations = isBatchSec3
    ? (taxonomy?.specializations.filter((sp) =>
        !batchTrackId || !sp.trackIds?.length || sp.trackIds.includes(batchTrackId)
      ) ?? [])
    : []

  const handleAddPhone = () => setPhones([...phones, { number: '', relation: '' }])
  const handleRemovePhone = (index: number) => {
    if (phones.length > 1) setPhones(phones.filter((_, i) => i !== index))
  }
  const handlePhoneChange = (index: number, field: 'number' | 'relation', value: string) => {
    const next = [...phones]
    next[index][field] = value
    setPhones(next)
  }

  const resetForm = () => {
    setFullName('')
    setPhones([{ number: '', relation: '' }])
    setStageId('')
    setGradeId('')
    setTrackId('')
    setSpecializationId('')
    setError(null)
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!stageId || !gradeId) {
      setError('المرحلة الدراسية والصف الدراسي مطلوبان')
      return
    }

    if (isCreateSec3) {
      if (filteredTracks.length > 0 && !trackId) {
        setError('المسار الدراسي مطلوب لطلاب الصف الثالث الثانوي')
        return
      }

      if (filteredSpecializations.length > 0 && !specializationId) {
        setError('التخصص مطلوب لهذا المسار')
        return
      }
    }

    setSubmitting(true)
    try {
      const validPhones = phones.filter((p) => p.number.trim() !== '')
      const result = await api.registerStudent({
        fullName: fullName.trim(),
        phones: validPhones.length > 0 ? validPhones : undefined,
        stageId,
        gradeId,
        trackId: isCreateSec3 && trackId ? trackId : null,
        specializationId: isCreateSec3 && specializationId ? specializationId : null,
      })
      setOpenCreate(false)
      resetForm()
      setCredentials(result)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء حساب الطالب.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveIndividualPlacement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return
    setPlacementError(null)

    if (!editStageId || !editGradeId) {
      setPlacementError('المرحلة الدراسية والصف الدراسي مطلوبان')
      return
    }

    if (isEditSec3) {
      if (editFilteredTracks.length > 0 && !editTrackId) {
        setPlacementError('المسار الدراسي مطلوب لطلاب الصف الثالث الثانوي')
        return
      }

      if (editFilteredSpecializations.length > 0 && !editSpecializationId) {
        setPlacementError('التخصص مطلوب لهذا المسار')
        return
      }
    }

    setSavingPlacement(true)
    try {
      await api.setAcademicPlacement(editingStudent.id, {
        stageId: editStageId,
        gradeId: editGradeId,
        trackId: isEditSec3 && editTrackId ? editTrackId : null,
        specializationId: isEditSec3 && editSpecializationId ? editSpecializationId : null,
      })
      setEditingStudent(null)
      showNotification('تم تحديث التوزيع الأكاديمي بنجاح')
      await loadData()
    } catch (err: any) {
      setPlacementError(err.message || 'فشل تحديث التوزيع الأكاديمي')
    } finally {
      setSavingPlacement(false)
    }
  }

  const handleBatchPlacement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.length === 0) return
    setBatchError(null)

    if (!batchStageId || !batchGradeId) {
      setBatchError('المرحلة الدراسية والصف الدراسي مطلوبان')
      return
    }

    if (isBatchSec3) {
      if (batchFilteredTracks.length > 0 && !batchTrackId) {
        setBatchError('المسار الدراسي مطلوب لطلاب الصف الثالث الثانوي')
        return
      }

      if (batchFilteredSpecializations.length > 0 && !batchSpecializationId) {
        setBatchError('التخصص مطلوب لهذا المسار')
        return
      }
    }

    setBatchSubmitting(true)
    try {
      await api.batchSetAcademicPlacement({
        studentIds: selectedIds,
        stageId: batchStageId,
        gradeId: batchGradeId,
        trackId: isBatchSec3 && batchTrackId ? batchTrackId : null,
        specializationId: isBatchSec3 && batchSpecializationId ? batchSpecializationId : null,
      })
      setOpenBatchModal(false)
      setSelectedIds([])
      showNotification(`تم التوزيع الجماعي لـ ${selectedIds.length} طالب بنجاح`)
      await loadData()
    } catch (err: any) {
      setBatchError(err.message || 'فشل التوزيع الجماعي')
    } finally {
      setBatchSubmitting(false)
    }
  }

  const handleToggleStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      await api.adminToggleStudent(studentId, !currentStatus)
      await loadData()
    } catch (err: any) {
      alert('فشل تغيير حالة الحساب')
    }
  }

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  const hasPlacement = (s: User) => !!(s.academicStageId && s.academicGradeId)

  const filtered = students.filter((s) => {
    const q = search.toLowerCase()
    const matchesPhone = s.phones?.some((p) => p.number.includes(q) || p.relation.includes(q))
    const matchesSearch =
      s.fullName.toLowerCase().includes(q) ||
      (s.username && s.username.toLowerCase().includes(q)) ||
      matchesPhone

    if (!matchesSearch) return false

    if (placementFilter === 'placed') return hasPlacement(s)
    if (placementFilter === 'unplaced') return !hasPlacement(s)
    return true
  })

  const toggleSelectStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((s) => s.id))
    }
  }

  const getPlacementLabel = (s: User) => {
    if (!hasPlacement(s)) return null
    const stage = taxonomy?.stages.find((x) => x.id === s.academicStageId)?.name
    const grade = taxonomy?.grades.find((x) => x.id === s.academicGradeId)?.name
    const track = taxonomy?.tracks.find((x) => x.id === s.academicTrackId)?.name
    return [stage, grade ? `الصف ${grade}` : null, track].filter(Boolean).join(' • ')
  }

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {successToast && (
        <Alert className="bg-primary/10 border-primary/30 text-primary flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4 shrink-0" />
          <AlertDescription className="font-bold text-xs">{successToast}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="students" className="w-full">
        <div className="flex justify-start mb-6">
          <TabsList className="bg-card p-1.5 rounded-full h-auto">
            <TabsTrigger value="students" className="rounded-full px-6 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:hover:bg-foreground/80 data-[state=inactive]:hover:bg-muted font-bold transition-all shadow-none">الطلاب</TabsTrigger>
            <TabsTrigger value="finance" className="rounded-full px-6 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:hover:bg-foreground/80 data-[state=inactive]:hover:bg-muted font-bold transition-all shadow-none">المالية</TabsTrigger>
            <TabsTrigger value="family" className="rounded-full px-6 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:hover:bg-foreground/80 data-[state=inactive]:hover:bg-muted font-bold transition-all shadow-none">العائلة</TabsTrigger>
            <TabsTrigger value="security" className="rounded-full px-6 py-2.5 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:hover:bg-foreground/80 data-[state=inactive]:hover:bg-muted font-bold transition-all shadow-none">الأمان</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="students" className="mt-0 outline-none">
          <Card className="shadow-none border-border">
            <CardHeader className="pb-4 border-b border-border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-extrabold text-lg flex items-center gap-2 text-foreground">
                  <UsersGroupRoundedIcon className="h-6 w-6 text-primary" />
                  <span>إدارة الطلاب ({students.length})</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  عرض وتصنيف حسابات الطلاب ومعالجة التوزيع الأكاديمي
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <MagnifierIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو المعرف..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10 h-10 font-semibold text-xs"
                  />
                </div>

                {/* Placement Status Filter */}
                <Select
                  value={placementFilter}
                  onValueChange={(v: any) => setPlacementFilter(v)}
                >
                  <SelectTrigger className="h-10 text-xs font-bold w-48" dir="rtl">
                    <SelectValue placeholder="تصفية حسب التوزيع" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">كل الطلاب ({students.length})</SelectItem>
                    <SelectItem value="placed">موزعون أكاديمياً ({students.filter(hasPlacement).length})</SelectItem>
                    <SelectItem value="unplaced">غير موزع / يحتاج معالجة ({students.filter((s) => !hasPlacement(s)).length})</SelectItem>
                  </SelectContent>
                </Select>

                {/* Batch Action Button */}
                {canEdit && selectedIds.length > 0 && (
                  <Button
                    onClick={() => {
                      setBatchStageId('')
                      setBatchGradeId('')
                      setBatchTrackId('')
                      setBatchSpecializationId('')
                      setBatchError(null)
                      setOpenBatchModal(true)
                    }}
                    variant="secondary"
                    className="font-bold gap-2 rounded-full px-4 h-10 shadow-none shrink-0"
                  >
                    <span>توزيع جماعي ({selectedIds.length})</span>
                  </Button>
                )}

                {/* Create Student Button */}
                {canEdit && (
                  <Button
                    onClick={() => setOpenCreate(true)}
                    className="font-bold gap-2 rounded-full px-5 h-10 shadow-none shrink-0"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    <span>طالب جديد</span>
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <RefreshIcon className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm font-bold">جاري تحميل حسابات الطلاب...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center border-dashed border-2 border-border rounded-xl space-y-3 m-6 bg-muted/50">
                  <UsersGroupRoundedIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="text-lg font-bold text-foreground">لا يوجد طلاب يطابقون بحثك</h3>
                  <p className="text-xs text-muted-foreground font-medium">حاول تغيير خيارات البحث أو التصفية</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table dir="rtl">
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-border">
                        {canEdit && (
                          <TableHead className="w-10 px-4 text-center">
                            <button
                              type="button"
                              onClick={toggleSelectAll}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {selectedIds.length === filtered.length && filtered.length > 0 ? (
                                <CheckSquareIcon className="h-4 w-4 text-primary" />
                              ) : (
                                <StopIcon className="h-4 w-4" />
                              )}
                            </button>
                          </TableHead>
                        )}
                        <TableHead className="text-right whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">اسم الطالب</TableHead>
                        <TableHead className="text-right whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">رقم الطالب (ID)</TableHead>
                        <TableHead className="text-right whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">التوزيع الأكاديمي</TableHead>
                        <TableHead className="text-right whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">حالة الحساب</TableHead>
                        <TableHead className="text-right whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">أرقام الهواتف</TableHead>
                        <TableHead className="text-center whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((student) => {
                        const placed = hasPlacement(student)
                        const isSelected = selectedIds.includes(student.id)

                        return (
                          <TableRow key={student.id} className="hover:bg-muted/50 border-border transition-colors">
                            {canEdit && (
                              <TableCell className="px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSelectStudent(student.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  {isSelected ? (
                                    <CheckSquareIcon className="h-4 w-4 text-primary" />
                                  ) : (
                                    <StopIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </TableCell>
                            )}

                            <TableCell className="font-black text-right px-6 py-3 text-foreground">{student.fullName}</TableCell>

                            <TableCell className="text-right font-mono text-sm px-6 py-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-muted text-foreground px-2 py-0.5 rounded-full border border-border font-semibold">{student.username}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => copyToClipboard(student.username)} title="نسخ المعرف">
                                  <CopyIcon className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>

                            <TableCell className="text-right px-6 py-3">
                              {placed ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 bg-primary/5 rounded-full">
                                    موزَّع
                                  </Badge>
                                  <span className="text-xs text-muted-foreground font-semibold">
                                    {getPlacementLabel(student)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] font-bold text-destructive border-destructive/30 bg-destructive/5 rounded-full">
                                    غير موزع / يحتاج معالجة
                                  </Badge>
                                  {canEdit && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingStudent(student)
                                        setEditStageId(student.academicStageId || '')
                                        setEditGradeId(student.academicGradeId || '')
                                        setEditTrackId(student.academicTrackId || '')
                                        setEditSpecializationId(student.academicSpecializationId || '')
                                        setPlacementError(null)
                                      }}
                                      className="h-6 text-[10px] px-2 text-primary font-bold hover:bg-primary/10 rounded-full"
                                    >
                                      تعيين الآن
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="text-right px-6 py-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={student.isActive ?? true}
                                  disabled={!canEdit}
                                  onCheckedChange={() => handleToggleStatus(student.id, student.isActive ?? true)}
                                />
                                <span className={`text-xs font-bold ${student.isActive !== false ? 'text-primary' : 'text-destructive'}`}>
                                  {student.isActive !== false ? 'نشط' : 'معطل'}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-right px-6 py-3">
                              {student.phones && student.phones.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {student.phones.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      <span className="font-mono text-muted-foreground" dir="ltr">{p.number}</span>
                                      <span className="bg-muted border border-border px-1.5 py-0.5 rounded-full text-[10px] text-muted-foreground font-semibold">{p.relation}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">لا يوجد</span>
                              )}
                            </TableCell>

                            <TableCell className="text-center px-6 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingStudent(student)
                                      setEditStageId(student.academicStageId || '')
                                      setEditGradeId(student.academicGradeId || '')
                                      setEditTrackId(student.academicTrackId || '')
                                      setEditSpecializationId(student.academicSpecializationId || '')
                                      setPlacementError(null)
                                    }}
                                    title="تعديل التوزيع الأكاديمي"
                                    className="h-8 w-8 p-0 rounded-full"
                                  >
                                    <Pen2Icon className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 rounded-full font-bold shadow-none">
                                  <Link href={`/dashboard/students/${student.id}`}>
                                    <EyeIcon className="h-3.5 w-3.5" />
                                    التفاصيل
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="mt-0 outline-none">
          <FinanceTab students={students} reload={loadData} />
        </TabsContent>

        <TabsContent value="family" className="mt-0 outline-none">
          <FamilyTab students={students} />
        </TabsContent>

        <TabsContent value="security" className="mt-0 outline-none">
          <SecurityTab students={students} />
        </TabsContent>
      </Tabs>

      {/* ── Create Student Dialog ── */}
      <Dialog open={openCreate} onOpenChange={(v) => { setOpenCreate(v); if (!v) resetForm() }}>
        <DialogContent className="max-w-xl bg-card border border-border shadow-none rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <UserPlusIcon className="h-5 w-5 text-primary" />
              <span>التسجيل لطالب جديد</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              سيتم إنشاء الحساب تلقائياً. المرحلة والصف الدراسي مطلوبان لتفعيل رؤية المقررات.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStudent} className="space-y-4 pt-2 max-h-[75vh] overflow-y-auto px-1 scroll-smooth">
            {error && (
              <Alert variant="destructive">
                <DangerCircleIcon className="h-4 w-4" />
                <AlertDescription className="font-bold text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5 text-right">
              <Label className="font-bold text-xs text-foreground">الاسم الكامل <span className="text-destructive">*</span></Label>
              <Input
                placeholder="أدخل اسم الطالب ثلاثي أو رباعي"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="text-right font-medium h-9 text-xs"
              />
            </div>

            {/* Phones */}
            <div className="space-y-2 text-right">
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" onClick={handleAddPhone} className="h-7 text-[10px] gap-1 font-bold rounded-full">
                  <AddCircleIcon className="h-3 w-3" /> إضافة رقم
                </Button>
                <Label className="font-bold text-xs text-foreground">أرقام الهواتف والتواصل</Label>
              </div>

              {phones.map((phone, index) => (
                <div key={index} className="flex items-center gap-2">
                  {phones.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemovePhone(index)} className="text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full shrink-0">
                      <TrashBinTrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Input
                    placeholder="صلة القرابة (أب، أم...)"
                    value={phone.relation}
                    onChange={(e) => handlePhoneChange(index, 'relation', e.target.value)}
                    className="w-1/3 text-right h-8 text-xs"
                  />
                  <Input
                    placeholder="رقم الهاتف"
                    value={phone.number}
                    onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                    className="font-mono text-left h-8 text-xs flex-1"
                    dir="ltr"
                  />
                </div>
              ))}
            </div>

            {/* Academic Classification Fields */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold">تحدد المقررات المتاحة للطالب في حسابه</span>
                <span className="text-xs font-black text-foreground">التصنيف الأكاديمي</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Stage */}
                <div className="space-y-1.5 text-right">
                  <Label className="font-bold text-xs text-foreground">المرحلة الدراسية <span className="text-destructive">*</span></Label>
                  <Select
                    value={stageId}
                    onValueChange={(v) => { setStageId(v); setGradeId(''); setTrackId(''); setSpecializationId('') }}
                  >
                    <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                      <SelectValue placeholder="اختر المرحلة الدراسية" />
                    </SelectTrigger>
                    <SelectContent dir="rtl" position="popper" side="bottom">
                      {taxonomy?.stages.filter((s) => s.isActive).map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grade */}
                <div className="space-y-1.5 text-right">
                  <Label className="font-bold text-xs text-foreground">الصف الدراسي <span className="text-destructive">*</span></Label>
                  <Select
                    value={gradeId}
                    disabled={!stageId}
                    onValueChange={(v) => { setGradeId(v); setTrackId(''); setSpecializationId('') }}
                  >
                    <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                      <SelectValue placeholder={stageId ? 'اختر الصف' : 'اختر المرحلة أولاً'} />
                    </SelectTrigger>
                    <SelectContent dir="rtl" position="popper" side="bottom">
                      {filteredGrades.map((g) => {
                        const stage = taxonomy?.stages.find((s) => s.id === g.stageId)
                        return (
                          <SelectItem key={g.id} value={g.id} className="text-xs">
                            الصف {g.name} {stage ? `(${stage.name})` : ''}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Track */}
                {isCreateSec3 && filteredTracks.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <Label className="font-bold text-xs text-foreground">
                      المسار الدراسي <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={trackId}
                      onValueChange={(v) => { setTrackId(v); setSpecializationId('') }}
                    >
                      <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                        <SelectValue placeholder="اختر المسار الدراسي" />
                      </SelectTrigger>
                      <SelectContent dir="rtl" position="popper" side="bottom">
                        {filteredTracks.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Specialization */}
                {isCreateSec3 && trackId && filteredSpecializations.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <Label className="font-bold text-xs text-foreground">
                      التخصص <span className="text-destructive">*</span>
                    </Label>
                    <Select value={specializationId} onValueChange={setSpecializationId}>
                      <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                        <SelectValue placeholder="اختر التخصص" />
                      </SelectTrigger>
                      <SelectContent dir="rtl" position="popper" side="bottom">
                        {filteredSpecializations.map((sp) => (
                          <SelectItem key={sp.id} value={sp.id} className="text-xs">{sp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !stageId || !gradeId}
              className="w-full font-extrabold text-xs h-10 gap-1.5 mt-2 rounded-full shadow-none"
            >
              {submitting ? 'جاري إنشاء الحساب...' : 'حفظ وإنشاء حساب الطالب'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Single Student Placement Edit Dialog ── */}
      <Dialog open={!!editingStudent} onOpenChange={(v) => { if (!v) setEditingStudent(null) }}>
        <DialogContent className="max-w-md bg-card border border-border shadow-none rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <Pen2Icon className="h-5 w-5 text-primary" />
              <span>تعديل التوزيع الأكاديمي</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تحديد المرحلة والصف للطالب: {editingStudent?.fullName}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveIndividualPlacement} className="space-y-4 pt-2">
            {placementError && (
              <Alert variant="destructive">
                <DangerCircleIcon className="h-4 w-4" />
                <AlertDescription className="font-bold text-xs">{placementError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5 text-right">
              <Label className="font-bold text-xs text-foreground">المرحلة الدراسية <span className="text-destructive">*</span></Label>
              <Select
                value={editStageId}
                onValueChange={(v) => { setEditStageId(v); setEditGradeId(''); setEditTrackId(''); setEditSpecializationId('') }}
              >
                <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                  <SelectValue placeholder="اختر المرحلة الدراسية" />
                </SelectTrigger>
                <SelectContent dir="rtl" position="popper" side="bottom">
                  {taxonomy?.stages.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 text-right">
              <Label className="font-bold text-xs text-foreground">الصف الدراسي <span className="text-destructive">*</span></Label>
              <Select
                value={editGradeId}
                disabled={!editStageId}
                onValueChange={(v) => { setEditGradeId(v); setEditTrackId(''); setEditSpecializationId('') }}
              >
                <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                  <SelectValue placeholder={editStageId ? 'اختر الصف' : 'اختر المرحلة أولاً'} />
                </SelectTrigger>
                <SelectContent dir="rtl" position="popper" side="bottom">
                  {editFilteredGrades.map((g) => {
                    const stage = taxonomy?.stages.find((s) => s.id === g.stageId)
                    return (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        الصف {g.name} {stage ? `(${stage.name})` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {isEditSec3 && editFilteredTracks.length > 0 && (
              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">المسار الدراسي <span className="text-destructive">*</span></Label>
                <Select
                  value={editTrackId}
                  onValueChange={(v) => { setEditTrackId(v); setEditSpecializationId('') }}
                >
                  <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                    <SelectValue placeholder="اختر المسار الدراسي" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom">
                    {editFilteredTracks.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isEditSec3 && editTrackId && editFilteredSpecializations.length > 0 && (
              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">التخصص <span className="text-destructive">*</span></Label>
                <Select value={editSpecializationId} onValueChange={setEditSpecializationId}>
                  <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                    <SelectValue placeholder="اختر التخصص" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom">
                    {editFilteredSpecializations.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id} className="text-xs">{sp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingStudent(null)} className="rounded-full font-bold">
                إلغاء
              </Button>
              <Button type="submit" disabled={savingPlacement} className="rounded-full font-bold">
                {savingPlacement ? <RefreshIcon className="h-4 w-4 animate-spin ml-2" /> : null}
                حفظ التوزيع
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Batch Placement Modal ── */}
      <Dialog open={openBatchModal} onOpenChange={setOpenBatchModal}>
        <DialogContent className="max-w-md bg-card border border-border shadow-none rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <CheckSquareIcon className="h-5 w-5 text-primary" />
              <span>التوزيع الجماعي للطلاب ({selectedIds.length})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تعيين مرحلة وصف ومسار دراسي موحد لجميع الطلاب المحددين.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBatchPlacement} className="space-y-4 pt-2">
            {batchError && (
              <Alert variant="destructive">
                <DangerCircleIcon className="h-4 w-4" />
                <AlertDescription className="font-bold text-xs">{batchError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5 text-right">
              <Label className="font-bold text-xs text-foreground">المرحلة الدراسية <span className="text-destructive">*</span></Label>
              <Select
                value={batchStageId}
                onValueChange={(v) => { setBatchStageId(v); setBatchGradeId(''); setBatchTrackId(''); setBatchSpecializationId('') }}
              >
                <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                  <SelectValue placeholder="اختر المرحلة الدراسية" />
                </SelectTrigger>
                <SelectContent dir="rtl" position="popper" side="bottom">
                  {taxonomy?.stages.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 text-right">
              <Label className="font-bold text-xs text-foreground">الصف الدراسي <span className="text-destructive">*</span></Label>
              <Select
                value={batchGradeId}
                disabled={!batchStageId}
                onValueChange={(v) => { setBatchGradeId(v); setBatchTrackId(''); setBatchSpecializationId('') }}
              >
                <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                  <SelectValue placeholder={batchStageId ? 'اختر الصف' : 'اختر المرحلة أولاً'} />
                </SelectTrigger>
                <SelectContent dir="rtl" position="popper" side="bottom">
                  {batchFilteredGrades.map((g) => {
                    const stage = taxonomy?.stages.find((s) => s.id === g.stageId)
                    return (
                      <SelectItem key={g.id} value={g.id} className="text-xs">
                        الصف {g.name} {stage ? `(${stage.name})` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {isBatchSec3 && batchFilteredTracks.length > 0 && (
              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">المسار الدراسي <span className="text-destructive">*</span></Label>
                <Select
                  value={batchTrackId}
                  onValueChange={(v) => { setBatchTrackId(v); setBatchSpecializationId('') }}
                >
                  <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                    <SelectValue placeholder="اختر المسار الدراسي" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom">
                    {batchFilteredTracks.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isBatchSec3 && batchTrackId && batchFilteredSpecializations.length > 0 && (
              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">التخصص <span className="text-destructive">*</span></Label>
                <Select value={batchSpecializationId} onValueChange={setBatchSpecializationId}>
                  <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                    <SelectValue placeholder="اختر التخصص" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" position="popper" side="bottom">
                    {batchFilteredSpecializations.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id} className="text-xs">{sp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenBatchModal(false)} className="rounded-full font-bold">
                إلغاء
              </Button>
              <Button type="submit" disabled={batchSubmitting} className="rounded-full font-bold">
                {batchSubmitting ? <RefreshIcon className="h-4 w-4 animate-spin ml-2" /> : null}
                تطبيق التوزيع الجماعي
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Credentials Dialog ── */}
      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent className="max-w-sm bg-card border border-border shadow-none rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              <span>تمت العملية بنجاح!</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              يرجى نسخ بيانات الدخول التالية وإرسالها للطالب.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4 pt-4">
              <div className="space-y-1 text-right">
                <Label className="text-xs text-muted-foreground">اسم المستخدم (رقم الطالب)</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={credentials.username} className="font-mono text-left bg-muted/50" dir="ltr" />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(credentials.username)} className="rounded-full"><CopyIcon className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Label className="text-xs text-muted-foreground">كلمة المرور</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={credentials.password} className="font-mono text-left bg-muted/50" dir="ltr" />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(credentials.password)} className="rounded-full"><CopyIcon className="h-4 w-4" /></Button>
                </div>
              </div>
              <Button className="w-full mt-4 font-bold rounded-full shadow-none" onClick={() => setCredentials(null)}>إغلاق النافذة</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
