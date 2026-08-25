import type { AgentType } from '@revenue-radar/shared'
import { prisma } from './prisma'

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
