'use client'
import { AddCircleIcon, LinkIcon, RefreshIcon, SettingsIcon, TrashBinTrashIcon, UsersGroupRoundedIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect } from 'react'
import { User, RelationCategory, FamilyGroup } from '@/lib/types'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/context/auth-context'

export function FamilyTab({ students }: { students: User[] }) {
  const [categories, setCategories] = useState<RelationCategory[]>([])
  const [groups, setGroups] = useState<FamilyGroup[]>([])
  const [loading, setLoading] = useState(true)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('students', 'edit')

  const [openGroupModal, setOpenGroupModal] = useState(false)
  const [openCatModal, setOpenCatModal] = useState(false)

  const [newCatName, setNewCatName] = useState('')

  const [selectedCatId, setSelectedCatId] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')

  const loadFamilyData = async () => {
    setLoading(true)
    try {
      const [cats, grps] = await Promise.all([
        api.getRelationCategories(),
        api.getFamilyGroups()
      ])
      setCategories(cats)
      setGroups(grps)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadFamilyData()
  }, [])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try {
      await api.createRelationCategory(newCatName.trim())
      setNewCatName('')
      loadFamilyData()
    } catch (err) {
      console.error(err)
      alert('فشل إنشاء الفئة')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('هل أنت متأكد؟ سيتم حذف جميع المجموعات المرتبطة بهذه الفئة.')) return
    try {
      await api.deleteRelationCategory(id)
      loadFamilyData()
    } catch (err) {
      console.error(err)
      alert('فشل الحذف')
    }
  }

  const handleCreateGroup = async () => {
    if (!selectedCatId) return alert('الرجاء اختيار الفئة العائلية')
    if (selectedStudentIds.length < 2) return alert('يجب اختيار طالبين على الأقل لتكوين مجموعة')

    try {
      await api.createFamilyGroup(selectedCatId, selectedStudentIds)
      setSelectedCatId('')
      setSelectedStudentIds([])
      setStudentSearch('')
      setOpenGroupModal(false)
      loadFamilyData()
    } catch (err) {
      console.error(err)
      alert('فشل إنشاء المجموعة')
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return
    try {
      await api.deleteFamilyGroup(id)
      loadFamilyData()
    } catch (err) {
      console.error(err)
      alert('فشل الحذف')
    }
  }

  const toggleStudentSelection = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(sid => sid !== id))
    } else {
      setSelectedStudentIds([...selectedStudentIds, id])
    }
  }

  // Filter unselected students by ID (username) as requested
  const unselectedStudents = students.filter(s =>
    !selectedStudentIds.includes(s.id) &&
    (s.username.includes(studentSearch) || s.fullName.includes(studentSearch))
  )

  const selectedStudentsData = students.filter(s => selectedStudentIds.includes(s.id))

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <RefreshIcon className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-bold">جاري التحميل...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-extrabold text-lg flex items-center gap-2 text-foreground">
              <UsersGroupRoundedIcon className="h-6 w-6 text-primary" />
              <span>المجموعات العائلية ({groups.length})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              إدارة صلات القرابة والمجموعات العائلية للطلاب
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenCatModal(true)}
                  className="font-bold gap-1.5 rounded-full shadow-none shrink-0"
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span>إدارة الفئات</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setOpenGroupModal(true)}
                  className="font-bold gap-1.5 rounded-full shadow-none shrink-0"
                >
                  <LinkIcon className="h-4 w-4" />
                  <span>إنشاء صلة قرابة</span>
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table dir="rtl">
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead className="text-right px-6 py-4 text-muted-foreground font-bold">فئة القرابة</TableHead>
                <TableHead className="text-right px-6 py-4 text-muted-foreground font-bold">الطلاب المرتبطين</TableHead>
                {canEdit && <TableHead className="text-center px-6 py-4 w-24 text-muted-foreground font-bold">إجراءات</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(group => (
                <TableRow key={group._id || group.id} className="hover:bg-muted/50 border-border transition-colors">
                  <TableCell className="px-6 py-4 font-bold text-primary">
                    {(group.categoryId as RelationCategory)?.name || 'غير معروف'}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {(group.studentIds as User[]).map((stu) => (
                        <Badge key={(stu as any)._id || stu.id} variant="secondary" className="bg-muted text-foreground font-medium border-border rounded-full">
                          {stu.fullName}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="px-6 py-4 text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(group._id || group.id as string)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <TrashBinTrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {groups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground text-sm font-medium">لا توجد مجموعات عائلية مسجلة</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Manager Modal */}
      <Dialog open={openCatModal} onOpenChange={setOpenCatModal}>
        <DialogContent className="max-w-md bg-card border border-border shadow-none rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <SettingsIcon className="h-5 w-5 text-primary" />
              إدارة فئات القرابة
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              أضف فئات جديدة مثل (إخوة، أبناء عمومة) لتتمكن من تصنيف المجموعات.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 space-y-4">
            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <Input
                placeholder="اسم الفئة الجديدة"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="text-right text-xs h-9"
              />
              <Button type="submit" size="sm" className="shrink-0 rounded-full font-bold shadow-none">إضافة الفئة</Button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat._id || cat.id} className="flex items-center justify-between bg-muted/50 p-2 px-3 rounded-xl border border-border">
                  <span className="text-sm font-bold text-foreground">{cat.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat._id || cat.id as string)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                    <TrashBinTrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && <div className="text-center text-xs text-muted-foreground p-4">لا توجد فئات بعد</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Creator Modal */}
      <Dialog open={openGroupModal} onOpenChange={setOpenGroupModal}>
        <DialogContent className="max-w-2xl bg-card border border-border shadow-none rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <LinkIcon className="h-5 w-5 text-primary" />
              إنشاء صلة قرابة (مجموعة عائلية)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              اختر الفئة، ثم ابحث برقم الطالب لإضافته للمجموعة.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">اختر الفئة (نوع القرابة)</label>
                <Select value={selectedCatId} onValueChange={setSelectedCatId}>
                  <SelectTrigger className="text-right h-9 text-xs" dir="rtl">
                    <SelectValue placeholder="اختر الفئة..." />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" dir="rtl">
                    {categories.map(c => <SelectItem key={c._id || c.id} value={c._id || c.id as string}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">البحث عن طلاب لإضافتهم (بالمعرف أو الاسم)</label>
                <Input
                  placeholder="بحث برقم الطالب أو اسمه..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="text-right text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Search Results */}
              <div className="border border-border rounded-xl p-2 h-48 overflow-y-auto bg-muted/50 space-y-1">
                <div className="text-[10px] text-muted-foreground mb-2 px-1 font-bold">نتائج البحث:</div>
                {studentSearch && unselectedStudents.slice(0, 10).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 hover:bg-card rounded-xl cursor-pointer border border-transparent hover:border-border transition-colors" onClick={() => toggleStudentSelection(s.id)}>
                    <div>
                      <div className="text-xs font-bold text-foreground">{s.fullName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{s.username}</div>
                    </div>
                    <AddCircleIcon className="h-3 w-3 text-primary" />
                  </div>
                ))}
                {!studentSearch && <div className="text-xs text-muted-foreground text-center mt-12">اكتب المعرف للبحث عن الطلاب...</div>}
                {studentSearch && unselectedStudents.length === 0 && <div className="text-xs text-muted-foreground text-center mt-12">لا يوجد نتائج</div>}
              </div>

              {/* Selected Students */}
              <div className="border border-primary/20 rounded-xl p-2 h-48 overflow-y-auto bg-primary/5 space-y-1">
                <div className="text-[10px] text-primary mb-2 px-1 font-bold">الطلاب المحددين للمجموعة:</div>
                {selectedStudentsData.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-card rounded-xl border border-border shadow-none">
                    <div>
                      <div className="text-xs font-bold text-foreground">{s.fullName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{s.username}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => toggleStudentSelection(s.id)}>
                      <TrashBinTrashIcon className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {selectedStudentIds.length === 0 && <div className="text-xs text-muted-foreground text-center mt-12">لم يتم تحديد طلاب بعد</div>}
              </div>
            </div>

            <Button
              onClick={handleCreateGroup}
              disabled={!selectedCatId || selectedStudentIds.length < 2}
              className="w-full text-xs font-bold h-10 rounded-full shadow-none"
            >
              حفظ المجموعة العائلية ({selectedStudentIds.length} طلاب)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}