'use client'

import React from 'react'
import { DangerTriangleIcon, RefreshIcon, TrashBinTrashIcon } from '@solar-icons/react/outline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  itemName?: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description = 'هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذه العملية بعد إتمامها.',
  itemName,
  confirmText = 'تأكيد الحذف',
  cancelText = 'إلغاء',
  loading = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 text-right">
        <div dir="rtl" className="space-y-4">
          <DialogHeader className="space-y-3 sm:text-right">
            <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <TrashBinTrashIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                {title}
              </DialogTitle>
              {itemName && (
                <p className="text-sm font-bold text-destructive mt-0.5 line-clamp-1">
                  «{itemName}»
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 text-sm text-muted-foreground leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-full px-5 font-bold"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full px-5 font-bold gap-2"
          >
            {loading ? (
              <>
                <RefreshIcon className="h-4 w-4 animate-spin" />
                <span>جاري الحذف...</span>
              </>
            ) : (
              <>
                <TrashBinTrashIcon className="h-4 w-4" />
                <span>{confirmText}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
    </Dialog>
  )
}
