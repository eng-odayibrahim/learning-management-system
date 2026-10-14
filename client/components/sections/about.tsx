'use client'
import { ArrowLeftIcon } from '@solar-icons/react/outline';


import React, { useRef } from 'react'
import Link from 'next/link'
import { WHATSAPP_REGISTER_URL } from '@/lib/whatsapp'
import { useFadeUpReveal, useStaggerReveal } from '@/lib/use-gsap-scroll'


export const AboutSection: React.FC = () => {
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useFadeUpReveal(headerRef, { yFrom: 28, duration: 0.8 })
  useStaggerReveal(gridRef, { stagger: 0.1, yFrom: 28, duration: 0.75 })

  return (
    <section id="about" className="py-24 sm:py-36 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">

        <div ref={headerRef} className="max-w-2xl mb-14 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-pastel-yellow text-pastel-yellow-fg px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
            من نحن
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            مدرسة سودانية،
            <br />
            بناها معلمون سودانيون.
          </h2>
        </div>

        {/* ── Bento Grid ── */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2 gap-4 lg:gap-5"
        >
          {/* Tile 1 — tall, primary tile */}
          <div className="lg:row-span-2 relative overflow-hidden rounded-[2rem] bg-pastel-blue text-pastel-blue-fg p-9 sm:p-11 flex flex-col justify-between min-h-[440px]">
            <div className="relative z-10 space-y-3 max-w-xs">
              <h3 className="text-2xl sm:text-[1.75rem] font-black leading-tight">
                منهج سوداني معتمد لكل مرحلة
              </h3>
              <p className="text-sm sm:text-[15px] font-medium leading-relaxed opacity-80">
                نلتزم بالمنهج الرسمي في مراحل الأساس والمتوسط والثانوي، أياً كان
                مكان إقامة أسرتكم.
              </p>
            </div>

            {/* decorative gradient spheres */}
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-2xl" />
            <div className="pointer-events-none absolute bottom-6 left-8 h-28 w-28 rounded-full bg-gradient-to-br from-white/70 to-white/10" />
            <div className="pointer-events-none absolute bottom-16 left-24 h-14 w-14 rounded-full bg-gradient-to-br from-white/60 to-white/0" />

            <div className="relative z-10 flex items-center gap-3">
              <a
                href={WHATSAPP_REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center h-11 px-6 rounded-full bg-foreground text-background font-bold text-sm"
              >
                سجّل الآن
              </a>
              <Link
                href="/courses"
                aria-label="تصفح المراحل الدراسية"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Tile 2 — teachers */}
          <div className="relative rounded-[2rem] bg-pastel-green text-pastel-green-fg p-8 sm:p-9 flex flex-col justify-between min-h-[210px]">
            <div className="space-y-2">
              <h3 className="text-xl font-black">معلمون سودانيون</h3>
              <p className="text-sm font-medium leading-relaxed opacity-80 max-w-xs">
                نخبة من المعلمين ذوي الخبرة، يشرحون بأسلوب واضح وقريب من الطالب.
              </p>
            </div>
            <Link href="/#faq" className="inline-flex items-center gap-2 text-sm font-bold mt-4 group w-fit">
              اقرأ المزيد
              <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>

          {/* Tile 3 — supervision */}
          <div className="relative rounded-[2rem] bg-muted text-foreground p-8 sm:p-9 flex flex-col justify-between min-h-[210px]">
            <div className="space-y-2">
              <h3 className="text-xl font-black">متابعة مطمئنة</h3>
              <p className="text-sm font-medium leading-relaxed text-muted-foreground max-w-xs">
                تتابعون تقدّم ابنكم أولاً بأول، في بيئة آمنة تحت إشراف الإدارة.
              </p>
            </div>
            <Link href="/#faq" className="inline-flex items-center gap-2 text-sm font-bold mt-4 group w-fit">
              اقرأ المزيد
              <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>

          {/* Tile 4 — tall, flexibility */}
          <div className="lg:row-span-2 lg:col-start-3 lg:row-start-1 relative overflow-hidden rounded-[2rem] bg-secondary text-foreground p-9 sm:p-11 flex flex-col justify-between min-h-[440px]">
            <div className="space-y-2 max-w-xs">
              <h3 className="text-2xl font-black leading-tight">مرونة تناسب كل بيت</h3>
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                دروس مسجلة يشاهدها الطالب في الوقت الذي يناسب أسرته، دون مواعيد ثابتة.
              </p>
            </div>

            {/* decorative gradient spheres */}
            <div className="pointer-events-none absolute top-1/3 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-pastel-yellow/70 to-transparent blur-xl" />
            <div className="pointer-events-none absolute bottom-24 right-10 h-24 w-24 rounded-full bg-gradient-to-br from-primary/50 to-primary/5" />
            <div className="pointer-events-none absolute bottom-10 right-24 h-12 w-12 rounded-full bg-gradient-to-br from-pastel-blue/60 to-transparent" />

            <Link
              href="/courses"
              aria-label="تصفح المراحل الدراسية"
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}