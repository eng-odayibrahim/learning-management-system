'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RefObject } from 'react'

// Register plugins once at module level
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export interface FadeUpOptions {
  /** Y offset to start from (px). Default: 40 */
  yFrom?: number
  /** Duration of the tween (seconds). Default: 0.9 */
  duration?: number
  /** Easing. Default: 'power3.out' */
  ease?: string
  /** ScrollTrigger start. Default: 'top 88%' */
  start?: string
  /** Delay before animation starts (seconds). Default: 0 */
  delay?: number
}

export interface StaggerOptions extends FadeUpOptions {
  /** Stagger interval between children (seconds). Default: 0.1 */
  stagger?: number
  /** CSS selector for children inside container. Default: ':scope > *' */
  childSelector?: string
}

/**
 * Animates a single element: fades in and slides up when it enters the viewport.
 * Must be called inside a component that wraps with a container ref.
 */
export function useFadeUpReveal(
  ref: RefObject<HTMLElement | null>,
  options: FadeUpOptions = {}
) {
  const {
    yFrom = 40,
    duration = 0.9,
    ease = 'power3.out',
    start = 'top 88%',
    delay = 0,
  } = options

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      gsap.from(el, {
        opacity: 0,
        y: yFrom,
        duration,
        ease,
        delay,
        scrollTrigger: {
          trigger: el,
          start,
          once: true,
        },
      })
    },
    { scope: ref, dependencies: [] }
  )
}

/**
 * Animates children of a container element with a stagger effect on scroll.
 * Each child fades in and slides up sequentially.
 */
export function useStaggerReveal(
  containerRef: RefObject<HTMLElement | null>,
  options: StaggerOptions = {}
) {
  const {
    yFrom = 32,
    duration = 0.8,
    ease = 'power3.out',
    start = 'top 85%',
    stagger = 0.1,
    childSelector = ':scope > *',
    delay = 0,
  } = options

  useGSAP(
    () => {
      const container = containerRef.current
      if (!container) return

      const children = container.querySelectorAll(childSelector)
      if (!children.length) return

      gsap.from(children, {
        opacity: 0,
        y: yFrom,
        duration,
        ease,
        delay,
        stagger,
        scrollTrigger: {
          trigger: container,
          start,
          once: true,
        },
      })
    },
    { scope: containerRef, dependencies: [] }
  )
}

/**
 * Runs a GSAP timeline on mount (no scroll trigger).
 * Useful for hero entrance animations.
 */
export function useHeroEntrance(
  scopeRef: RefObject<HTMLElement | null>,
  builder: (tl: gsap.core.Timeline) => void,
  deps: unknown[] = []
) {
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      builder(tl)
    },
    { scope: scopeRef, dependencies: deps }
  )
}
