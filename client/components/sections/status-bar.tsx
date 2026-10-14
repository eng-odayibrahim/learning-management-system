'use client'
import { HistoryIcon, LayersIcon, VerifiedCheckIcon } from '@solar-icons/react/outline';



import React, { useRef } from 'react'
import { useFadeUpReveal, useStaggerReveal } from '@/lib/use-gsap-scroll'


const stats = [
  { icon: LayersIcon, value: '٣', label: 'مراحل دراسية كاملة', bg: 'bg-pastel-green', fg: 'text-pastel-green-fg' },
  { icon: VerifiedCheckIcon, value: 'معتمد', label: 'منهج سوداني رسمي', bg: 'bg-pastel-yellow', fg: 'text-pastel-yellow-fg' },
  { icon: HistoryIcon, value: 'مرن', label: 'جدول يناسب كل بيت', bg: 'bg-pastel-blue', fg: 'text-pastel-blue-fg' },
]

export const StatsSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null)
  useStaggerReveal(ref, { stagger: 0.1, yFrom: 24, duration: 0.7 })

  return (
    <section className="py-4">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`relative overflow-hidden rounded-[2rem] ${stat.bg} ${stat.fg} p-7 flex items-center gap-4 min-h-[110px]`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
                <stat.icon className="h-6 w-6"  />
              </span>
              <div className="relative z-10">
                <p className="text-2xl font-black tracking-tight">{stat.value}</p>
                <p className="text-xs font-bold opacity-70 mt-0.5">{stat.label}</p>
              </div>
              <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}