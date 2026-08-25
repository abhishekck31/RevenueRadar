export const STOPPING_RULES = {
  PAYMENT_RETRY: { maxRetries: 3, cooldownMinutes: 30 },
  CHECKOUT_NUDGE: { maxNudges: 2, cooldownHours: 2 },
  INVOICE_FOLLOWUP: { maxFollowups: 5, escalateAfter: 3 },
  MIN_CONFIDENCE: 0.6
} as const

export const QUEUE_NAMES = {
  LEAKAGE_EVENTS: 'leakage-events',
  AGENT_ACTIONS: 'agent-actions',
  NOTIFICATIONS: 'notifications',
  AUDIT: 'audit'
} as const
