'use client'
import { DangerCircleIcon, RefreshIcon } from '@solar-icons/react/outline';


import React, { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { cn } from '@/lib/utils'


declare global {
  interface Window {
    Hls: any;
  }
}

export interface HlsVideoPlayerProps {
  src: string
  poster?: string
  className?: string
  autoPlay?: boolean
  initialTime?: number
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onPlay?: () => void
  onPause?: () => void
  onError?: (error: Error) => void
}

const HlsVideoPlayer: React.FC<HlsVideoPlayerProps> = ({
  src,
  poster,
  className,
  autoPlay = false,
  initialTime,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [scriptLoaded, setScriptLoaded] = useState(
    typeof window !== 'undefined' && Boolean((window as any).Hls)
  )

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Hls) {
      setScriptLoaded(true)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const video = videoRef.current
    if (!video) return

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Reset state
    setHasError(false)
    setIsLoading(true)

    const initPlayer = () => {
      // 1. Native HLS support (Safari)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        video.addEventListener('loadedmetadata', () => {
          if (!isMounted) return
          setIsLoading(false)
          if (initialTime && initialTime > 0) {
            try {
              video.currentTime = initialTime
            } catch {}
          }
          if (autoPlay) {
            video.play().catch(console.error)
          }
        })
        video.addEventListener('error', () => {
          if (!isMounted) return
          setHasError(true)
          setErrorMessage('Failed to load video')
          onError?.(new Error('Native HLS playback error'))
        })
      }
      // 2. HLS.js support via CDN (Chrome, Firefox, Edge, etc)
      else if (scriptLoaded && typeof window !== 'undefined' && window.Hls && window.Hls.isSupported()) {
        const Hls = window.Hls
        const hls = new Hls({
          // Force worker disabled to avoid Next.js HMR window crashes
          workerPath: '',
          enableWorker: false,
        })
        hlsRef.current = hls

        hls.loadSource(src)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isMounted) return
          setIsLoading(false)
          if (initialTime && initialTime > 0) {
            try {
              video.currentTime = initialTime
            } catch {}
          }
          if (autoPlay) {
            video.play().catch(console.error)
          }
        })

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          if (!isMounted) return
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError()
                break
              default:
                hls.destroy()
                setHasError(true)
                setErrorMessage(data.details)
                onError?.(new Error(data.details))
                break
            }
          }
        })
      } else if (scriptLoaded) {
        setHasError(true)
        setErrorMessage('Your browser does not support HLS video playback')
      }
    }

    initPlayer()

    return () => {
      isMounted = false
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, autoPlay, onError, scriptLoaded])

  return (
    <div className={cn('relative w-full overflow-hidden rounded-3xl bg-black', className)}>
      <Script
        src="https://cdn.jsdelivr.net/npm/hls.js@1.3.5/dist/hls.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onReady={() => setScriptLoaded(true)}
      />
      {/* Loading Overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-sm">
          <RefreshIcon className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading video…</p>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
            <DangerCircleIcon className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Playback Error</p>
            <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        crossOrigin="anonymous"
        className="aspect-video w-full"
        onCanPlay={() => setIsLoading(false)}
        onTimeUpdate={(e) => {
          onTimeUpdate?.(e.currentTarget.currentTime, e.currentTarget.duration)
        }}
        onEnded={() => onEnded?.()}
        onPlay={() => onPlay?.()}
        onPause={() => onPause?.()}
      />
    </div>
  )
}

export default HlsVideoPlayer
