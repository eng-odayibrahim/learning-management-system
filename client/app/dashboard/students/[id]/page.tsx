'use client'
import { ArrowRightIcon, BookBookmarkIcon, CalendarIcon, CheckCircleIcon, DangerCircleIcon, Pen2Icon, PhoneCallingIcon, RefreshIcon, ShieldWarningIcon, UserIcon } from '@solar-icons/react/outline';

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { User, FullTaxonomy } from '@/lib/types'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function StudentDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('students', 'edit')

  const [student, setStudent] = useState<User | null>(null)
  const [taxonomy, setTaxonomy] = useState<FullTaxonomy | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit Placement Modal State
  const [openEditPlacement, setOpenEditPlacement] = useState(false)
  const [stageId, setStageId] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [trackId, setTrackId] = useState('')
  const [specializationId, setSpecializationId] = useState('')
  const [savingPlacement, setSavingPlacement] = useState(false)
  const [placementError, setPlacementError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [allStudents, taxData] = await Promise.all([
        api.getStudents(),
        api.getTaxonomy(false),
      ])
      const found = allStudents.find((s) => s.id === id)
      if (found) {
        setStudent(found)
        // Initialize placement state
        setStageId(found.academicStageId || '')
        setGradeId(found.academicGradeId || '')
        setTrackId(found.academicTrackId || '')
        setSpecializationId(found.academicSpecializationId || '')
      }
      setTaxonomy(taxData || null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Cascading taxonomy options
  const filteredGrades = taxonomy?.grades.filter((g) => !stageId || g.stageId === stageId) ?? []
  const filteredTracks = taxonomy?.tracks.filter((t) =>
    !gradeId || !t.gradeIds?.length || t.gradeIds.includes(gradeId)
  ) ?? []
  const filteredSpecializations = taxonomy?.specializations.filter((sp) =>
    !trackId || !sp.trackIds?.length || sp.trackIds.includes(trackId)
  ) ?? []

  const isPlaced = !!(student?.academicStageId && student?.academicGradeId)

  const resolvedStage = taxonomy?.stages.find((s) => s.id === student?.academicStageId)?.name || student?.stage
  const resolvedGrade = taxonomy?.grades.find((g) => g.id === student?.academicGradeId)
    ? `الصف ${taxonomy.grades.find((g) => g.id === student?.academicGradeId)?.name}`
    : student?.grade
  const resolvedTrack = taxonomy?.tracks.find((t) => t.id === student?.academicTrackId)?.name || student?.track
  const resolvedSpec = taxonomy?.specializations.find((sp) => sp.id === student?.academicSpecializationId)?.name || student?.specialization

  const handleSavePlacement = async (e: React.FormEvent) => {
    e.preventDefault()
    setPlacementError(null)

    if (!stageId || !gradeId) {
      setPlacementError('المرحلة الدراسية والصف الدراسي مطلوبان')
      return
    }

    if (filteredTracks.length > 0 && !trackId) {
      setPlacementError('المسار الدراسي مطلوب لهذا الصف')
      return
    }

    if (filteredSpecializations.length > 0 && !specializationId) {
      setPlacementError('التخصص مطلوب لهذا المسار')
      return
    }

    setSavingPlacement(true)
    try {
      await api.setAcademicPlacement(student!.id, {
        stageId,
        gradeId,
        trackId: trackId || null,
        specializationId: specializationId || null,
      })
      setSuccessMsg('تم تحديث التوزيع الأكاديمي للطالب بنجاح')
      setOpenEditPlacement(false)
      await loadData()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setPlacementError(err.message || 'فشل تحديث التوزيع الأكاديمي')
    } finally {
      setSavingPlacement(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <RefreshIcon className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-bold">جاري تحميل بيانات الطالب...</span>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="py-20 text-center border-dashed border-2 border-border rounded-xl space-y-3 m-6 bg-muted/50">
        <ShieldWarningIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-bold text-foreground">الطالب غير موجود</h3>
        <Button onClick={() => router.push('/dashboard/students')} variant="outline" className="rounded-full font-bold">العودة لقائمة الطلاب</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto" dir="rtl">
      {successMsg && (
        <Alert className="bg-primary/10 border-primary/30 text-primary flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4 shrink-0" />
          <AlertDescription className="font-bold text-xs">{successMsg}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/students')} className="shrink-0 h-9 w-9 rounded-full">
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-foreground">{student.fullName}</h2>
              {isPlaced ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 rounded-full text-xs font-bold">
                  موزَّع أكاديمياً
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 rounded-full text-xs font-bold">
                  غير موزع / يحتاج معالجة
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-1">ID: {student.username}</p>
          </div>
        </div>

        {canEdit && (
          <Button
            onClick={() => {
              setStageId(student.academicStageId || '')
              setGradeId(student.academicGradeId || '')
              setTrackId(student.academicTrackId || '')
              setSpecializationId(student.academicSpecializationId || '')
              setPlacementError(null)
              setOpenEditPlacement(true)
            }}
            className="font-bold gap-2 rounded-full shadow-none"
          >
            <Pen2Icon className="h-4 w-4" />
            <span>تعديل التوزيع الأكاديمي</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 shadow-none border-border">
          <CardHeader className="pb-4 border-b border-border">
            <CardTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
              <UserIcon className="h-5 w-5 text-primary" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">اسم الطالب</span>
              <p className="font-bold text-sm text-foreground">{student.fullName}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">رقم الطالب (المعرف)</span>
              <p className="font-mono text-sm bg-muted w-fit px-2 py-0.5 rounded-full text-foreground font-bold border border-border">{student.username}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">تاريخ الإنشاء</span>
              <p className="text-sm font-mono flex items-center gap-1.5 text-foreground">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {student.createdAt ? new Date(student.createdAt).toLocaleDateString('ar-SA') : 'غير متوفر'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-semibold">حالة الحساب</span>
              <p className="text-sm font-bold">
                {student.isActive !== false ? (
                  <span className="text-primary">نشط</span>
                ) : (
                  <span className="text-destructive">معطل</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 shadow-none border-border">
          <CardHeader className="pb-4 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
              <BookBookmarkIcon className="h-5 w-5 text-primary" />
              البيانات والتوزيع الأكاديمي
            </CardTitle>
            {isPlaced ? (
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                معرفات رسمية مسجلة
              </span>
            ) : (
              <span className="text-[11px] font-bold text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full">
                بيانات نصية / غير مكتملة
              </span>
            )}
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-3 rounded-xl border border-border">
                <span className="text-[10px] text-muted-foreground block mb-1 font-bold">المرحلة الدراسية</span>
                <span className="font-bold text-sm text-foreground">{resolvedStage || 'غير محدد'}</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-xl border border-border">
                <span className="text-[10px] text-muted-foreground block mb-1 font-bold">الصف الدراسي</span>
                <span className="font-bold text-sm text-foreground">{resolvedGrade || 'غير محدد'}</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-xl border border-border">
                <span className="text-[10px] text-muted-foreground block mb-1 font-bold">المسار</span>
                <span className="font-bold text-sm text-foreground">{resolvedTrack || 'غير محدد'}</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-xl border border-border">
                <span className="text-[10px] text-muted-foreground block mb-1 font-bold">التخصص</span>
                <span className="font-bold text-sm text-foreground">{resolvedSpec || 'غير محدد'}</span>
              </div>
            </div>

            {!isPlaced && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-bold">⚠️ تنبيه: لم يتم تعيين التصنيف الأكاديمي الرسمي لهذا الطالب بعد.</p>
                <p className="text-[11px]">لن يتمكن الطالب من رؤية المقررات الدراسية حتى يتم تحديد المرحلة والصف الدراسي من خلال زر تعديل التوزيع.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border-border">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
            <PhoneCallingIcon className="h-5 w-5 text-primary" />
            أرقام الهواتف والتواصل
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {student.phones && student.phones.length > 0 ? (
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-right w-1/2 px-6 text-muted-foreground font-bold">رقم الهاتف</TableHead>
                  <TableHead className="text-right px-6 text-muted-foreground font-bold">صلة القرابة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.phones.map((phone, idx) => (
                  <TableRow key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-right px-6 text-foreground" dir="ltr">{phone.number}</TableCell>
                    <TableCell className="text-right px-6">
                      <Badge variant="outline" className="bg-muted text-foreground border-border shadow-none rounded-full">{phone.relation}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm">
              لا توجد أرقام مسجلة لهذا الطالب
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Placement Dialog ── */}
      <Dialog open={openEditPlacement} onOpenChange={setOpenEditPlacement}>
        <DialogContent className="max-w-md bg-card border border-border shadow-none rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <BookBookmarkIcon className="h-5 w-5 text-primary" />
              <span>تعديل التوزيع الأكاديمي للطالب</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              تحديد المرحلة والصف والمسار الدراسي لحساب {student.fullName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlacement} className="space-y-4 pt-2">
            {placementError && (
              <Alert variant="destructive">
                <DangerCircleIcon className="h-4 w-4" />
                <AlertDescription className="font-bold text-xs">{placementError}</AlertDescription>
              </Alert>
            )}

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
            {gradeId && filteredTracks.length > 0 && (
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
            {trackId && filteredSpecializations.length > 0 && (
              <div className="space-y-1.5 text-right">
                <Label className="font-bold text-xs text-foreground">
                  التخصص <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={specializationId}
                  onValueChange={setSpecializationId}
                >
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

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setOpenEditPlacement(false)} className="rounded-full font-bold">
                إلغاء
              </Button>
              <Button type="submit" disabled={savingPlacement} className="rounded-full font-bold">
                {savingPlacement ? <RefreshIcon className="h-4 w-4 animate-spin ml-2" /> : null}
                حفظ التوزيع الأكاديمي
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}