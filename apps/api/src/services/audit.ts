import type { ActionStatus, AgentType, AuditEntry, LeakageType, LeakageEvent, OutcomeType, TriageResult } from '@revenue-radar/shared'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

export async function createTriageAudit(
  event: LeakageEvent,
  triage: TriageResult,
  status: ActionStatus
): Promise<string> {
  const entry = await prisma.auditEntry.create({
    data: {
      eventId: event.id,
      agentType: triage.agentType,
      actionTaken: triage.action,
      reasoning: triage.reasoning,
      rupeeAtRisk: triage.rupeeAtRisk,
      confidence: triage.confidence,
      triageScore: triage.score,
      priority: triage.priority,
      status,
      executedAt: new Date()
    }
  })

  logger.info(`[audit] ${triage.agentType} -> ${triage.action} (${status})`)

  return entry.id
}

// The original triage decision (agentType/actionTaken/reasoning) is written once and
// never touched again — this only fills in the completion fields once an agent finishes.
export async function updateAuditOutcome(
  auditId: string,
  outcome: OutcomeType,
  outcomeDetail: string,
  completedAt: Date
): Promise<void> {
  await prisma.auditEntry.update({
    where: { id: auditId },
    data: { outcome, outcomeDetail, completedAt }
  })

  logger.info(`[audit] ${auditId} outcome recorded: ${outcome}`)
}

export interface AuditEntryWithEvent extends AuditEntry {
  event: {
    id: string
    merchantId: string
    customerEmail?: string
    customerPhone?: string
    metadata: Record<string, unknown>
    detectedAt: Date
  }
}

export async function getAuditEntries(params: {
  page: number
  limit: number
  agentType?: string
  outcome?: string
}): Promise<{ entries: AuditEntryWithEvent[]; total: number }> {
  const where = {
    ...(params.agentType ? { agentType: params.agentType } : {}),
    ...(params.outcome ? { outcome: params.outcome } : {})
  }

  const [rows, total] = await Promise.all([
    prisma.auditEntry.findMany({
      where,
      include: { event: true },
      orderBy: { executedAt: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit
    }),
    prisma.auditEntry.count({ where })
  ])

  const entries: AuditEntryWithEvent[] = rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    eventType: row.event.type as LeakageType,
    agentType: row.agentType as AgentType,
    actionTaken: row.actionTaken,
    reasoning: row.reasoning,
    rupeeAtRisk: row.rupeeAtRisk,
    confidence: row.confidence ?? undefined,
    triageScore: row.triageScore ?? undefined,
    priority: (row.priority ?? undefined) as 'HIGH' | 'MEDIUM' | 'LOW' | undefined,
    status: row.status as ActionStatus,
    outcome: (row.outcome ?? undefined) as OutcomeType | undefined,
    outcomeDetail: row.outcomeDetail ?? undefined,
    executedAt: row.executedAt,
    completedAt: row.completedAt ?? undefined,
    event: {
      id: row.event.id,
      merchantId: row.event.merchantId,
      customerEmail: row.event.customerEmail ?? undefined,
      customerPhone: row.event.customerPhone ?? undefined,
      metadata: row.event.metadata as Record<string, unknown>,
      detectedAt: row.event.detectedAt
    }
  }))

  return { entries, total }
}

export async function getRecoveryMetrics(): Promise<{
  totalAtRisk: number
  totalRecovered: number
  recoveryRate: number
  totalEvents: number
  pendingActions: number
  totalDecisions: number
  avgConfidence: number
  escalations: number
  byAgent: {
    PaymentRetryAgent: { dispatched: number; recovered: number; successRate: number }
    CheckoutNudgeAgent: { dispatched: number; recovered: number; successRate: number }
    InvoiceCollectorAgent: { dispatched: number; recovered: number; successRate: number }
  }
  recentEvents: number
}> {
  const entries = await prisma.auditEntry.findMany()

  const byAgent = {
    PaymentRetryAgent: { dispatched: 0, recovered: 0, successRate: 0 },
    CheckoutNudgeAgent: { dispatched: 0, recovered: 0, successRate: 0 },
    InvoiceCollectorAgent: { dispatched: 0, recovered: 0, successRate: 0 }
  }

  let totalAtRisk = 0
  let totalRecovered = 0
  let pendingActions = 0
  let escalations = 0
  let confidenceSum = 0
  let confidenceCount = 0

  for (const entry of entries) {
    totalAtRisk += entry.rupeeAtRisk

    if (entry.confidence !== null && entry.confidence !== undefined) {
      confidenceSum += entry.confidence
      confidenceCount += 1
    }

    if (entry.status === 'ESCALATED' || entry.outcome === 'ESCALATED') {
      escalations += 1
    }

    const agentBucket = byAgent[entry.agentType as keyof typeof byAgent] as
      | { dispatched: number; recovered: number; successRate: number }
      | undefined

    if (agentBucket) {
      agentBucket.dispatched += 1

      if (entry.outcome === 'RECOVERED') {
        agentBucket.recovered += 1
      }
    }

    if (entry.outcome === 'RECOVERED') {
      totalRecovered += entry.rupeeAtRisk
    }

    if (entry.status === 'PENDING' || entry.status === 'EXECUTING') {
      pendingActions += 1
    }
  }

  for (const bucket of Object.values(byAgent)) {
    bucket.successRate = bucket.dispatched > 0 ? bucket.recovered / bucket.dispatched : 0
  }

  const [totalEvents, recentEvents] = await Promise.all([
    prisma.leakageEvent.count(),
    prisma.leakageEvent.count({ where: { detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
  ])

  return {
    totalAtRisk,
    totalRecovered,
    recoveryRate: totalAtRisk > 0 ? totalRecovered / totalAtRisk : 0,
    totalEvents,
    pendingActions,
    totalDecisions: entries.length,
    avgConfidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
    escalations,
    byAgent,
    recentEvents
  }
}

export async function getRecoveryTrend(days = 14): Promise<
  Array<{ date: string; totalAtRisk: number; totalRecovered: number; recoveryRate: number }>
> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = await prisma.recoveryMetric.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'asc' }
  })

  return rows.map((row) => ({
    date: row.date.toISOString(),
    totalAtRisk: row.totalAtRisk,
    totalRecovered: row.totalRecovered,
    recoveryRate: row.recoveryRate
  }))
}

// Rolls the outcome of one agent action into today's RecoveryMetric row —
// a same-day upsert, since `date` has no unique constraint to key a real upsert on.
export async function recordDailyMetric(agentType: AgentType, rupeeAmount: number, outcome: OutcomeType): Promise<void> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const recovered = outcome === 'RECOVERED' ? rupeeAmount : 0

  const existing = await prisma.recoveryMetric.findFirst({
    where: { date: { gte: startOfDay, lt: startOfNextDay } }
  })

  if (existing) {
    const totalAtRisk = existing.totalAtRisk + rupeeAmount
    const totalRecovered = existing.totalRecovered + recovered

    await prisma.recoveryMetric.update({
      where: { id: existing.id },
      data: {
        totalAtRisk,
        totalRecovered,
        paymentRetried: existing.paymentRetried + (agentType === 'PaymentRetryAgent' ? 1 : 0),
        nudgesSent: existing.nudgesSent + (agentType === 'CheckoutNudgeAgent' ? 1 : 0),
        invoicesFollowedUp: existing.invoicesFollowedUp + (agentType === 'InvoiceCollectorAgent' ? 1 : 0),
        recoveryRate: totalAtRisk > 0 ? totalRecovered / totalAtRisk : 0
      }
    })
    return
  }

  await prisma.recoveryMetric.create({
    data: {
      date: now,
      totalAtRisk: rupeeAmount,
      totalRecovered: recovered,
      paymentRetried: agentType === 'PaymentRetryAgent' ? 1 : 0,
      nudgesSent: agentType === 'CheckoutNudgeAgent' ? 1 : 0,
      invoicesFollowedUp: agentType === 'InvoiceCollectorAgent' ? 1 : 0,
      recoveryRate: rupeeAmount > 0 ? recovered / rupeeAmount : 0
    }
  })
}
