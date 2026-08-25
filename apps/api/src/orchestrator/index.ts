import type { LeakageEvent, TriageResult } from '@revenue-radar/shared'
import { logger } from '../lib/logger'

export async function triage(event: LeakageEvent): Promise<TriageResult> {
  // Stub: call the Claude API to score and select an agent in a later task.
  logger.info(`[orchestrator:stub] triaging event ${event.id} (${event.type})`)

  return {
    eventId: event.id,
    agentType: 'PaymentRetryAgent',
    action: 'noop',
    confidence: 0,
    reasoning: 'Orchestrator not yet implemented',
    rupeeAtRisk: event.rupeeAmount,
    priority: 'LOW'
  }
}
