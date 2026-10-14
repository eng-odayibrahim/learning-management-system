'use client'
import { ArrowLeftIcon, ArrowRightIcon, BookBookmarkIcon, BookIcon, DangerCircleIcon, DiplomaIcon, LayersIcon, MagnifierIcon, PlayCircleIcon, RefreshIcon, StarIcon } from '@solar-icons/react/outline';

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { AcademicStage, Course } from '@/lib/types'
import { Button } from '@/components/ui/button'


function CoursesPageContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const stageParam = searchParams.get('stage')

  const [stages, setStages] = useState<AcademicStage[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [selectedStage, setSelectedStage] = useState<string>(stageParam || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingStages, setLoadingStages] = useState(true)

  useEffect(() => {
    api.getStages(false)
      .then((data) => setStages(data || []))
      .catch(() => setStages([]))
      .finally(() => setLoadingStages(false))

    loadAllCourses()
  }, [])

  useEffect(() => {
    if (stageParam) setSelectedStage(stageParam)
  }, [stageParam])

  useEffect(() => {
    applyFilters()
  }, [courses, selectedStage, searchQuery])

  const loadAllCourses = async () => {
    setLoadingCourses(true)
    try {
      const res = await api.getCourses(undefined, 1, 100)
      setCourses(res?.items || [])
    } catch {
      setCourses([])
    } finally {
      setLoadingCourses(false)
    }
  }

  const applyFilters = () => {
    let list = [...courses]
    if (selectedStage !== 'all') {
      list = list.filter(c => c.stageId === selectedStage)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      )
    }
    setFilteredCourses(list)
  }

  const getStage = (stageId?: string | null) => {
    if (!stageId) return null
    return stages.find(s => s.id === stageId)
  }

  const activeStages = stages.filter(s => s.isActive)
  const selectedStageName = selectedStage !== 'all'
    ? activeStages.find(s => s.id === selectedStage)?.name
    : null

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Page Header ── */}
      <section className="pt-16 pb-10 sm:pt-20 sm:pb-14">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10 text-center space-y-5">
          {selectedStageName && (
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
              <span>/</span>
              <Link href="/courses" className="hover:text-primary transition-colors">المقررات</Link>
              <span>/</span>
              <span className="text-foreground">{selectedStageName}</span>
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            {selectedStageName ? `مقررات ${selectedStageName}` : 'كتالوج المقررات الدراسية'}
          </h1>
          <p className="text-base text-muted-foreground font-medium max-w-xl mx-auto leading-relaxed">
            {selectedStageName
              ? `جميع المقررات المتاحة لـ${selectedStageName}. اختر مقررك وابدأ رحلة التعلم.`
              : 'اختر مقررك وابدأ رحلة التعلم — منهج سوداني معتمد لكل مرحلة.'}
          </p>
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10 py-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-0 w-full sm:max-w-sm">
              <MagnifierIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="ابحث عن مقرر..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-12 pr-11 pl-4 rounded-full border border-border bg-card text-sm font-medium placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>

            {/* Stage filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 w-full sm:w-auto">
              <button
                onClick={() => setSelectedStage('all')}
                className={`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
                  selectedStage === 'all'
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                جميع المراحل
              </button>
              {loadingStages ? (
                <RefreshIcon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                activeStages.map(stage => (
                  <button
                    key={stage.id}
                    onClick={() => setSelectedStage(stage.id)}
                    className={`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
                      selectedStage === stage.id
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {stage.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {user?.role === 'student' && (!user.academicStageId || !user.academicGradeId) && (
        <div className="mx-auto max-w-7xl w-full px-6 sm:px-8 lg:px-10 -mt-4 mb-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300" dir="rtl">
            <DangerCircleIcon className="h-5 w-5 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">حسابك بحاجة إلى استكمال التصنيف الأكاديمي</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">لم يتم تعيين مرحلتك وصفك الدراسي رسمياً بعد. المقررات المعروضة مقيدة حتى يتم تعيين تصنيفك من قبل إدارة المنصة.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Courses Grid ── */}
      <main className="mx-auto max-w-7xl w-full px-6 sm:px-8 lg:px-10 py-12 flex-1">
        {loadingCourses ? (
          <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <RefreshIcon className="h-9 w-9 animate-spin text-primary" />
            <span className="text-sm font-bold">جاري تحميل المقررات...</span>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-24 space-y-4 rounded-[2rem] bg-muted">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background text-muted-foreground/50">
              <DiplomaIcon className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-muted-foreground">لا توجد مقررات مطابقة</h3>
            <p className="text-sm text-muted-foreground/70 font-medium">جرب تغيير كلمة البحث أو المرحلة الدراسية</p>
            {selectedStage !== 'all' && (
              <Button
                variant="outline"
                onClick={() => setSelectedStage('all')}
                className="rounded-full font-bold gap-2 mt-2"
              >
                <ArrowRightIcon className="h-4 w-4" />
                عرض جميع المراحل
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <span className="text-sm font-bold text-muted-foreground">
                {filteredCourses.length} مقرر متاح
              </span>
              {selectedStageName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStage('all')}
                  className="rounded-full font-bold text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                  عرض الكل
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => {
                const stage = getStage(course.stageId)
                return (
                  <Link key={course.id} href={`/courses/${course.id}`} className="group block">
                    <div className="rounded-[2rem] overflow-hidden bg-card border border-border transition-transform duration-300 group-hover:-translate-y-1">
                      {/* Thumbnail */}
                      <div className="relative h-48 w-full overflow-hidden bg-muted flex items-center justify-center">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <PlayCircleIcon className="h-8 w-8 text-primary/60" />
                          </div>
                        )}

                        {stage && (
                          <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md text-[10px] font-bold text-foreground">
                            {stage.name}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 space-y-3">
                        <h3 className="text-lg font-black leading-snug group-hover:text-primary transition-colors duration-300">
                          {course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium line-clamp-2 leading-relaxed">
                          {course.description || 'مقرر دراسي متكامل يواكب المنهج السوداني.'}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="px-6 pb-6 pt-0 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/70">
                          <BookBookmarkIcon className="h-3 w-3" />
                          مقرر أكاديمي
                        </div>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:-translate-x-1">
                          <ArrowLeftIcon className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center p-12">
        <RefreshIcon className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CoursesPageContent />
    </Suspense>
  )
}