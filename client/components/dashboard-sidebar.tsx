'use client'
import { Book2Icon, BookIcon, CardIcon, ClipboardTextIcon, CloseCircleIcon, HamburgerMenuIcon, LayersIcon, ListIcon, Logout2Icon, ShieldWarningIcon, StarIcon, UserCheckIcon, UsersGroupRoundedIcon, WidgetIcon } from '@solar-icons/react/outline';


import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'

import { useAuth } from '@/context/auth-context'

export function DashboardSidebar() {
  const pathname = usePathname()
  const { logout, hasPermission, user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  // Prevent scrolling when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  const navItems = [
    { href: '/dashboard', label: 'الرئيسية', icon: WidgetIcon, module: 'dashboard' },
    { href: '/dashboard/categories', label: 'الهيكل التعليمي', icon: LayersIcon, module: 'categories' },
    { href: '/dashboard/courses', label: 'المقررات الدراسية', icon: Book2Icon, module: 'courses' },
    { href: '/dashboard/courseworks', label: 'ادارة الواجبات ', icon: UserCheckIcon, module: 'courses' },
    { href: '/dashboard/quizzes', label: 'إدارة الاختبارات', icon: ClipboardTextIcon, module: 'quizzes' },
    { href: '/dashboard/students', label: 'ادارة الطلاب ', icon: UsersGroupRoundedIcon, module: 'students' },
    { href: '/dashboard/admins', label: 'ادارة المشرفين', icon: ShieldWarningIcon, module: 'admins' },
    { href: '/dashboard/profile', label: 'الملف الشخصي', icon: User, module: 'profile' },
  ]

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 right-4 z-[60]">
        <Button variant="outline" size="icon" onClick={toggleSidebar} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50">
          {isOpen ? <CloseCircleIcon className="h-5 w-5" /> : <HamburgerMenuIcon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 right-0 z-50 h-screen w-72 flex-col bg-card transition-transform duration-300 ease-in-out flex overflow-y-auto
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-teal-600 dark:text-teal-400">
              <ShieldWarningIcon  className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-black leading-tight text-zinc-900 dark:text-zinc-50">
                إدارة النظام
              </h1>
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-md border border-teal-500/20 inline-block mt-1">
                {user?.isSuperAdmin ? 'صلاحيات كاملة' : 'صلاحيات مخصصة'}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.filter(item => item.module === 'profile' || hasPermission(item.module, 'read')).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? 'secondary' : 'ghost'}
                className={`flex items-center justify-start gap-3 px-3 py-6 rounded-full font-semibold transition-all text-md w-full
                  ${isActive 
                    ? 'bg-foreground text-background shadow-none hover:bg-foreground/80' 
                    : 'text-foreground hover:bg-foreground/5 border border-transparent'
                  }`}
                onClick={() => setIsOpen(false)}
              >
                <Link href={item.href}>
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </Button>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 mt-auto">
          <Button
            variant="ghost"
            className="w-full flex justify-start gap-3 px-3 py-6 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            onClick={async () => {
              await logout();
              window.location.href = '/'; 
            }}
          >
            <Logout2Icon className="h-5 w-5 shrink-0" />
            <span className="truncate font-semibold">تسجيل الخروج</span>
          </Button>
        </div>
      </aside>
    </>
  )
}

