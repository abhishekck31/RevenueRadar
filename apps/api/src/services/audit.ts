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

export async function getAuditEntries(params: {
  page: number
  limit: number
  agentType?: string
  outcome?: string
}): Promise<{ entries: AuditEntry[]; total: number }> {
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

  const entries: AuditEntry[] = rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    eventType: row.event.type as LeakageType,
    agentType: row.agentType as AgentType,
    actionTaken: row.actionTaken,
    reasoning: row.reasoning,
    rupeeAtRisk: row.rupeeAtRisk,
    status: row.status as ActionStatus,
    outcome: (row.outcome ?? undefined) as OutcomeType | undefined,
    outcomeDetail: row.outcomeDetail ?? undefined,
    executedAt: row.executedAt,
    completedAt: row.completedAt ?? undefined
  }))

  return { entries, total }
}

export async function getRecoveryMetrics(): Promise<{
  totalAtRisk: number
  totalRecovered: number
  recoveryRate: number
  byAgent: {
    PaymentRetryAgent: { atRisk: number; recovered: number }
    CheckoutNudgeAgent: { atRisk: number; recovered: number }
    InvoiceCollectorAgent: { atRisk: number; recovered: number }
  }
  recentEvents: number
}> {
  const entries = await prisma.auditEntry.findMany()

  const byAgent = {
    PaymentRetryAgent: { atRisk: 0, recovered: 0 },
    CheckoutNudgeAgent: { atRisk: 0, recovered: 0 },
    InvoiceCollectorAgent: { atRisk: 0, recovered: 0 }
  }

  let totalAtRisk = 0
  let totalRecovered = 0

  for (const entry of entries) {
    totalAtRisk += entry.rupeeAtRisk

    const agentBucket = byAgent[entry.agentType as keyof typeof byAgent] as
      | { atRisk: number; recovered: number }
      | undefined

    if (agentBucket) {
      agentBucket.atRisk += entry.rupeeAtRisk

      if (entry.outcome === 'RECOVERED') {
        agentBucket.recovered += entry.rupeeAtRisk
      }
    }

    if (entry.outcome === 'RECOVERED') {
      totalRecovered += entry.rupeeAtRisk
    }
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentEvents = await prisma.leakageEvent.count({
    where: { detectedAt: { gte: oneDayAgo } }
  })

  return {
    totalAtRisk,
    totalRecovered,
    recoveryRate: totalAtRisk > 0 ? totalRecovered / totalAtRisk : 0,
    byAgent,
    recentEvents
  }
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
