'use client'
import { ArrowLeftIcon, BookBookmarkIcon, CardIcon, LayersIcon } from '@solar-icons/react/outline';

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { CategoryNode, Course, User } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AdminOverviewPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [catData, courseData, studData] = await Promise.all([
        api.getCategoriesFlat(true),
        api.getCourses(undefined, 1, 100),
        api.getStudents()
      ])
      setCategories(catData || [])
      setCourses(courseData?.items || [])
      setStudents(studData || [])
    } catch (e) {
      // error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none rounded-md p-6 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">إجمالي المقررات المنشورة</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <BookBookmarkIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{courses.length}</span>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">موزعة عبر شجرة التصنيفات</p>
          </div>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none rounded-md p-6 flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">فئات التصنيف الدراسي</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <LayersIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{categories.length}</span>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">مراحل، مسارات وتخصصات فرعية</p>
          </div>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none rounded-md p-6 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">إجمالي الطلاب المسجلين</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <CardIcon className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black mt-2 text-zinc-900 dark:text-zinc-50">{students.length}</h3>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">طالب مسجل في المنصة</p>
          </div>
        </Card>
      </div>

      {/* Actionable Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dynamic Taxonomy Summary Widget */}
        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-none rounded-md overflow-hidden flex flex-col justify-between bg-white dark:bg-zinc-900 transition-colors lg:col-span-2">
          <div>
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                  <LayersIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <span>شجرة الفئات والتصنيف الأكاديمي</span>
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">تصنيف المناهج بحرية دون قوالب ثالثة جاهزة</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="font-bold text-xs gap-1 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <Link href="/dashboard/categories">
                  <span>إدارة الشجرة</span>
                  <ArrowLeftIcon className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-md border border-zinc-200 dark:border-zinc-800">
                يسمح نظام التصنيف (Taxonomy) بإنشاء مسارات وفروع لا نهائية (مثال: التعليم الثانوي ← التوجيه العلمي ← تخصص الهندسة). يتم تسكين كل مقرر تحت أي عقدة بسهولة.
              </div>

              <div className="space-y-2 pt-1">
                {categories.slice(0, 5).map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-bold transition-colors">
                    <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                      {cat.icon && <span className="text-teal-500">{cat.icon}</span>}
                      <span>{cat.name}</span>
                      {cat.parentId && (
                        <Badge variant="outline" className="text-[10px] py-0 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">تفرع فرعي</Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">#{cat.order}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}
