export type LeakageType = 'PAYMENT_FAILED' | 'CHECKOUT_ABANDONED' | 'INVOICE_OVERDUE'
export type AgentType = 'PaymentRetryAgent' | 'CheckoutNudgeAgent' | 'InvoiceCollectorAgent'
export type ActionStatus = 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'ESCALATED'
export type OutcomeType = 'RECOVERED' | 'FAILED' | 'ESCALATED' | 'STOPPED'

export interface LeakageEvent {
  id: string
  type: LeakageType
  merchantId: string
  rupeeAmount: number
  customerId?: string
  customerEmail?: string
  customerPhone?: string
  metadata: Record<string, unknown>
  detectedAt: Date
  rawWebhookPayload: Record<string, unknown>
}

export interface TriageResult {
  eventId: string
  agentType: AgentType
  action: string
  confidence: number
  reasoning: string
  rupeeAtRisk: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  recoveryProbability: number
  score: number
  suggestedRetryAt?: string
}

export interface AuditEntry {
  id: string
  eventId: string
  eventType: LeakageType
  agentType: AgentType
  actionTaken: string
  reasoning: string
  rupeeAtRisk: number
  status: ActionStatus
  outcome?: OutcomeType
  outcomeDetail?: string
  executedAt: Date
  completedAt?: Date
}
