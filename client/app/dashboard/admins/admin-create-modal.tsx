'use client'
import { CheckReadIcon, CloseCircleIcon, DangerCircleIcon, LockIcon, ShieldCheckIcon, StarIcon } from '@solar-icons/react/outline';

import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/lib/api'

interface AdminCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const MODULES = [
  { id: 'dashboard', label: 'الرئيسية' },
  { id: 'categories', label: 'الهيكل التعليمي' },
  { id: 'courses', label: 'المقررات الدراسية' },
  { id: 'students', label: 'الطلاب' },
  { id: 'admins', label: 'إدارة المشرفين' },
]

const EMPTY_PERMISSIONS = MODULES.reduce(
  (acc, m) => ({ ...acc, [m.id]: { read: false, edit: false } }),
  {} as Record<string, { read: boolean; edit: boolean }>
)

export function AdminCreateModal({ isOpen, onClose, onSuccess }: AdminCreateModalProps) {
  const [formData, setFormData] = useState({ fullName: '', email: '' })
  const [permissions, setPermissions] = useState(EMPTY_PERMISSIONS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')

  if (!isOpen) return null

  const handlePermissionChange = (module: string, action: 'read' | 'edit', value: boolean) => {
    setPermissions((prev) => {
      const next = { ...prev }
      next[module] = { ...next[module], [action]: value }

      // If edit is enabled, read MUST be enabled
      if (action === 'edit' && value) {
        next[module].read = true
      }
      // If read is disabled, edit MUST be disabled
      if (action === 'read' && !value) {
        next[module].edit = false
      }

      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.createAdmin({ ...formData, permissions })
      if (res?.generatedPassword) {
        setGeneratedPassword(res.generatedPassword)
        onSuccess()
      } else {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء المشرف')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseAndReset = () => {
    setGeneratedPassword('')
    setFormData({ fullName: '', email: '' })
    setPermissions(EMPTY_PERMISSIONS)
    setError('')
    onClose()
  }

  if (generatedPassword) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-card w-full max-w-md rounded-2xl border border-border flex flex-col overflow-hidden text-center p-8 space-y-6">
          <div className="mx-auto h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center border border-primary/20">
            <CheckReadIcon className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground mb-2">
              تم إنشاء حساب المشرف بنجاح
            </h3>
            <p className="text-sm text-muted-foreground">
              يرجى نسخ بيانات الدخول وإرسالها للمشرف الجديد:
            </p>
          </div>
          <div className="bg-muted/50 border border-border rounded-xl p-4 text-right space-y-3">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <span className="text-sm font-bold text-muted-foreground">
                البريد الإلكتروني / اسم المستخدم
              </span>
              <span className="text-sm font-black text-foreground" dir="ltr">
                {formData.email}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground">كلمة المرور</span>
              <span className="text-lg font-mono font-black text-primary bg-primary/10 px-3 py-1 rounded-full">
                {generatedPassword}
              </span>
            </div>
          </div>
          <Button onClick={handleCloseAndReset} className="w-full font-bold h-11 rounded-full">
            إغلاق
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/40 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center bg-primary/10 text-primary rounded-full border border-primary/20">
              <ShieldCheckIcon className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-foreground">إضافة مشرف جديد</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseAndReset}
            className="rounded-full text-muted-foreground hover:bg-muted"
          >
            <CloseCircleIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-admin-form" onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <Alert variant="destructive">
                <DangerCircleIcon className="h-5 w-5" />
                <AlertDescription className="font-bold ml-2">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                المعلومات الأساسية
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-sm">
                    الاسم الكامل <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="h-11 font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-sm">
                    البريد الإلكتروني <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11 font-semibold text-left"
                    dir="ltr"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                سيتم توليد كلمة المرور تلقائياً واستخدام البريد الإلكتروني كاسم مستخدم.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                صلاحيات الوصول
              </h3>

              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <table className="w-full text-sm text-right">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="px-4 py-3">الصفحة / الوحدة</th>
                      <th className="px-4 py-3 text-center">عرض</th>
                      <th className="px-4 py-3 text-center">تعديل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MODULES.map((module) => (
                      <tr key={module.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-bold text-foreground">{module.label}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <Switch
                              checked={permissions[module.id]?.read}
                              onCheckedChange={(v) => handlePermissionChange(module.id, 'read', v)}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <Switch
                              checked={permissions[module.id]?.edit}
                              onCheckedChange={(v) => handlePermissionChange(module.id, 'edit', v)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/40 flex justify-end gap-3 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={handleCloseAndReset}
            disabled={loading}
            className="font-bold px-6 h-11 rounded-full"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            form="create-admin-form"
            disabled={loading}
            className="font-bold px-8 h-11 rounded-full shadow-none"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ المشرف'}
          </Button>
        </div>
      </div>
    </div>
  )
}