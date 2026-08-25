import type { AuditEntry } from '@revenue-radar/shared'
import { logger } from '../lib/logger'

export async function recordAuditEntry(entry: Omit<AuditEntry, 'id'>): Promise<AuditEntry> {
  // Stub: persist via Prisma in a later task. Audit records are immutable — insert only.
  logger.info(`[audit:stub] ${entry.agentType} -> ${entry.actionTaken} (${entry.status})`)

  return {
    id: `stub_${Date.now()}`,
    ...entry
  }
}
