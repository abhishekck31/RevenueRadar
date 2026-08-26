import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Skeleton } from './skeleton'

export function MetricCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  mono,
  trend,
  subtext,
  liveDot,
  loading
}: {
  icon: LucideIcon
  iconColor: string
  iconBg: string
  label: string
  value: string
  mono?: boolean
  trend?: { direction: 'up' | 'down'; text: string }
  subtext?: string
  liveDot?: boolean
  loading?: boolean
}) {
  return (
    <div className="rzp-card px-6 py-5">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-rzp-text-muted">{label}</p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
          <Icon size={16} style={{ color: iconColor }} strokeWidth={2.2} />
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className={`mt-2 text-[28px] font-extrabold leading-tight text-rzp-text ${mono ? 'mono' : ''}`}>{value}</p>
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
