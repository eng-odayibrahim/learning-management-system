'use client'
import { CloseCircleIcon, DangerCircleIcon, KeyIcon, StarIcon } from '@solar-icons/react/outline';

import React, { useState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/lib/api'
import { User } from '@/lib/types'

interface AdminPermissionsModalProps {
  admin: User
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

export function AdminPermissionsModal({
  admin,
  isOpen,
  onClose,
  onSuccess,
}: AdminPermissionsModalProps) {
  const [permissions, setPermissions] = useState<Record<string, { read: boolean; edit: boolean }>>(
    {}
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (admin) {
      const initialPerms = { ...admin.permissions }
      MODULES.forEach((m) => {
        if (!initialPerms[m.id]) {
          initialPerms[m.id] = { read: false, edit: false }
        }
      })
      setPermissions(initialPerms)
    }
  }, [admin])

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
      await api.updateAdminPermissions(admin.id, permissions)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'فشل تحديث الصلاحيات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/40 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center bg-primary/10 text-primary rounded-full border border-primary/20">
              <KeyIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">تعديل الصلاحيات</h2>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                {admin.fullName} <span dir="ltr">(@{admin.username})</span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full text-muted-foreground hover:bg-muted"
          >
            <CloseCircleIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-permissions-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <DangerCircleIcon className="h-5 w-5" />
                <AlertDescription className="font-bold ml-2">{error}</AlertDescription>
              </Alert>
            )}

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
                            checked={permissions[module.id]?.read || false}
                            onCheckedChange={(v) => handlePermissionChange(module.id, 'read', v)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Switch
                            checked={permissions[module.id]?.edit || false}
                            onCheckedChange={(v) => handlePermissionChange(module.id, 'edit', v)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/40 flex justify-end gap-3 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="font-bold px-6 h-11 rounded-full"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            form="edit-permissions-form"
            disabled={loading}
            className="font-bold px-8 h-11 rounded-full shadow-none"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
        </div>
      </div>
    </div>
  )
}