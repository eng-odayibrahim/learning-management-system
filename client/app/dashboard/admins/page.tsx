'use client'
import { AddCircleIcon, DangerCircleIcon, KeyIcon, LockIcon, MagnifierIcon, RefreshIcon, ShieldCheckIcon, ShieldWarningIcon, StarIcon, UsersGroupTwoRoundedIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { User } from '@/lib/types'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'

import { AdminCreateModal } from './admin-create-modal'
import { AdminPermissionsModal } from './admin-permissions-modal'

export default function AdminsPage() {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('admins', 'edit')

  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [permissionsModalAdmin, setPermissionsModalAdmin] = useState<User | null>(null)

  const fetchAdmins = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAdmins()
      setAdmins(data)
    } catch (err: any) {
      setError(err.message || 'فشل تحميل المشرفين')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleToggleActive = async (admin: User) => {
    if (!canEdit || admin.isSuperAdmin) return
    setError(null)
    try {
      await api.toggleAdmin(admin.id, !admin.isActive)
      await fetchAdmins()
    } catch (err: any) {
      setError(err.message || 'فشل تحديث حالة المشرف')
    }
  }

  const filteredAdmins = admins.filter(
    (a) => a.fullName.includes(search) || a.username.includes(search)
  )

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-card rounded-2xl border border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <ShieldWarningIcon className="h-6 w-6 text-primary" />
            إدارة المشرفين
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            إضافة وإدارة حسابات المشرفين وصلاحياتهم
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="font-bold gap-2 rounded-full px-6 h-11 shadow-none"
          >
            <AddCircleIcon className="h-5 w-5" />
            إضافة مشرف جديد
          </Button>
        )}
      </div>

      {/* Alert feedback */}
      {error && (
        <Alert variant="destructive">
          <DangerCircleIcon className="h-5 w-5" />
          <AlertDescription className="font-bold ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {/* List */}
      <Card>
        <CardHeader className="pb-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-extrabold text-lg flex items-center gap-2 text-foreground">
              <span>قائمة المشرفين</span>
              <Badge className="bg-foreground text-background">{filteredAdmins.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              يمكنك تعديل الصلاحيات أو تفعيل / تعطيل أي حساب مشرف
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <MagnifierIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو اسم المستخدم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 h-10 font-semibold"
            />
          </div>
        </CardHeader>

        <CardContent className="p-3">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
              <RefreshIcon className="h-8 w-8 animate-spin text-primary" />
              <span className="font-bold text-sm">جاري جلب البيانات...</span>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="py-14 text-center border-2 border-dashed border-border rounded-xl bg-muted/50">
              <UsersGroupTwoRoundedIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="font-bold text-muted-foreground">لا يوجد مشرفين حتى الآن</p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                استخدم زر الإضافة لإنشاء أول حساب مشرف
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="px-4 py-3">المشرف</th>
                    <th className="px-4 py-3">اسم المستخدم</th>
                    <th className="px-4 py-3 text-center">النوع</th>
                    <th className="px-4 py-3 text-center">الحالة</th>
                    {canEdit && <th className="px-4 py-3 text-center">الإجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-black text-foreground">{admin.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground font-semibold" dir="ltr">
                        @{admin.username}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {admin.isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <LockIcon className="h-3.5 w-3.5" />
                            مشرف أساسي
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            <ShieldCheckIcon className="h-3.5 w-3.5" />
                            مشرف مخصص
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={admin.isActive}
                            disabled={!canEdit || admin.isSuperAdmin}
                            onCheckedChange={() => handleToggleActive(admin)}
                          />
                          <span className="text-xs font-bold text-muted-foreground">
                            {admin.isActive ? 'مفعّل' : 'معطّل'}
                          </span>
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {!admin.isSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPermissionsModalAdmin(admin)}
                                className="font-bold text-xs gap-1.5 h-9 text-primary hover:bg-primary/10"
                              >
                                <KeyIcon className="h-3.5 w-3.5" />
                                الصلاحيات
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchAdmins}
      />

      {permissionsModalAdmin && (
        <AdminPermissionsModal
          admin={permissionsModalAdmin}
          isOpen={!!permissionsModalAdmin}
          onClose={() => setPermissionsModalAdmin(null)}
          onSuccess={fetchAdmins}
        />
      )}
    </div>
  )
}