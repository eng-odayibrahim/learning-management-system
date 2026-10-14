'use client'
import { CheckCircleIcon, CopyIcon, KeyIcon, MagnifierIcon, RefreshIcon, ShieldWarningIcon, StarIcon } from '@solar-icons/react/outline';


import React, { useState } from 'react'
import { User } from '@/lib/types'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'

export function SecurityTab({ students }: { students: User[] }) {
  const [searchId, setSearchId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null)
  const [openModal, setOpenModal] = useState(false)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('students', 'edit')

  const [regenSubmitting, setRegenSubmitting] = useState(false)
  const [newCredentials, setNewCredentials] = useState<{ username: string; password: string } | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchId.trim()) return
    const found = students.find(s => s.username === searchId.trim() || s.id === searchId.trim())
    if (found) {
      setSelectedStudent(found)
      setNewCredentials(null)
      setOpenModal(true)
    } else {
      alert('لم يتم العثور على طالب بهذا المعرف')
    }
  }

  const handleRegeneratePassword = async () => {
    if (!selectedStudent) return
    if (!confirm('هل أنت متأكد من إنشاء كلمة مرور جديدة لهذا الطالب؟ سيتم إبطال كلمة المرور السابقة نهائياً.')) return

    setRegenSubmitting(true)
    try {
      const result = await api.adminRegeneratePassword(selectedStudent.id)
      setNewCredentials({ username: selectedStudent.username, password: result.newPassword })
    } catch (err: any) {
      alert(err.message || 'فشل إعادة التعيين')
    } finally {
      setRegenSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="py-6 px-6 border-b border-border text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-3 border border-primary/20">
            <KeyIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-black text-foreground">
            مركز الأمان وكلمات المرور
          </CardTitle>
          <CardDescription className="text-sm mt-2">
            أدخل المعرف الجامعي (رقم الطالب) للبحث عنه وإدارة كلمة المرور الخاصة به
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <MagnifierIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="أدخل رقم الطالب للبحث..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="pr-10 text-right h-11 font-mono text-sm"
                dir="ltr"
              />
            </div>
            <Button type="submit" className="h-11 px-6 font-bold rounded-full shadow-none">
              بحث
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-sm bg-card border border-border shadow-none rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <ShieldWarningIcon className="h-5 w-5 text-primary" />
              أمان حساب الطالب
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              إدارة كلمة المرور الخاصة بالطالب {selectedStudent?.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4 space-y-4 text-center">
            <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-1">
              <div className="text-sm font-bold text-foreground">{selectedStudent?.fullName}</div>
              <div className="text-xs text-muted-foreground font-mono">{selectedStudent?.username}</div>
            </div>

            {!newCredentials ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  ملاحظة: كلمات المرور مشفرة ولا يمكن استرجاع كلمة المرور الحالية. يمكنك فقط توليد كلمة مرور جديدة وإرسالها للطالب.
                </p>
                <Button
                  onClick={handleRegeneratePassword}
                  disabled={!canEdit || regenSubmitting}
                  className="w-full font-bold shadow-none gap-2 h-10 rounded-full"
                >
                  {regenSubmitting ? <RefreshIcon className="h-4 w-4 animate-spin" /> : <KeyIcon className="h-4 w-4" />}
                  توليد كلمة مرور جديدة
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary font-bold mb-2">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>تم التوليد بنجاح</span>
                </div>

                <div className="space-y-1 text-right">
                  <Label className="text-xs text-muted-foreground">اسم المستخدم</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={newCredentials.username} className="font-mono text-left bg-muted/50 h-9" dir="ltr" />
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(newCredentials.username)} className="h-9 w-9 rounded-full"><CopyIcon className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <Label className="text-xs text-muted-foreground">كلمة المرور الجديدة</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={newCredentials.password} className="font-mono text-left bg-muted/50 h-9" dir="ltr" />
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(newCredentials.password)} className="h-9 w-9 rounded-full"><CopyIcon className="h-4 w-4" /></Button>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-2 font-bold h-10 rounded-full shadow-none" onClick={() => setOpenModal(false)}>
                  إغلاق
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}