'use client'

import React, { createContext, useContext, useEffect, useState, type FC } from 'react'
import { User, RoleType } from '@/lib/types'
import { api } from '@/lib/api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isStudent: boolean
  login: (data: { username: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (module: string, action: 'read' | 'edit') => boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  isStudent: false,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  hasPermission: () => false,
})

export const AuthProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
        const u = await api.getMe()
        setUser(u)
      } else {
        setUser(null)
      }
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        setUser(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial check from localStorage for immediate render while fetching getMe
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user')
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch (e) {}
      }
    }
    refreshUser()
  }, [])

  const login = async (data: { username: string; password: string }) => {
    const res = await api.login(data)
    setUser(res.user)
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
  }

  const hasPermission = (module: string, action: 'read' | 'edit') => {
    if (!user || user.role !== 'admin') return false
    if (user.isSuperAdmin) return true
    return !!(user.permissions?.[module]?.[action])
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student',
        login,
        logout,
        refreshUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
