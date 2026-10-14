'use client'
import { MinimalisticMagnifierIcon, PlayCircleIcon, StarIcon, UserPlusIcon } from '@solar-icons/react/outline';



import React, { useRef } from 'react'
import { useFadeUpReveal, useStaggerReveal } from '@/lib/use-gsap-scroll'


const steps = [
  {
    number: '01',
    icon: UserPlusIcon,
    bg: 'bg-pastel-green',
    fg: 'text-pastel-green-fg',
    title: 'تواصل معنا للتسجيل',
    description: 'تواصل مع إدارة المدرسة عبر واتساب لتسجيل بيانات الطالب واستلام اسم المستخدم وكلمة المرور فوراً.',
  },
  {
    number: '02',
    icon: MinimalisticMagnifierIcon,
    bg: 'bg-pastel-blue',
    fg: 'text-pastel-blue-fg',
    title: 'اختر المرحلة والمقرر',
    description: 'حدد مرحلة ابنك الدراسية، ثم اختر المقررات التي يحتاجها وأكمل الاشتراك عبر التحويل البنكي.',
  },
  {
    number: '03',
    icon: PlayCircleIcon,
    bg: 'bg-pastel-yellow',
    fg: 'text-pastel-yellow-fg',
    title: 'ابدأ المذاكرة فوراً',
    description: 'بمجرد تفعيل الاشتراك، تُفتح الدروس أمام الطالب ليشاهدها في الوقت الذي يناسبه.',
  },
]

export const HowItWorksSection: React.FC = () => {
  const headerRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)

  useFadeUpReveal(headerRef, { yFrom: 28, duration: 0.8 })
  useStaggerReveal(stepsRef, { stagger: 0.1, yFrom: 28, duration: 0.75 })

  return (
    <section id="how-it-works" className="py-24 sm:py-36 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">

        <div ref={headerRef} className="max-w-2xl mb-14 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-pastel-blue text-pastel-blue-fg px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
            كيف تبدأ
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            ثلاث خطوات، وابنك في الدرس.
          </h2>
        </div>

        <div ref={stepsRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative overflow-hidden rounded-[2rem] ${step.bg} ${step.fg} p-8 sm:p-9 flex flex-col justify-between min-h-[420px]`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                  <step.icon className="h-6 w-6"  />
                </span>
                <span className="text-4xl font-black opacity-25 leading-none">{step.number}</span>
              </div>

              <div className="relative z-10 space-y-2.5 mt-6">
                <h3 className="text-xl font-black leading-tight">{step.title}</h3>
                <p className="text-sm font-medium leading-relaxed opacity-80">
                  {step.description}
                </p>
              </div>

              {/* decorative spheres — layered like the About tiles, offset per card for variety */}
              {index === 0 && (
                <>
                  <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-2xl" />
                  <div className="pointer-events-none absolute bottom-8 left-10 h-24 w-24 rounded-full bg-gradient-to-br from-white/70 to-white/10" />
                  <div className="pointer-events-none absolute bottom-20 left-28 h-12 w-12 rounded-full bg-gradient-to-br from-white/60 to-white/0" />
                </>
              )}
              {index === 1 && (
                <>
                  <div className="pointer-events-none absolute -bottom-14 -right-14 h-56 w-56 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-2xl" />
                  <div className="pointer-events-none absolute bottom-10 right-12 h-20 w-20 rounded-full bg-gradient-to-br from-white/70 to-white/10" />
                  <div className="pointer-events-none absolute bottom-24 right-28 h-10 w-10 rounded-full bg-gradient-to-br from-white/60 to-white/0" />
                </>
              )}
              {index === 2 && (
                <>
                  <div className="pointer-events-none absolute -top-14 -right-10 h-52 w-52 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-2xl" />
                  <div className="pointer-events-none absolute bottom-10 left-8 h-20 w-20 rounded-full bg-gradient-to-br from-white/70 to-white/10" />
                  <div className="pointer-events-none absolute bottom-24 left-24 h-10 w-10 rounded-full bg-gradient-to-br from-white/60 to-white/0" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}