const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export type LeakageType = 'PAYMENT_FAILED' | 'CHECKOUT_ABANDONED' | 'INVOICE_OVERDUE'
export type AgentType = 'PaymentRetryAgent' | 'CheckoutNudgeAgent' | 'InvoiceCollectorAgent'
export type ActionStatus = 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'ESCALATED'
export type OutcomeType = 'RECOVERED' | 'FAILED' | 'ESCALATED' | 'STOPPED'

export interface LeakageEventRow {
  id: string
  type: LeakageType
  merchantId: string
  rupeeAmount: number
  customerId?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  metadata: Record<string, unknown>
  rawPayload: Record<string, unknown>
  detectedAt: string
}

export interface AuditEntryRow {
  id: string
  eventId: string
  eventType: LeakageType
  agentType: AgentType
  actionTaken: string
  reasoning: string
  rupeeAtRisk: number
  confidence?: number
  triageScore?: number
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  status: ActionStatus
  outcome?: OutcomeType
  outcomeDetail?: string
  executedAt: string
  completedAt?: string
  event: {
    id: string
    merchantId: string
    customerEmail?: string
    customerPhone?: string
    metadata: Record<string, unknown>
    detectedAt: string
  }
}

export interface AgentStats {
  dispatched: number
  recovered: number
  successRate: number
}

export interface Metrics {
  totalAtRisk: number
  totalRecovered: number
  recoveryRate: number
  totalEvents: number
  pendingActions: number
  totalDecisions: number
  avgConfidence: number
  escalations: number
  byAgent: Record<AgentType, AgentStats>
  recentEvents: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...init })

  if (!res.ok) {
    throw new Error(`API request failed (${res.status}): ${path}`)
  }

  return res.json() as Promise<T>
}

export interface TrendPoint {
  date: string
  totalAtRisk: number
  totalRecovered: number
  recoveryRate: number
}

export function getMetrics(): Promise<Metrics> {
  return request<Metrics>('/api/metrics')
}

export function getRecoveryTrend(days = 14): Promise<{ trend: TrendPoint[] }> {
  return request<{ trend: TrendPoint[] }>(`/api/metrics/trend?days=${days}`)
}

export function getEvents(limit = 8): Promise<{ events: LeakageEventRow[] }> {
  return request<{ events: LeakageEventRow[] }>(`/api/events?limit=${limit}`)
}

export function getAuditEntries(params: {
  page?: number
  limit?: number
  agentType?: string
  outcome?: string
} = {}): Promise<{ entries: AuditEntryRow[]; total: number }> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.agentType) qs.set('agentType', params.agentType)
  if (params.outcome) qs.set('outcome', params.outcome)

  return request<{ entries: AuditEntryRow[]; total: number }>(`/api/audit?${qs.toString()}`)
}

export function simulateEvent(type: string, data: Record<string, unknown>): Promise<{ eventId: string; message: string }> {
  return request<{ eventId: string; message: string }>('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data })
  })
}
