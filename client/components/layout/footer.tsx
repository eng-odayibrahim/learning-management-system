'use client'
import { DiplomaIcon } from '@solar-icons/react/outline';


import React, { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFadeUpReveal } from '@/lib/use-gsap-scroll'
import { WHATSAPP_SUPPORT_URL } from '@/lib/whatsapp'


const quickLinks = [
  { href: '/', label: 'الرئيسية' },
  { href: '/courses', label: 'المراحل الدراسية' },
  { href: '/#about', label: 'من نحن' },
  { href: '/#how-it-works', label: 'كيف تبدأ' },
  { href: '/#faq', label: 'الأسئلة الشائعة' },
  { href: '/login', label: 'تسجيل الدخول' },
]

const socialLinks = [
  {
    label: 'X (Twitter)',
    href: '#',
    icon: (
      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: '#',
    icon: (
      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: WHATSAPP_SUPPORT_URL,
    icon: (
      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
]

export const Footer: React.FC = () => {
  const pathname = usePathname()
  const footerRef = useRef<HTMLElement>(null)

  useFadeUpReveal(footerRef, { yFrom: 22, duration: 0.75 })

  if (pathname?.startsWith('/dashboard')) return null

  const currentYear = new Date().getFullYear()

  return (
    <footer ref={footerRef} className="pb-8">
      <div className="mx-auto max-w-7xl px-6 py-6 md:py-10 sm:px-8 lg:px-10 bg-[#111111] dark:bg-[#1A1A1A] text-white/90 dark:text-neutral-200 border border-black/5 dark:border-border/60 rounded-[2rem] shadow-sm">

        {/* ── Bento tiles ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Brand tile */}
          <div className="lg:col-span-1 relative overflow-hidden rounded-[2rem] border border-white/10 dark:border-border/40 p-8 sm:p-9 flex flex-col justify-between min-h-[220px]">
            <div className="relative z-10 space-y-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <DiplomaIcon className="h-5 w-5"  />
              </span>
              <p className="text-sm font-medium leading-relaxed opacity-80 max-w-xs">
                مدرسة سودانية أونلاين تغطي مراحل الأساس والمتوسط والثانوي،
                بمنهج معتمد ومعلمين سودانيين، لكل بيت.
              </p>
            </div>
          </div>

          {/* Quick links tile */}
          <div className="rounded-[2rem] border border-white/10 dark:border-border/40 p-8 sm:p-9 flex flex-col min-h-[220px]">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] mb-5 opacity-70">
              روابط سريعة
            </h3>
            <ul className="space-y-2.5 grid grid-cols-2 gap-x-4">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-bold opacity-80 hover:opacity-100 hover:underline transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social / contact tile */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 dark:border-border/40 p-8 sm:p-9 flex flex-col justify-between min-h-[220px]">
            <div className="relative z-10 space-y-3">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] opacity-70">تواصل معنا</h3>
              <p className="text-sm font-medium leading-relaxed opacity-80">
                تابعونا لمتابعة آخر الأخبار والتحديثات.
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-2 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex items-center justify-center h-10 w-10 rounded-full border border-white/10 dark:border-border/40 hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Big repeated wordmark */}
        <div className="overflow-hidden mt-4">
          <p className="text-center text-[12vw] leading-none font-black tracking-tight text-white/10 dark:text-white/5 select-none py-2 whitespace-nowrap">
            أثر التعليمية
          </p>
        </div>

        <div className="border-t border-white/10 dark:border-border/40 pt-6">
          <p className="text-center text-xs text-white/40 dark:text-muted-foreground/60 font-medium">
            © {currentYear} مدرسة أثر التعليمية. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  )
}