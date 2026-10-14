'use client'
import { Banknote2Icon, Buildings2Icon, ChatDotsIcon, EyeIcon, SmartphoneIcon, VideocameraIcon } from '@solar-icons/react/outline';





import React, { useRef } from 'react'
import { useFadeUpReveal, useStaggerReveal } from '@/lib/use-gsap-scroll'


export const FeaturesSection: React.FC = () => {
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useFadeUpReveal(headerRef, { yFrom: 28, duration: 0.8 })
  useStaggerReveal(gridRef, { stagger: 0.1, yFrom: 28, duration: 0.75 })

  return (
    <section id="features" className="py-24 sm:py-36 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">

        <div ref={headerRef} className="max-w-2xl mb-14 space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-pastel-green text-pastel-green-fg px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
            مميزات المنصة
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            كل ما يحتاجه بيتكم للمذاكرة
          </h2>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">

          {/* Tile 1 — large, recorded lessons */}
          <div className="md:col-span-2 relative overflow-hidden rounded-[2rem] bg-pastel-green text-pastel-green-fg p-9 sm:p-11 flex flex-col justify-between min-h-[280px]">
            <div className="relative z-10 space-y-3 max-w-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background mb-2">
                <VideocameraIcon className="h-6 w-6"  />
              </span>
              <h3 className="text-2xl font-black leading-tight">دروس مسجلة، تُشاهد في أي وقت</h3>
              <p className="text-sm font-medium leading-relaxed opacity-80">
                لا مواعيد ثابتة. الطالب يفتح درسه، يوقفه، ويعيد مشاهدته براحته،
                في الوقت الذي يناسب جدول أسرته.
              </p>
            </div>

            <div className="pointer-events-none absolute -bottom-16 -left-14 h-60 w-60 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-2xl" />
            <div className="pointer-events-none absolute bottom-8 left-16 h-20 w-20 rounded-full bg-gradient-to-br from-white/70 to-white/10" />
          </div>

          {/* Tile 2 — parent tracking */}
          <div className="relative overflow-hidden rounded-[2rem] bg-muted text-foreground p-8 sm:p-9 flex flex-col justify-between min-h-[280px]">
            <div className="relative z-10 space-y-2.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                <EyeIcon className="h-6 w-6"  />
              </span>
              <h3 className="text-xl font-black leading-tight mt-4">متابعة مستمرة لأولياء الأمور</h3>
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                تطمئنون على تقدّم ابنكم في مقرراته أولاً بأول، دون الحاجة لأي متابعة يدوية.
              </p>
            </div>
          </div>

          {/* Tile 3 — works on all devices */}
          <div className="relative overflow-hidden rounded-[2rem] bg-pastel-blue text-pastel-blue-fg p-8 sm:p-9 flex flex-col justify-between min-h-[280px]">
            <div className="relative z-10 space-y-2.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                <SmartphoneIcon className="h-6 w-6"  />
              </span>
              <h3 className="text-xl font-black leading-tight mt-4">يعمل على كل الأجهزة</h3>
              <p className="text-sm font-medium leading-relaxed opacity-80">
                الهاتف أو التابلت أو الكمبيوتر — أي جهاز متاح في البيت يكفي لبدء المذاكرة.
              </p>
            </div>

            <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-white/60 to-transparent blur-xl" />
          </div>

          {/* Tile 4 — support */}
          <div className="relative overflow-hidden rounded-[2rem] bg-secondary text-foreground p-8 sm:p-9 flex flex-col justify-between min-h-[220px]">
            <div className="relative z-10 space-y-2.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                <ChatDotsIcon className="h-6 w-6"  />
              </span>
              <h3 className="text-xl font-black leading-tight mt-4">دعم فني سريع</h3>
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                فريقنا على واتساب لأي استفسار أو مساعدة في الدخول والاشتراك.
              </p>
            </div>
          </div>

          {/* Tile 5 — flexible payment, wide */}
          <div className="relative overflow-hidden rounded-[2rem] bg-pastel-yellow text-pastel-yellow-fg p-8 sm:p-9 flex flex-col justify-between min-h-[220px]">
            <div className="relative z-10 space-y-2.5 max-w-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                <Buildings2Icon className="h-6 w-6"  />
              </span>
              <h3 className="text-xl font-black leading-tight mt-4">اشتراك مرن بالتحويل البنكي</h3>
              <p className="text-sm font-medium leading-relaxed opacity-80">
                اختاروا المقررات التي يحتاجها ابنكم وادفعوا عبر البنك — يتم تفعيل الحساب فور التأكيد.
              </p>
            </div>

            <div className="pointer-events-none absolute -bottom-14 -left-10 h-48 w-48 rounded-full bg-gradient-to-br from-white/60 to-transparent blur-xl" />
            <div className="pointer-events-none absolute bottom-6 left-10 h-16 w-16 rounded-full bg-gradient-to-br from-white/70 to-white/10" />
          </div>
        </div>
      </div>
    </section>
  )
}