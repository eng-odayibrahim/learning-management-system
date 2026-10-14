'use client'
import { MagnifierIcon, RefreshIcon, StarIcon, WalletIcon } from '@solar-icons/react/outline';


import React, { useState } from 'react'
import { User } from '@/lib/types'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'

import { useAuth } from '@/context/auth-context'

export function FinanceTab({ students, reload }: { students: User[], reload: () => void }) {
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('students', 'edit')

  const handleTogglePaid = async (studentId: string, currentPaid: boolean, currentPercentage: number) => {
    setUpdating(studentId)
    try {
      await api.adminUpdateFinance(studentId, { isPaid: !currentPaid, paidPercentage: currentPercentage })
      reload()
    } catch (e) {
      alert('فشل تحديث الحالة المالية')
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdatePercentage = async (studentId: string, currentPaid: boolean, newPercentage: number) => {
    if (newPercentage < 0 || newPercentage > 100) return alert('النسبة يجب أن تكون بين 0 و 100')
    setUpdating(studentId)
    try {
      await api.adminUpdateFinance(studentId, { isPaid: currentPaid, paidPercentage: newPercentage })
      reload()
    } catch (e) {
      alert('فشل تحديث النسبة')
    } finally {
      setUpdating(null)
    }
  }

  const filtered = students.filter(s => s.fullName.toLowerCase().includes(search.toLowerCase()) || s.username.includes(search))

  return (
    <Card>
      <CardHeader className="pb-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="font-extrabold text-lg flex items-center gap-2 text-foreground">
            <WalletIcon className="h-6 w-6 text-primary" />
            <span>المالية والرسوم ({students.length})</span>
          </CardTitle>
          <CardDescription className="text-xs">
            إدارة حالة الدفع والنسب المئوية لكل طالب
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-64">
          <MagnifierIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو المعرف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 h-10 font-semibold"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table dir="rtl">
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border">
              <TableHead className="text-right whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">اسم الطالب</TableHead>
              <TableHead className="text-right whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">رقم الطالب</TableHead>
              <TableHead className="text-right whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">حالة الدفع</TableHead>
              <TableHead className="text-right whitespace-nowrap px-6 py-4 text-muted-foreground font-bold">نسبة الدفع (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(student => (
              <TableRow key={student.id} className="hover:bg-muted/50 border-border transition-colors">
                <TableCell className="font-black text-right px-6 py-3 text-foreground">{student.fullName}</TableCell>
                <TableCell className="text-right font-mono text-sm px-6 py-3 text-muted-foreground">{student.username}</TableCell>
                <TableCell className="text-right px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={student.isPaid || false}
                      onCheckedChange={() => handleTogglePaid(student.id, student.isPaid || false, student.paidPercentage || 0)}
                      disabled={!canEdit || updating === student.id}
                      dir="ltr"
                    />
                    <span className="text-xs font-bold text-muted-foreground">
                      {student.isPaid ? 'تم الدفع' : 'غير مدفوع'}
                    </span>
                    {updating === student.id && <RefreshIcon className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                </TableCell>
                <TableCell className="text-right px-6 py-3">
                  <div className="flex items-center gap-2 max-w-[120px]">
                    <Input
                      type="number"
                      min="0" max="100"
                      defaultValue={student.paidPercentage || 0}
                      onBlur={(e) => {
                        const val = Number(e.target.value)
                        if (val !== (student.paidPercentage || 0)) {
                          handleUpdatePercentage(student.id, student.isPaid || false, val)
                        }
                      }}
                      disabled={!canEdit || updating === student.id}
                      className="text-center h-8 font-mono"
                      dir="ltr"
                    />
                    <span className="text-muted-foreground font-bold text-sm">%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا يوجد بيانات</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}