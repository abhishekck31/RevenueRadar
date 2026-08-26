import clsx from 'clsx'

export type PillTone = 'success' | 'warning' | 'danger' | 'pending' | 'blue' | 'neutral'

const TONE_CLASS: Record<PillTone, string> = {
  success: 'pill-success',
  warning: 'pill-warning',
  danger: 'pill-danger',
  pending: 'pill-pending',
  blue: 'pill-blue',
  neutral: 'pill-neutral'
}

const LEAKAGE_TYPE: Record<string, { tone: PillTone; label: string }> = {
  PAYMENT_FAILED: { tone: 'danger', label: 'Payment Failed' },
  CHECKOUT_ABANDONED: { tone: 'warning', label: 'Checkout' },
  INVOICE_OVERDUE: { tone: 'pending', label: 'Invoice' }
}

const STATUS_TONE: Record<string, PillTone> = {
  RECOVERED: 'success',
  SUCCESS: 'success',
  FAILED: 'danger',
  ESCALATED: 'warning',
  STOPPED: 'neutral',
  PENDING: 'pending',
  EXECUTING: 'pending'
}

export function Pill({
  children,
  tone,
  dot,
  className
}: {
  children: React.ReactNode
  tone: PillTone
  dot?: boolean
  className?: string
}) {
  return (
    <span className={clsx('pill', TONE_CLASS[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function LeakageTypePill({ type }: { type: string }) {
  const meta = LEAKAGE_TYPE[type] ?? { tone: 'neutral' as PillTone, label: type }
  return <Pill tone={meta.tone}>{meta.label}</Pill>
}

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'neutral'
  const isLive = status === 'PENDING' || status === 'EXECUTING'
  return (
    <Pill tone={tone} dot={isLive}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Pill>
  )
}

// Blade confidence bands: >0.8 green, 0.6-0.8 amber, <0.6 red (the escalation threshold).
export function ConfidencePill({ confidence }: { confidence?: number }) {
  if (confidence === undefined || confidence === null) {
    return <span className="text-rzp-text-muted">—</span>
  }

  const tone: PillTone = confidence > 0.8 ? 'success' : confidence >= 0.6 ? 'warning' : 'danger'
  return <Pill tone={tone}>{Math.round(confidence * 100)}%</Pill>
}
