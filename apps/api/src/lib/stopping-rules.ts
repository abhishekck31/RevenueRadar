import type { AgentType, LeakageEvent, OutcomeType } from '@revenue-radar/shared'
import { prisma } from './prisma'
import { logger } from './logger'

export async function countAgentAttempts(eventId: string, agentType: AgentType): Promise<number> {
  return prisma.auditEntry.count({ where: { eventId, agentType } })
}

export async function getLastAttemptAt(eventId: string, agentType: AgentType): Promise<Date | null> {
  const last = await prisma.auditEntry.findFirst({
    where: { eventId, agentType },
    orderBy: { executedAt: 'desc' }
  })

  return last?.executedAt ?? null
}

/**
 * Preconditions every agent must satisfy before it touches an external API.
 *
 * Returns a STOPPED/FAILED outcome when the run must not proceed, or null when
 * it may. Centralised so a new agent can't quietly ship without these — the
 * checks previously lived inline and were inconsistent between agents.
 */
export interface AgentGateOptions {
  /** Hard cap on attempts for this agent, from STOPPING_RULES. */
  maxAttempts: number
  /** Minimum gap between attempts, in ms. Omit when the agent has no cooldown. */
  cooldownMs?: number
}

export async function checkAgentPreconditions(
  event: LeakageEvent,
  agentType: AgentType,
  options: AgentGateOptions
): Promise<OutcomeType | null> {
  // An event missing identity or carrying a non-positive amount is malformed;
  // acting on it could mean charging or messaging the wrong party.
  if (!event.id || !event.merchantId || !Number.isFinite(event.rupeeAmount) || event.rupeeAmount <= 0) {
    logger.error(`[${agentType}] rejecting malformed event`, { eventId: event.id || '(missing)' })
    return 'FAILED'
  }

  // Counted from the audit table rather than memory: in-process counters reset
  // on restart, which would silently reopen the retry budget.
  const attempts = await countAgentAttempts(event.id, agentType)

  if (attempts >= options.maxAttempts) {
    logger.warn(`[${agentType}] stopping rule hit`, { eventId: event.id, attempts, maxAttempts: options.maxAttempts })
    return 'STOPPED'
  }

  if (options.cooldownMs !== undefined) {
    const lastAttemptAt = await getLastAttemptAt(event.id, agentType)

    if (lastAttemptAt && Date.now() - lastAttemptAt.getTime() < options.cooldownMs) {
      logger.info(`[${agentType}] cooldown active`, { eventId: event.id })
      return 'STOPPED'
    }
  }

  return null
}
