'use client'

import { successRateTone } from '@/lib/format'

export function AgentHealthCard({
  name,
  initial,
  color,
  successRate,
  lastAction,
  dispatched,
  recovered,
  active
}: {
  name: string
  initial: string
  color: string
  successRate: number
  lastAction?: string
  dispatched: number
  recovered: number
  active: boolean
}) {
  const pct = Math.round(successRate * 100)

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-rzp-text">{name}</p>
          <p className="truncate text-[12px] text-rzp-text-muted">{lastAction ?? 'Awaiting dispatch'}</p>
        </div>

        <span className={`text-[13px] font-bold ${successRateTone(successRate)}`}>{pct}%</span>
      </div>

      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-sm bg-rzp-border">
        {/* --target-width drives the shared progress-fill keyframe; the key
            restarts the animation whenever the rate actually changes. */}
        <div
          key={pct}
          className="animate-progress-fill h-full rounded-sm"
          style={{ ['--target-width' as string]: `${pct}%`, width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-[11px] text-rzp-text-muted">
          {dispatched} dispatched · {recovered} recovered
        </p>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-rzp-text-muted">
          <span
            className={`h-1.5 w-1.5 rounded-full ${active ? 'animate-dot-pulse bg-rzp-success' : 'bg-rzp-warning'}`}
          />
          {active ? 'Active' : 'Idle'}
        </span>
      </div>
    </div>
  )
}
