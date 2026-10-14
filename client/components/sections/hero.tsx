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
    },
    { scope: sectionRef }
  )

  return (
    <section ref={sectionRef} className="flex items-center justify-center h-screen w-full max-w-7xl mx-auto rounded-3xl mt-2 px-4 sm:px-0">
      <div
        className="relative overflow-hidden w-full h-full px-6 sm:px-12 lg:px-16 rounded-3xl flex flex-col justify-center"
        style={{
          backgroundImage: 'url(/images/bg-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* ── Dark contrast gradient overlay for maximum readability ── */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/55 to-black/30 pointer-events-none rounded-3xl" />
        <div className="absolute inset-0 bg-black/25 pointer-events-none rounded-3xl" />

        {/* ── Text block ── */}
        <div className="relative z-10 max-w-2xl pt-10 sm:pt-0">
          <span
            data-hero-eyebrow
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[12px] font-bold uppercase tracking-[0.2em] text-teal-300"
          >
            مدرسة سودانية أونلاين
          </span>

          <h1
            data-hero-heading
            className="text-[2.5rem] sm:text-6xl lg:text-[4.25rem] font-black tracking-tight leading-[1.08] text-white mt-5 drop-shadow-md"
          >
            تعليم يليق بأبنائنا،
            <br />
            أينما كانوا.
          </h1>

          <p
            data-hero-desc
            className="mt-6 max-w-lg text-base sm:text-lg text-zinc-100 font-medium leading-relaxed drop-shadow-sm"
          >
            مدرسة أثر التعليمية تجمع أبناءكم بمعلمين سودانيين ومنهج معتمد، عبر مراحل
            الأساس والمتوسط والثانوي.
          </p>

          <div data-hero-cta className="flex flex-wrap items-center gap-5 sm:gap-6 mt-9">
            <a
              href={WHATSAPP_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 h-13 px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-teal-950/40"
            >
              سجّل ابنك الآن
              <ArrowLeftIcon className="h-4 w-4" />
            </a>
            <Link
              href="/courses"
              className="text-sm font-bold text-white/90 hover:text-white border-b-2 border-white/30 hover:border-white transition-all pb-0.5 drop-shadow-sm"
            >
              تصفح المراحل الدراسية
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}