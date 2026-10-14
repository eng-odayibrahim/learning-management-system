'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Mail,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'

export default function ManagerProfilePage() {
  const { user, refreshUser } = useAuth()

  // Profile Info States
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [infoLoading, setInfoLoading] = useState(false)
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)

  // Password States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [passSuccess, setPassSuccess] = useState<string | null>(null)
  const [passError, setPassError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setEmail(user.email || '')
    }
  }, [user])

  // Handle Info Update
  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setInfoError(null)
    setInfoSuccess(null)

    if (!fullName.trim() || fullName.trim().length < 3) {
      setInfoError('الاسم يجب أن يكون 3 أحرف على الأقل')
      return
    }

    if (email.trim() && !email.includes('@')) {
      setInfoError('يرجى إدخال بريد إلكتروني صالح')
      return
    }

    setInfoLoading(true)
    try {
      await api.updateProfile({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
      })
      await refreshUser()
      setInfoSuccess('تم حفظ البيانات الشخصية بنجاح')
      setTimeout(() => setInfoSuccess(null), 4000)
    } catch (err: any) {
      setInfoError(err?.message || 'حدث خطأ أثناء تحديث البيانات')
    } finally {
      setInfoLoading(false)
    }
  }

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassError(null)
    setPassSuccess(null)

    if (!currentPassword) {
      setPassError('يرجى إدخال كلمة المرور الحالية')
      return
    }

    if (!newPassword || newPassword.length < 8) {
      setPassError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
      return
    }

    if (newPassword !== confirmPassword) {
      setPassError('كلمة المرور الجديدة وتأكيدها غير متطابقين')
      return
    }

    setPassLoading(true)
    try {
      await api.updateProfile({
        currentPassword,
        newPassword,
      })
      await refreshUser()
      setPassSuccess('تم تحديث كلمة المرور بنجاح')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPassSuccess(null), 4000)
    } catch (err: any) {
      setPassError(err?.message || 'تعذر تغيير كلمة المرور. تحقق من كلمة المرور الحالية.')
    } finally {
      setPassLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* ── Page Header ── */}
      <div className="space-y-1 text-right">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          الملف الشخصي وإعدادات الحساب
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          إدارة بيانات المشرف، البريد الإلكتروني، وتحديث كلمة المرور والأمان.
        </p>
      </div>

      {/* ── Account Summary Header Card ── */}
      <Card className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-xs overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-right">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Avatar circle */}
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 flex items-center justify-center text-primary font-black text-2xl shadow-inner">
                {user.fullName ? user.fullName.charAt(0) : 'U'}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">
                    {user.fullName}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="gap-1 text-xs font-semibold rounded-full px-3 py-0.5 border border-primary/20 bg-primary/10 text-primary"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    <span>{user.isSuperAdmin ? 'مدير عام للنظام' : 'مشرف إداري'}</span>
                  </Badge>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground font-medium flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span>اسم المستخدم: <strong>{user.username}</strong></span>
                  </span>
                  {user.email && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{user.email}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center sm:text-left shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                الحساب نشط
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-8">
        {/* ── Section 1: Edit Basic Information ── */}
        <Card className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-xs">
          <CardHeader className="p-6 pb-4 border-b border-border/30 text-right space-y-1">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center justify-end gap-2 text-foreground">
              <span>البيانات الأساسية للمشرف</span>
              <User className="h-4 w-4 text-primary" />
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              تعديل الاسم المعروض والبريد الإلكتروني المعتمد لتسجيل الدخول والإشعارات.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleUpdateInfo} className="space-y-5">
              {infoSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2 text-right">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{infoSuccess}</span>
                </div>
              )}

              {infoError && (
                <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2 text-right">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{infoError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-right">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs font-semibold text-foreground">
                    الاسم الكامل
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    className="rounded-2xl text-xs h-11 border-border/80 focus:ring-1 focus:ring-primary font-medium"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@lms.com"
                    className="rounded-2xl text-xs h-11 border-border/80 focus:ring-1 focus:ring-primary font-medium text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Readonly Username & Role Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-right pt-1">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    اسم المستخدم (معرف النظام الثابت)
                  </Label>
                  <Input
                    value={user.username}
                    disabled
                    className="rounded-2xl text-xs h-11 bg-muted/40 border-border/40 font-mono text-muted-foreground cursor-not-allowed text-left"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    مستوى الصلاحيات
                  </Label>
                  <Input
                    value={user.isSuperAdmin ? 'مدير نظام بصلاحيات كاملة' : 'مشرف إداري بصلاحيات محددة'}
                    disabled
                    className="rounded-2xl text-xs h-11 bg-muted/40 border-border/40 font-medium text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  type="submit"
                  disabled={infoLoading}
                  className="rounded-full px-6 py-2.5 text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  {infoLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Section 2: Change Password ── */}
        <Card className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-xs">
          <CardHeader className="p-6 pb-4 border-b border-border/30 text-right space-y-1">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center justify-end gap-2 text-foreground">
              <span>تغيير كلمة المرور والأمان</span>
              <KeyRound className="h-4 w-4 text-primary" />
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              تحديث كلمة المرور لحماية حسابك، يرجى اختيار كلمة مرور قوية مكونة من 8 أحرف على الأقل.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {passSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2 text-right">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              {passError && (
                <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2 text-right">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              {/* Current Password */}
              <div className="space-y-2 text-right">
                <Label htmlFor="currentPassword" className="text-xs font-semibold text-foreground">
                  كلمة المرور الحالية
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية للتأكيد"
                    className="rounded-2xl text-xs h-11 border-border/80 pl-10 focus:ring-1 focus:ring-primary font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-right">
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
                    كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8 خانات على الأقل"
                      className="rounded-2xl text-xs h-11 border-border/80 pl-10 focus:ring-1 focus:ring-primary font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                    تأكيد كلمة المرور الجديدة
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد كتابة كلمة المرور الجديدة"
                      className="rounded-2xl text-xs h-11 border-border/80 pl-10 focus:ring-1 focus:ring-primary font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  type="submit"
                  disabled={passLoading}
                  className="rounded-full px-6 py-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {passLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
