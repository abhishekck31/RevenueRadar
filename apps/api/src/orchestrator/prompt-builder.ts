import type { LeakageEvent, LeakageType } from '@revenue-radar/shared'

const EVENT_TYPE_LABELS: Record<LeakageType, string> = {
  PAYMENT_FAILED: 'Failed Payment',
  CHECKOUT_ABANDONED: 'Abandoned Checkout',
  INVOICE_OVERDUE: 'Overdue Invoice'
}

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

function formatTimeSince(detectedAt: Date): string {
  const totalMinutes = Math.max(0, Math.floor((Date.now() - detectedAt.getTime()) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'} ago`
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

export function buildTriagePrompt(event: LeakageEvent): string {
  const metadataEntries = Object.entries(event.metadata).filter(([, value]) => value !== undefined && value !== null)

  const metadataLines = metadataEntries.length
    ? metadataEntries.map(([key, value]) => `- ${humanizeKey(key)}: ${value}`).join('\n')
    : '(none)'

  const attempts = event.metadata.attempts
  const attemptsLine = typeof attempts === 'number' ? `Previous Attempts: ${attempts}\n` : ''

  return `
Triage this revenue leakage event:

Event Type: ${EVENT_TYPE_LABELS[event.type]} (${event.type})
Amount at Risk: ${formatRupees(event.rupeeAmount)}
Detected: ${formatTimeSince(event.detectedAt)} (${event.detectedAt.toISOString()})
Customer Email: ${event.customerEmail ?? 'not available'} (available: ${event.customerEmail ? 'yes' : 'no'})
Customer Phone: ${event.customerPhone ?? 'not available'} (available: ${event.customerPhone ? 'yes' : 'no'})
${attemptsLine}Metadata:
${metadataLines}

Decide the optimal recovery action.
`.trim()
}
