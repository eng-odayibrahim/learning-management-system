'use client'
import { RefreshIcon } from '@solar-icons/react/outline';


import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/dashboard-navbar'

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user && !isAdmin) {
      router.push('/my-portal')
    }
  }, [user, isAdmin, loading, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 bg-white">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <RefreshIcon className="h-8 w-8 animate-spin text-zinc-900" />
          <span className="text-sm font-bold mt-3">جاري التحقق من الصلاحيات...</span>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="flex min-h-screen font-sans text-zinc-900">
      <DashboardSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardNavbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

