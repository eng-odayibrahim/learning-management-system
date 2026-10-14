'use client'
import { CheckCircleIcon, ClapperboardPlayIcon, ClockCircleIcon, CloseCircleIcon, CloudUploadIcon, DangerCircleIcon, RefreshIcon, ServerIcon, StarIcon, UploadTrackIcon, VideoFrameIcon } from '@solar-icons/react/outline';


/**
 * VideoUploadForm — بوابة رفع ومعالجة الفيديو
 * ─────────────────────────────────────────────────────────────────────────────
 * واجهة رفع فيديو احترافية بالعربي مع تتبع مراحل المعالجة:
 *   idle → uploading → queued → transcoding → uploading_r2 → done | error
 *
 * بعد رفع الملف، يتم إرساله لـ RabbitMQ وتبدأ المعالجة في الخلفية.
 * الكومبوننت يسأل الـ API كل 3 ثواني عشان يحدّث الحالة.
 */

import React, { useCallback, useRef, useState, useEffect, type FC } from 'react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import dynamic from 'next/dynamic'
import type { VideoStageValue } from '@/lib/types'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'


// Lazy-load the player — it imports video.js which must be client-only
const HlsVideoPlayer = dynamic(() => import('@/components/shared/hls-video-player'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />
  ),
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_GB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_GB * 1024 ** 3
const POLL_INTERVAL_MS = 3_000

// ---------------------------------------------------------------------------
// Stage configuration — Arabic labels, colors, icons
// ---------------------------------------------------------------------------

interface StageConfig {
  label: string
  sublabel: string
  icon: React.ReactNode
  color: string
  bgGradient: string
  pulseColor: string
}

const STAGE_MAP: Record<string, StageConfig> = {
  idle: {
    label: 'في انتظار الفيديو',
    sublabel: 'اسحب ملف الفيديو هنا أو اضغط للاختيار',
    icon: <UploadTrackIcon className="h-8 w-8" />,
    color: 'text-muted-foreground',
    bgGradient: 'from-zinc-500/5 to-transparent',
    pulseColor: '',
  },
  uploading: {
    label: 'جاري الرفع والمعالجة…',
    sublabel: 'يرجى الانتظار حتى تكتمل العملية',
    icon: <RefreshIcon className="h-8 w-8 animate-spin" />,
    color: 'text-primary',
    bgGradient: 'from-primary/10 via-primary/5 to-transparent',
    pulseColor: 'bg-primary',
  },
  queued: {
    label: 'جاري الرفع والمعالجة…',
    sublabel: 'يرجى الانتظار حتى تكتمل العملية',
    icon: <RefreshIcon className="h-8 w-8 animate-spin" />,
    color: 'text-primary',
    bgGradient: 'from-primary/10 via-primary/5 to-transparent',
    pulseColor: 'bg-primary',
  },
  transcoding: {
    label: 'جاري الرفع والمعالجة…',
    sublabel: 'يرجى الانتظار حتى تكتمل العملية',
    icon: <RefreshIcon className="h-8 w-8 animate-spin" />,
    color: 'text-primary',
    bgGradient: 'from-primary/10 via-primary/5 to-transparent',
    pulseColor: 'bg-primary',
  },
  uploading_r2: {
    label: 'جاري الرفع والمعالجة…',
    sublabel: 'يرجى الانتظار حتى تكتمل العملية',
    icon: <RefreshIcon className="h-8 w-8 animate-spin" />,
    color: 'text-primary',
    bgGradient: 'from-primary/10 via-primary/5 to-transparent',
    pulseColor: 'bg-primary',
  },
  retrying: {
    label: 'جاري الرفع والمعالجة…',
    sublabel: 'يرجى الانتظار حتى تكتمل العملية',
    icon: <RefreshIcon className="h-8 w-8 animate-spin" />,
    color: 'text-primary',
    bgGradient: 'from-primary/10 via-primary/5 to-transparent',
    pulseColor: 'bg-primary',
  },
  done: {
    label: '✅ الفيديو جاهز للبث!',
    sublabel: 'تم رفع الفيديو ومعالجته بنجاح',
    icon: <CheckCircleIcon className="h-8 w-8" />,
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-500/10 via-green-500/5 to-transparent',
    pulseColor: '',
  },
  failed: {
    label: 'فشلت المعالجة',
    sublabel: 'حدث خطأ أثناء المعالجة',
    icon: <DangerCircleIcon className="h-8 w-8" />,
    color: 'text-red-400',
    bgGradient: 'from-red-500/10 via-rose-500/5 to-transparent',
    pulseColor: '',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface VideoUploadFormProps {
  /** MongoDB Lesson _id — when provided the server will update the lesson with hlsUrl and videoStatus after upload */
  lessonId?: string
  /** Callback fired when upload + transcoding completes successfully */
  onSuccess?: (masterPlaylistUrl: string) => void
}

const VideoUploadForm: FC<VideoUploadFormProps> = ({ lessonId, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [currentStage, setCurrentStage] = useState<VideoStageValue>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pipelineProgress, setPipelineProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [masterPlaylistUrl, setMasterPlaylistUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // -------------------------------------------------------------------------
  // Cleanup polling on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // -------------------------------------------------------------------------
  // File validation
  // -------------------------------------------------------------------------

  const validateFile = (file: File): string | null => {
    if (file.type !== 'video/mp4') return 'يُقبل فقط ملفات MP4'
    if (file.size > MAX_FILE_SIZE_BYTES) return `حجم الملف يجب أن يكون أقل من ${MAX_FILE_SIZE_GB} جيجابايت`
    return null
  }

  // -------------------------------------------------------------------------
  // Status polling
  // -------------------------------------------------------------------------

  const startPolling = useCallback((targetLessonId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getVideoStatus(targetLessonId)

        setCurrentStage(status.videoStage)
        setPipelineProgress(status.videoProgress)
        setRetryCount(status.retryCount)

        if (status.lastVideoError) {
          setErrorMessage(status.lastVideoError)
        }

        // Done — stop polling
        if (status.videoStage === 'done' && status.hlsUrl) {
          if (pollRef.current) clearInterval(pollRef.current)
          setMasterPlaylistUrl(status.hlsUrl)
          onSuccess?.(status.hlsUrl)
        }

        // Permanently failed — stop polling
        if (status.videoStatus === 'failed' && status.videoStage === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch (err) {
        // Silent — keep polling
        console.warn('[VideoUpload] Poll error:', err)
      }
    }, POLL_INTERVAL_MS)
  }, [onSuccess])

  // -------------------------------------------------------------------------
  // Upload handler
  // -------------------------------------------------------------------------

  const uploadFile = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      setCurrentStage('failed')
      return
    }

    setSelectedFile(file)
    setCurrentStage('uploading')
    setUploadProgress(0)
    setPipelineProgress(0)
    setErrorMessage(null)
    setRetryCount(0)

    const videoId = crypto.randomUUID()
    const formData = new FormData()
    formData.append('video', file)
    formData.append('videoId', videoId)
    if (lessonId) formData.append('lessonId', lessonId)

    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr

    // Progress tracking — upload phase
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100)
        setUploadProgress(pct)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Upload accepted — server will process asynchronously
        setCurrentStage('queued')
        setUploadProgress(100)
        setPipelineProgress(5)

        // Start polling for processing status
        if (lessonId) {
          startPolling(lessonId)
        }
      } else {
        let message = 'فشل رفع الملف — حاول مرة أخرى'
        try {
          const errBody = JSON.parse(xhr.responseText)
          if (errBody?.error?.message) message = errBody.error.message
          else if (errBody?.message) message = errBody.message
        } catch (_) { }
        setErrorMessage(message)
        setCurrentStage('failed')
      }
    })

    xhr.addEventListener('error', () => {
      setErrorMessage('خطأ في الاتصال — تحقق من اتصالك بالإنترنت وحاول مرة أخرى')
      setCurrentStage('failed')
    })

    xhr.addEventListener('abort', () => {
      setCurrentStage('idle')
      setSelectedFile(null)
    })

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    xhr.open('POST', `${apiUrl}/api/video/upload`)
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  }, [lessonId, startPolling])

  // -------------------------------------------------------------------------
  // Drag & Drop
  // -------------------------------------------------------------------------

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) uploadFile(file)
    },
    [uploadFile],
  )

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  const reset = () => {
    xhrRef.current?.abort()
    if (pollRef.current) clearInterval(pollRef.current)
    setCurrentStage('idle')
    setSelectedFile(null)
    setMasterPlaylistUrl(null)
    setUploadProgress(0)
    setPipelineProgress(0)
    setErrorMessage(null)
    setRetryCount(0)
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const stageConfig = STAGE_MAP[currentStage] || STAGE_MAP.idle
  const isProcessing = ['queued', 'transcoding', 'uploading_r2', 'retrying'].includes(currentStage)
  const showProgress = ['uploading', 'queued', 'transcoding', 'uploading_r2', 'retrying'].includes(currentStage)

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* ── Main Stage Card ────────────────────────────────────────────── */}
      {currentStage !== 'done' && (
        <div className={cn(
          'relative overflow-hidden rounded-2xl border-2 transition-all duration-500',
          currentStage === 'idle'
            ? isDragging
              ? 'border-emerald-500/60 bg-emerald-500/5'
              : 'border-border/60 hover:border-emerald-500/30 bg-card'
            : currentStage === 'failed'
              ? 'border-red-500/40 bg-card'
              : 'border-border/60 bg-card',
        )}>
          {/* Gradient background per stage */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-60 transition-all duration-700',
            stageConfig.bgGradient,
          )} />

          {/* Pulse dot indicator for active stages */}
          {stageConfig.pulseColor && (
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', stageConfig.pulseColor)} />
                <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', stageConfig.pulseColor)} />
              </span>
            </div>
          )}

          <div className="relative z-10 p-8">
            {/* ── Idle: Drop Zone ─────────────────────────────────────── */}
            {(currentStage === 'idle' || currentStage === 'failed') && (
              <div
                role="button"
                tabIndex={0}
                aria-label="رفع ملف فيديو"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                className="cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center gap-5 py-6">
                  {/* Icon circle */}
                  <div className={cn(
                    'flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300',
                    currentStage === 'failed'
                      ? 'bg-red-500/10 text-red-400'
                      : isDragging
                        ? 'bg-emerald-500/15 text-emerald-400 scale-110'
                        : 'bg-muted text-muted-foreground',
                  )}>
                    {currentStage === 'failed' ? (
                      <DangerCircleIcon className="h-9 w-9" />
                    ) : (
                      <VideoFrameIcon className="h-9 w-9" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="text-center space-y-2">
                    {currentStage === 'failed' && errorMessage ? (
                      <>
                        <p className="text-base font-black text-red-400">
                          فشلت المعالجة
                        </p>
                        <p className="text-xs text-red-400/80 font-semibold max-w-md">
                          {errorMessage}
                        </p>
                        {retryCount > 0 && (
                          <Badge variant="destructive" className="text-[10px] font-bold mt-1">
                            المحاولة {retryCount} من 4
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground font-medium mt-3">
                          اضغط هنا لإعادة رفع الفيديو
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-base font-black text-foreground">
                          {isDragging ? 'أفلت الملف هنا' : 'اسحب ملف الفيديو هنا'}
                        </p>
                        <p className="text-xs text-muted-foreground font-semibold">
                          أو <span className="text-emerald-400 underline underline-offset-2">اضغط للاختيار</span> — MP4 فقط · حتى {MAX_FILE_SIZE_GB} جيجابايت
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-2">
                          <Badge variant="outline" className="text-[10px] font-bold border-border/60">360p</Badge>
                          <Badge variant="outline" className="text-[10px] font-bold border-border/60">480p</Badge>
                          <span className="text-[10px] text-muted-foreground font-bold">جودات يتم توليدها تلقائياً</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadFile(file)
                  }}
                  id="video-file-input"
                />
              </div>
            )}

            {/* ── Active stages: uploading → transcoding → uploading_r2 ── */}
            {showProgress && (
              <div className="space-y-6">
                {/* Stage header */}
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-xl shrink-0 bg-primary/10',
                    stageConfig.color
                  )}>
                    <RefreshIcon className={cn('h-7 w-7 animate-spin', stageConfig.color)} />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className={cn('text-lg font-black ', stageConfig.color)}>
                      {stageConfig.label}
                    </p>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                      {stageConfig.sublabel}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-400"
                    onClick={reset}
                    aria-label="إلغاء"
                  >
                    <CloseCircleIcon className="h-4 w-4" />
                  </Button>
                </div>

                {/* File info */}
                {selectedFile && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/40">
                    <VideoFrameIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs font-bold text-foreground truncate flex-1 text-right">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                      {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="space-y-2">
                  <Progress
                    value={currentStage === 'uploading' ? uploadProgress : pipelineProgress}
                    className="h-3 rounded-full"
                  />
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-muted-foreground">
                      {currentStage === 'uploading'
                        ? `${uploadProgress}% مكتمل`
                        : `${pipelineProgress}% من المعالجة`
                      }
                    </span>
                    {retryCount > 0 && (
                      <Badge variant="secondary" className="text-[9px] font-bold">
                        المحاولة {retryCount + 1}
                      </Badge>
                    )}
                  </div>
                </div>


              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Success: Done + Player ──────────────────────────────────────── */}
      {currentStage === 'done' && masterPlaylistUrl && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-card">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-green-500/5 to-transparent" />
            <div className="relative z-10 p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircleIcon className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-emerald-400">
                    ✅ الفيديو جاهز للبث!
                  </p>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                    تم التحويل والرفع بنجاح — يمكن للطلاب مشاهدة الفيديو الآن
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="font-bold text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 shrink-0"
              >
                رفع فيديو آخر
              </Button>
            </div>
          </div>

          {/* HLS player */}
          <div className="rounded-2xl overflow-hidden border border-border/60 shadow-none">
            <HlsVideoPlayer
              src={masterPlaylistUrl}
              className="w-full"
              autoPlay
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoUploadForm
