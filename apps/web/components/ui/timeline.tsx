import { formatDateTime } from '@/lib/format'

export interface TimelineStep {
  label: string
  at?: string
  tone?: 'blue' | 'success' | 'danger' | 'warning' | 'muted'
}

const DOT_COLOR: Record<NonNullable<TimelineStep['tone']>, string> = {
  blue: 'bg-rzp-blue',
  success: 'bg-rzp-success',
  danger: 'bg-rzp-danger',
  warning: 'bg-rzp-warning',
  muted: 'bg-rzp-border-strong'
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative space-y-4 pl-1">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[step.tone ?? 'muted']}`} />
            {i < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-rzp-border" />}
          </div>
          <div className="flex-1 pb-1">
            <p className="text-[13px] font-semibold text-rzp-text">{step.label}</p>
            <p className="mono text-[11px] text-rzp-text-muted">{step.at ? formatDateTime(step.at) : 'pending'}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
