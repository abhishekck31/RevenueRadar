import type { AuditEntryRow } from './api'

export function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffSec = Math.max(0, Math.round(diffMs / 1000))

  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`

  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDay = Math.round(diffHr / 24)
  return `${diffDay}d ago`
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function formatDateTime(isoDate: string): string {
  return `${formatDate(isoDate)} · ${formatTime(isoDate)}`
}

export function maskEmail(email?: string | null): string {
  if (!email) return '—'
  const [user, domain] = email.split('@')
  if (!domain) return email
  const visible = user.slice(0, Math.min(4, user.length))
  return `${visible}***@${domain}`
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return '—'
  return `${phone.slice(0, phone.length - 4).replace(/./g, '•')}${phone.slice(-4)}`
}

export const LEAKAGE_TYPE_LABEL: Record<string, string> = {
  PAYMENT_FAILED: 'Payment Failed',
  CHECKOUT_ABANDONED: 'Checkout Abandoned',
  INVOICE_OVERDUE: 'Invoice Overdue'
}

export const AGENT_LABEL: Record<string, string> = {
  PaymentRetryAgent: 'Payment Retry',
  CheckoutNudgeAgent: 'Checkout Nudge',
  InvoiceCollectorAgent: 'Invoice Collector'
}

export const AGENT_SHORT: Record<string, string> = {
  PaymentRetryAgent: 'PaymentRetry',
  CheckoutNudgeAgent: 'Nudge',
  InvoiceCollectorAgent: 'Invoice'
}

// Matches the orchestrator's own priority bands (CLAUDE.md scoring formula).
export function triageScoreTone(score?: number): string {
  if (score === undefined || score === null) return 'text-rzp-text-muted'
  if (score > 5000) return 'text-rzp-danger'
  if (score >= 1000) return 'text-rzp-warning'
  return 'text-rzp-success'
}

export function successRateTone(rate: number): string {
  if (rate > 0.7) return 'text-rzp-success'
  if (rate >= 0.5) return 'text-rzp-warning'
  return 'text-rzp-danger'
}

// Audit entries arrive sorted newest-first, so the first entry seen per eventId is the latest.
export function buildLatestAuditMap(entries: AuditEntryRow[]): Map<string, AuditEntryRow> {
  const map = new Map<string, AuditEntryRow>()
  for (const entry of entries) {
    if (!map.has(entry.eventId)) {
      map.set(entry.eventId, entry)
    }
  }
  return map
}
