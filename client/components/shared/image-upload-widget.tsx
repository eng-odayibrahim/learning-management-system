'use client'
import { CloseCircleIcon, GalleryIcon, RefreshIcon, StarIcon } from '@solar-icons/react/outline';


import React, { useState, useRef } from 'react'
import { api } from '@/lib/api'
import { Label } from '@/components/ui/label'


export function ImageUploadWidget({
  label,
  folder,
  value,
  onChange,
  compact = false
}: {
  label: string
  folder: string
  value: string
  onChange: (url: string) => void
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const url = await api.uploadImage(file, folder)
      onChange(url)
    } catch (err: any) {
      setError(err.message || 'فشل رفع الصورة')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="font-bold text-xs text-foreground">{label}</Label>
      {value ? (
        <div className={`relative rounded-xl overflow-hidden border border-border bg-muted/50 flex items-center justify-center group ${compact ? 'h-24' : 'aspect-video'}`}>
          {(value.startsWith('http') || value.startsWith('/')) ? (
            <img src={value} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <GalleryIcon className="h-8 w-8 text-muted-foreground opacity-50" />
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <CloseCircleIcon className="h-3 w-3 text-destructive" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/50 hover:bg-muted transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground ${compact ? 'py-4' : 'p-6'}`}
        >
          {uploading ? (
            <RefreshIcon className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <GalleryIcon className="h-6 w-6" />
          )}
          <span className="text-xs font-bold text-foreground">{uploading ? 'جاري الرفع...' : 'اضغط لرفع صورة'}</span>
          {!compact && <span className="text-[10px] text-muted-foreground">JPEG · PNG · WebP · حد 10 MB</span>}
        </div>
      )}
      {error && <p className="text-xs text-destructive font-bold">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
