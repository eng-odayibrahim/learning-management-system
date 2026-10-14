'use client'
import { AltArrowLeftIcon, Book2Icon, CloseCircleIcon, DiplomaIcon, HamburgerMenuIcon, Logout2Icon } from '@solar-icons/react/outline';


import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { ThemeToggle } from '@/components/shared/theme-toggle'
import { WHATSAPP_REGISTER_URL } from '@/lib/whatsapp'

const navLinks = [
  { href: '/', label: 'الرئيسية' },
  { href: '/courses', label: 'المراحل الدراسية' },
  { href: '/#about', label: 'من نحن' },
  { href: '/#how-it-works', label: 'كيف تبدأ' },
  { href: '/#faq', label: 'الأسئلة الشائعة' },
]

export const Navbar: React.FC = () => {
  const { user, isAdmin, isStudent, logout, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('')

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    if (pathname !== '/') {
      setActiveSection('')
      return
    }

    const sectionIds = ['about', 'how-it-works', 'faq']

    const handleScroll = () => {
      if (window.scrollY < 200) {
        setActiveSection('')
        return
      }

      const scrollPosition = window.scrollY + 250
      let currentSection = ''

      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPosition >= top && scrollPosition < top + height) {
            currentSection = id
            break
          }
        }
      }

      setActiveSection(currentSection)
    }

    const handleHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (sectionIds.includes(hash)) {
        setActiveSection(hash)
      } else if (!hash) {
        setActiveSection('')
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('hashchange', handleHash)

    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('hashchange', handleHash)
    }
  }, [pathname])

  if (pathname?.startsWith('/dashboard')) return null

  const isActiveLink = (href: string) => {
    if (pathname !== '/') {
      if (href === '/' || href.startsWith('/#')) return false
      return pathname?.startsWith(href)
    }

    // On home page ('/')
    if (href === '/') {
      return !activeSection
    }
    if (href.startsWith('/#')) {
      const sectionId = href.replace('/#', '')
      return activeSection === sectionId
    }
    return false
  }

  const accountHref = isAdmin ? '/dashboard' : '/my-portal'
  const accountLabel = isAdmin ? 'لوحة الإدارة' : 'مقرراتي'
  const AccountIcon = isAdmin ? DiplomaIcon : Book2Icon

  return (
    <>
      <div className="fixed top-2 right-4 left-4 z-50 px-4">
        <header className="mx-auto max-w-7xl rounded-full bg-[#111111]/95 dark:bg-[#1A1A1A]/95 text-white backdrop-blur-xl border border-black/5 dark:border-border/60 shadow-sm shadow-black/5">
          <div className="flex h-16 items-center justify-between px-3 sm:px-5">
            {/* ── Wordmark ── */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 pl-1.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <DiplomaIcon className="h-4.5 w-4.5"  />
              </span>
              <span className="font-black text-base sm:text-lg tracking-tight text-white/95">
                مدرسة أثر التعليمية
              </span>
            </Link>

            {/* ── Desktop Navigation ── */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    if (link.href.startsWith('/#')) {
                      setActiveSection(link.href.replace('/#', ''))
                    } else if (link.href === '/') {
                      setActiveSection('')
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-[13px] font-bold transition-colors duration-300 ${
                    isActiveLink(link.href) ? 'text-white underline underline-offset-4' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* ── Right Actions ── */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {!loading && !user ? (
                <div className="hidden sm:flex items-center gap-1">
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-full text-[13px] font-bold text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    دخول
                  </Link>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full px-5 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[13px]"
                  >
                    <a href={WHATSAPP_REGISTER_URL} target="_blank" rel="noopener noreferrer">سجّل الآن</a>
                  </Button>
                </div>
              ) : !loading && user ? (
                <div className="hidden sm:flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2.5 rounded-full border border-white/15 dark:border-border px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10 dark:hover:bg-muted transition-colors cursor-pointer outline-none">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">
                          {user.fullName.charAt(0)}
                        </span>
                        <span className="max-w-[100px] truncate text-white text-[13px]">{user.fullName}</span>
                        <AltArrowLeftIcon className="h-3.5 w-3.5 text-white/60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2" sideOffset={8}>
                      <div className="px-3 py-2.5 border-b border-border mb-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">الحساب</p>
                        <p className="text-xs font-bold truncate mt-0.5">{user.email || user.username}</p>
                      </div>
                      <DropdownMenuItem
                        onClick={() => router.push(accountHref)}
                        className="gap-2.5 justify-end py-2.5 rounded-xl font-bold text-sm cursor-pointer"
                      >
                        <span>{accountLabel}</span>
                        <AccountIcon className="h-4 w-4" />
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => { await logout(); router.push('/') }}
                        className="gap-2.5 justify-end text-destructive hover:bg-destructive/10 py-2.5 rounded-xl font-bold text-sm cursor-pointer mt-1"
                      >
                        <span>تسجيل الخروج</span>
                        <Logout2Icon className="h-4 w-4" />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : null}

              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden flex items-center justify-center h-10 w-10 rounded-full bg-white/10 dark:bg-muted text-white dark:text-foreground hover:bg-white/20 dark:hover:bg-muted/70 transition-colors"
                aria-label="فتح القائمة"
              >
                <HamburgerMenuIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-4 left-4 right-4 rounded-[2rem] bg-background border border-border shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <DiplomaIcon className="h-4.5 w-4.5"  />
                </span>
                <span className="font-black text-lg text-foreground">مدرسة أثر التعليمية</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center h-9 w-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
              >
                <CloseCircleIcon className="h-4.5 w-4.5" />
              </button>
            </div>

            <nav className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    setMobileOpen(false)
                    if (link.href.startsWith('/#')) {
                      setActiveSection(link.href.replace('/#', ''))
                    } else if (link.href === '/') {
                      setActiveSection('')
                    }
                  }}
                  className={`block px-4 py-3.5 rounded-2xl text-base font-bold ${
                    isActiveLink(link.href) ? 'text-foreground bg-muted' : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <Link
                  href={accountHref}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-base font-bold text-muted-foreground"
                >
                  <AccountIcon className="h-4.5 w-4.5" />
                  {accountLabel}
                </Link>
              )}
            </nav>

            <div className="p-5 space-y-3">
              {!loading && !user ? (
                <>
                  <Button asChild className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">
                    <a href={WHATSAPP_REGISTER_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>إنشاء حساب جديد</a>
                  </Button>
                  <Button asChild variant="outline" className="w-full h-12 rounded-full font-bold text-sm">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>تسجيل الدخول</Link>
                  </Button>
                </>
              ) : !loading && user ? (
                <Button
                  variant="outline"
                  onClick={async () => { await logout(); setMobileOpen(false); router.push('/') }}
                  className="w-full h-11 rounded-full font-bold text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Logout2Icon className="h-4 w-4" />
                  تسجيل الخروج
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  )
}