'use client'
import { ArrowLeftIcon } from '@solar-icons/react/outline';



import React, { useRef } from 'react'
import Link from 'next/link'
import { WHATSAPP_REGISTER_URL } from '@/lib/whatsapp'
import { useFadeUpReveal } from '@/lib/use-gsap-scroll'


export const CTASection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  useFadeUpReveal(ref, { yFrom: 26, duration: 0.8 })

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div
          ref={ref}
          className="relative overflow-hidden rounded-[2.5rem] bg-pastel-blue text-pastel-blue-fg px-8 py-16 sm:px-16 sm:py-20 text-center"
        >
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
              ابدأ رحلة ابنك التعليمية اليوم
            </h2>
            <p className="text-base sm:text-lg font-medium opacity-80 max-w-lg mx-auto leading-relaxed">
              دقائق تفصلكم عن أول درس — منهج سوداني معتمد، ومعلمون سودانيون، من أي مكان.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <a
                href={WHATSAPP_REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 h-14 px-8 rounded-full bg-foreground text-background font-extrabold text-[15px] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                سجّل ابنك الآن
                <ArrowLeftIcon className="h-4 w-4" />
              </a>
              <Link
                href="/courses"
                className="text-[15px] font-bold border-b border-current/40 hover:border-current/80 transition-colors pb-0.5"
              >
                تصفح المراحل الدراسية
              </Link>
            </div>
          </div>

          {/* decorative spheres */}
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-gradient-to-br from-pastel-yellow/60 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute bottom-10 right-16 h-20 w-20 rounded-full bg-gradient-to-br from-white/70 to-white/10" />
        </div>
      </div>
    </section>
  )
}