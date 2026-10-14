'use client'
import { ArrowLeftIcon, BookBookmarkIcon, PlayCircleIcon, RefreshIcon, StarsIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { CategoryNode, Course } from '@/lib/types'
import { Card, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'


export default function MyPortalPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user && user.role === 'student') {
      loadStudentData()
    } else if (user && user.role === 'admin') {
      router.push('/dashboard')
    }
  }, [user, authLoading])

  const loadStudentData = async () => {
    setLoading(true)
    try {
      const [catData, courseData] = await Promise.all([
        api.getCategoriesFlat(false),
        api.getCourses()
      ])
      setCategories(catData || [])
      setCourses(courseData?.items || [])
    } catch (e) {
      // Error
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshIcon className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="text-sm font-bold">جاري تحميل لوحة الطالب...</span>
        </div>
      </div>
    )
  }

  // Find user's category info
  const myCategory = categories.find((c) => c.id === user?.categoryId)

  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      {/* Student Header */}
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/10 via-muted/10 to-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-2xl shadow-none shadow-emerald-500/20">
                {user?.fullName?.charAt(0) || 'S'}
              </div>
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="font-extrabold text-xs">طالب متدرب</Badge>
                  {myCategory && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-bold text-xs gap-1">
                      {myCategory.icon && <span>{myCategory.icon}</span>}
                      <span>{myCategory.name}</span>
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-black ">{user?.fullName}</h1>
                <p className="text-xs text-muted-foreground font-mono font-semibold">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button asChild variant="outline" className="font-bold gap-2 text-xs">
                <Link href="/">
                  <BookBookmarkIcon className="h-4 w-4 text-emerald-500" />
                  <span>تصفح الكتالوج العام</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 mt-8">
        <div className="space-y-6 text-right">
          <div className="space-y-2">
            <h2 className="text-xl font-black flex items-center gap-2">
              <StarsIcon className="h-5 w-5 text-emerald-500" />
              مقررات متاحة
            </h2>
            <p className="text-sm text-muted-foreground font-medium">يمكنك الآن الوصول إلى جميع المقررات الدراسية المعروضة أدناه.</p>
          </div>

          {courses.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border/60 bg-muted/5 space-y-4">
              <BookBookmarkIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="text-xl font-bold ">لا توجد مقررات متوفرة حالياً</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto font-medium">
                يرجى العودة لاحقاً حيث نقوم بإضافة محتوى جديد باستمرار.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((c) => {
                if (!c) return null
                return (
                  <Card key={c.id} className="group flex flex-col justify-between border-border/80 bg-card rounded-md overflow-hidden hover:border-emerald-500/50 transition-all shadow-none">
                    <div className="relative h-44 w-full bg-muted flex items-center justify-center overflow-hidden">
                      {c.thumbnail ? (
                        <img src={c.thumbnail} alt={c.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <BookBookmarkIcon className="h-10 w-10 text-emerald-500" />
                      )}
                    </div>

                    <div className="p-6 space-y-2 text-right">
                      <h3 className="text-lg font-black ">{c.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 font-medium">{c.description}</p>
                    </div>

                    <CardFooter className="p-6 pt-0 border-t border-border/40 bg-muted/10">
                      <Button asChild className="w-full h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold gap-2">
                        <Link href={`/courses/${c.id}`} className="w-full">
                          <span>الدخول للفصل الدراسي</span>
                          <PlayCircleIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
