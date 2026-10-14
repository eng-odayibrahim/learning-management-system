'use client'
import { DangerCircleIcon, Login2Icon, RefreshIcon, StarsIcon } from '@solar-icons/react/outline';


import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WHATSAPP_REGISTER_URL } from '@/lib/whatsapp'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'


export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login({ username, password })
      // Redirect based on role or home
      const stored = localStorage.getItem('user')
      if (stored && JSON.parse(stored).role === 'admin') {
        router.push('/dashboard')
      } else {
        router.push('/my-portal')
      }
    } catch (err: any) {
      setError(err.message || 'بيانات الدخول غير صحيحة، يرجى التحقق والمحاولة مجدداً.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-background via-muted/10 to-background">
      <Card className="w-full max-w-md border-border/80 shadow-xl shadow-emerald-500/5 backdrop-blur-md pt-18">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-border/40">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <Login2Icon className="h-6 w-6 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-black ">تسجيل الدخول إلى حسابك</CardTitle>
          <CardDescription className="text-xs font-semibold">
            مرحباً بك مجدداً في مدرسة <span className="text-emerald-400 font-bold">أثر التعليمية </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <DangerCircleIcon className="h-4 w-4" />
              <AlertDescription className="font-semibold">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-right">
              <Label htmlFor="username" className="font-bold">اسم المستخدم / رقم الطالب</Label>
              <Input
                id="username"
                type="text"
                placeholder="2026s0001 أو البريد للإدارة"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="text-right font-mono"
              />
            </div>

            <div className="space-y-2 text-right">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-bold">كلمة المرور</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-right font-mono"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-md transition-all mt-4"
            >
              {submitting ? (
                <>
                  <RefreshIcon className="mr-2 h-4 w-4 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                'دخول آمن'
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-border/50 pt-6 text-center text-xs font-semibold text-muted-foreground">
            ليس لديك حساب طالب بعد؟{' '}
            <a
              href={WHATSAPP_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline font-bold ml-1"
            >
              التسجيل عبر واتساب الآن
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
