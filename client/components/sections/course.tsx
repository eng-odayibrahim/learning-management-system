'use client'
import { ArrowLeftIcon, LayersIcon, PlayCircleIcon, RefreshIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { AcademicStage, Course } from '@/lib/types'
import { useStaggerReveal, useFadeUpReveal } from '@/lib/use-gsap-scroll'


// Descriptive fallback copy + a distinct bento color per stage (الأساس → المتوسط → الثانوي)
const stageMetadata: Record<string, { description: string; bg: string; fg: string; sphere: string }> = {
  default_0: {
    description: 'بناء أساس قوي في القراءة والحساب والعلوم لطلاب الحلقة الأولى والثانية.',
    bg: 'bg-pastel-green', fg: 'text-pastel-green-fg', sphere: 'from-white/60 to-transparent',
  },
  default_1: {
    description: 'تعميق فهم المواد الأساسية وتنمية مهارات التفكير استعداداً للثانوية.',
    bg: 'bg-pastel-blue', fg: 'text-pastel-blue-fg', sphere: 'from-white/60 to-transparent',
  },
  default_2: {
    description: 'تحضير أكاديمي متكامل لمواد الثانوي، يؤهل الطالب للشهادة والجامعة.',
    bg: 'bg-pastel-yellow', fg: 'text-pastel-yellow-fg', sphere: 'from-white/60 to-transparent',
  },
}

function getStageMetadata(index: number) {
  return stageMetadata[`default_${index % 3}`]
}

export const CoursesSection: React.FC = () => {
  const { user, isStudent, loading: authLoading } = useAuth()

  const [stages, setStages] = useState<AcademicStage[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingStages, setLoadingStages] = useState(true)
  const [loadingCourses, setLoadingCourses] = useState(false)

  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useFadeUpReveal(headerRef, { yFrom: 28, duration: 0.8 })
  useStaggerReveal(gridRef, { stagger: 0.1, yFrom: 30, duration: 0.75 })

  useEffect(() => {
    if (authLoading) return

    if (isStudent && user?.stage) {
      setLoadingCourses(true)
      api.getCourses({ stageId: user.stage }, 1, 50)
        .then((res) => setCourses(res?.items || []))
        .catch(() => setCourses([]))
        .finally(() => setLoadingCourses(false))
    }

    api.getStages(false)
      .then((data) => setStages(data || []))
      .catch(() => setStages([]))
      .finally(() => setLoadingStages(false))
  }, [authLoading, isStudent, user?.stage])

  const showStudentView = isStudent && user?.stage && courses.length > 0

  return (
    <section id="courses" className="py-24 sm:py-36 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">

        <div ref={headerRef} className="max-w-2xl mb-14 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-pastel-green text-pastel-green-fg px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
            {showStudentView ? 'مقرراتك' : 'المراحل الدراسية'}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            {showStudentView ? 'ابدأ التعلم من مقرراتك' : 'اختر مرحلة ابنك'}
          </h2>
          <p className="max-w-lg text-base text-muted-foreground font-medium leading-relaxed">
            {showStudentView
              ? 'المقررات المتاحة لك بناءً على مرحلتك الدراسية.'
              : 'منهج سوداني متكامل لكل مرحلة من مراحل الأساس والمتوسط والثانوي.'}
          </p>
        </div>

        {/* ── Student View: Bento course cards ── */}
        {showStudentView ? (
          <div>
            {loadingCourses ? (
              <div className="flex justify-center py-24">
                <RefreshIcon className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                {courses.map((course) => (
                  <Link key={course.id} href={`/courses/${course.id}`} className="group block">
                    <div className="rounded-[2rem] overflow-hidden bg-muted border border-border transition-transform duration-300 group-hover:-translate-y-1">
                      <div className="relative h-44 w-full overflow-hidden bg-muted/60 flex items-center justify-center">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <PlayCircleIcon className="h-8 w-8 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="p-7 space-y-3 bg-card">
                        <h3 className="text-lg font-black leading-snug">{course.title}</h3>
                        <p className="text-sm text-muted-foreground font-medium line-clamp-2 leading-relaxed">
                          {course.description || 'مقرر دراسي متكامل يواكب المنهج السوداني.'}
                        </p>
                        <div className="flex items-center gap-2 text-sm font-bold pt-1 group-hover:gap-3 transition-all">
                          <span>عرض المقرر</span>
                          <ArrowLeftIcon className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Guest View: Bento stage tiles ── */
          <div>
            {loadingStages ? (
              <div className="flex justify-center py-24">
                <RefreshIcon className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : stages.length === 0 ? (
              <div className="text-center py-24 space-y-4 rounded-[2rem] bg-muted">
                <LayersIcon className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <h3 className="text-lg font-bold text-muted-foreground">لا توجد مراحل دراسية متاحة حالياً</h3>
              </div>
            ) : (
              <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
                {stages.filter(s => s.isActive).map((stage, index) => {
                  const meta = getStageMetadata(index)
                  return (
                    <Link key={stage.id} href={`/courses?stage=${stage.id}`} className="group block">
                      <div className={`relative overflow-hidden rounded-[2rem] ${meta.bg} ${meta.fg} p-8 sm:p-9 flex flex-col justify-between min-h-[300px] transition-transform duration-300 group-hover:-translate-y-1`}>

                        <div className="relative z-10 space-y-2.5">
                          <span className="text-xs font-black opacity-50 tracking-widest">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <h3 className="text-2xl font-black leading-tight">{stage.name}</h3>
                          <p className="text-sm font-medium leading-relaxed opacity-80 max-w-xs">
                            {stage.description || meta.description}
                          </p>
                        </div>

                        {/* decorative spheres */}
                        <div className={`pointer-events-none absolute -bottom-14 -left-10 h-48 w-48 rounded-full bg-gradient-to-br ${meta.sphere} blur-xl`} />
                        <div className="pointer-events-none absolute bottom-6 left-6 h-16 w-16 rounded-full bg-gradient-to-br from-white/60 to-white/10" />

                        <div className="relative z-10 flex items-center justify-end">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:-translate-x-1">
                            <ArrowLeftIcon className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}