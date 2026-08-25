import type { LeakageEvent, OutcomeType, TriageResult } from '@revenue-radar/shared'
import { paymentRetryAgent } from './payment-retry'
import { checkoutNudgeAgent } from './checkout-nudge'
import { invoiceCollectorAgent } from './invoice-collector'
import { logger } from '../lib/logger'

export async function dispatchAgent(event: LeakageEvent, triage: TriageResult): Promise<OutcomeType> {
  logger.info(`Dispatching ${triage.agentType} for event ${event.id}`)

  switch (triage.agentType) {
    case 'PaymentRetryAgent':
      return paymentRetryAgent.execute(event, triage)
    case 'CheckoutNudgeAgent':
      return checkoutNudgeAgent.execute(event, triage)
    case 'InvoiceCollectorAgent':
      return invoiceCollectorAgent.execute(event, triage)
    default:
      logger.error(`Unknown agent type: ${triage.agentType}`)
      return 'FAILED'
  }
}
