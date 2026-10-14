'use client'
import { Logout2Icon } from '@solar-icons/react/outline';


import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { ThemeToggle } from '@/components/shared/theme-toggle'
import { User } from 'lucide-react'

export function DashboardNavbar() {
  const { user, logout } = useAuth()
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 w-full bg-card backdrop-blur-md h-16 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4">
        {/* Placeholder for left side if needed, mobile toggle is currently in sidebar */}
        <div className="hidden md:flex items-center gap-2">
          <h1 className="text-xl text-foreground font-bold">
            لوحة التحكم
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 rounded-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-semibold shadow-none transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs border border-teal-500/20">
                  {user.fullName.charAt(0)}
                </div>
                <span className="max-w-[100px] truncate hidden sm:inline-block text-zinc-900 dark:text-zinc-50">{user.fullName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-none border">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 text-right">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">مشرف النظام</p>
                <p className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-50">{user.email || user.username}</p>
              </div>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/profile"
                  className="gap-2 justify-end text-zinc-700 dark:text-zinc-200 py-2 cursor-pointer font-bold mt-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center"
                >
                  <span>الملف الشخصي</span>
                  <User className="h-4 w-4" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await logout()
                  router.push('/')
                }}
                className="gap-2 justify-end text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:bg-red-50 dark:focus:bg-red-950/30 py-2 cursor-pointer font-bold mt-1"
              >
                <span>تسجيل الخروج</span>
                <Logout2Icon className="h-4 w-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
