'use client'

import { useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION_MS = 1200

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Animates from whatever was last displayed to `target`. First mount counts up
 * from 0; later updates (the overview refetches every 5s) tween from the value
 * already on screen rather than snapping back to zero.
 */
export function useCountUp(target: number, durationMs = DEFAULT_DURATION_MS): number {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const frameRef = useRef<number>()

  useEffect(() => {
    if (prefersReducedMotion()) {
      fromRef.current = target
      setDisplay(target)
      return
    }

    const from = fromRef.current
    const delta = target - from

    if (delta === 0) return

    const startedAt = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs)
      const value = from + delta * easeOutCubic(progress)

      setDisplay(value)
      fromRef.current = value

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        setDisplay(target)
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs])

  return display
}

export function CountUp({
  value,
  format,
  className
}: {
  value: number
  format: (n: number) => string
  className?: string
}) {
  const display = useCountUp(value)
  return <span className={className}>{format(display)}</span>
}
