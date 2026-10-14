'use client'
import { ArrowLeftIcon } from '@solar-icons/react/outline';


import React, { useRef } from 'react'
import Link from 'next/link'
import { WHATSAPP_REGISTER_URL } from '@/lib/whatsapp'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'


export const HeroSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-hero-eyebrow]', { opacity: 0, y: 14, duration: 0.6 })
        .from('[data-hero-heading]', { opacity: 0, y: 26, duration: 0.8 }, '-=0.3')
        .from('[data-hero-desc]', { opacity: 0, y: 18, duration: 0.65 }, '-=0.45')
        .from('[data-hero-cta]', { opacity: 0, y: 14, duration: 0.55 }, '-=0.35')
        .from('[data-hero-media]', { opacity: 0, y: 32, duration: 0.9 }, '-=0.25')
    },
    { scope: sectionRef }
  )

  return (
    <section ref={sectionRef} className="flex items-center justify-center h-screen w-full max-w-7xl mx-auto rounded-3xl mt-2">
      <div className="w-full h-full px-6 sm:px-8 lg:px-10 rounded-3xl"
      style={{
      backgroundImage:'url(/images/bg-hero.jpg)',
      backgroundSize:'cover',
      backgroundPosition:'center',
      backgroundRepeat:'no-repeat'

    }}
      >

        {/* ── Text block ── */}
        <div>
          <span data-hero-eyebrow className="text-[12px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            مدرسة سودانية أونلاين
          </span>

          <h1
            data-hero-heading
            className="text-[2.5rem] sm:text-6xl lg:text-[4.25rem] font-black tracking-tight leading-[1.05] text-foreground mt-5"
          >
            تعليم يليق بأبنائنا،
            <br />
            أينما كانوا.
          </h1>

          <p
            data-hero-desc
            className="mt-6 max-w-lg text-base sm:text-lg text-muted-foreground font-medium leading-relaxed"
          >
            مدرسة أثر التعليمية تجمع أبناءكم بمعلمين سودانيين ومنهج معتمد، عبر مراحل
            الأساس والمتوسط والثانوي.
          </p>

          <div data-hero-cta className="flex flex-wrap items-center gap-6 mt-9">
            <a
              href={WHATSAPP_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 h-13 px-7 rounded-full bg-foreground text-background font-bold text-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              سجّل ابنك الآن
              <ArrowLeftIcon className="h-4 w-4" />
            </a>
            <Link
              href="/courses"
              className="text-sm font-bold text-foreground border-b border-foreground/30 hover:border-foreground/80 transition-colors pb-0.5"
            >
              تصفح المراحل الدراسية
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}