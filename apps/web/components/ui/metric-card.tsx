'use client'

import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CountUp } from '@/components/ui/count-up'

export function MetricCard({
  icon: Icon,
  iconColor,
  iconBg,
  accent,
  label,
  value,
  format,
  mono,
  trend,
  subtext,
  liveDot,
  loading,
  delayClass
}: {
  icon: LucideIcon
  iconColor: string
  iconBg: string
  /** 3px left rule that colour-codes the card at a glance. */
  accent: string
  label: string
  /** Raw number so the card can count up to it; formatting stays the caller's job. */
  value: number
  format: (n: number) => string
  mono?: boolean
  trend?: { direction: 'up' | 'down'; text: string }
  subtext?: string
  liveDot?: boolean
  loading?: boolean
  delayClass?: string
}) {
  return (
    <div
      className={`rzp-card animate-fade-up px-5 py-4 ${delayClass ?? ''}`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rzp-text-muted">{label}</p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
          <Icon size={16} style={{ color: iconColor }} strokeWidth={2.2} />
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className={`mt-2 text-[24px] font-extrabold leading-tight text-rzp-text ${mono ? 'mono' : ''}`}>
          <CountUp value={value} format={format} />
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {trend && (
          <span className={`pill ${trend.direction === 'up' ? 'pill-success' : 'pill-danger'}`}>
            {trend.direction === 'up' ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
            {trend.text}
          </span>
        )}
        {subtext && (
          <span className="flex items-center gap-1.5 text-[12px] text-rzp-text-muted">
            {liveDot && <span className="h-1.5 w-1.5 animate-dot-pulse rounded-full bg-rzp-success" />}
            {subtext}
          </span>
        )}
      </div>
    </div>
  )
}
