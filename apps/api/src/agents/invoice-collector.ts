import type { LeakageEvent, OutcomeType, TriageResult } from '@revenue-radar/shared'
import { STOPPING_RULES } from '@revenue-radar/shared'
import { createPaymentLink } from '../services/razorpay'
import { sendEmail, sendWhatsApp, generateRecoveryEmail, generateWhatsAppMessage } from '../services/notification'
import { createTriageAudit, updateAuditOutcome } from '../services/audit'
import { countAgentAttempts } from '../lib/stopping-rules'
import { logger } from '../lib/logger'

export class InvoiceCollectorAgent {
  async execute(event: LeakageEvent, triage: TriageResult): Promise<OutcomeType> {
    const followUpCount = await this.getFollowUpCount(event.id)

    if (followUpCount >= STOPPING_RULES.INVOICE_FOLLOWUP.maxFollowups) {
      logger.info(`Max follow-ups reached for invoice ${event.id}`)
      return 'STOPPED'
    }

    const forcedEscalation = followUpCount >= STOPPING_RULES.INVOICE_FOLLOWUP.escalateAfter
    const action = forcedEscalation ? 'ESCALATE_HUMAN' : triage.action

    const auditId = await createTriageAudit(event, triage, 'EXECUTING')

    const invoiceNumber = typeof event.metadata.invoiceNumber === 'string' ? event.metadata.invoiceNumber : undefined
    const dueDate = typeof event.metadata.dueDate === 'string' ? event.metadata.dueDate : undefined

    try {
      switch (action) {
        case 'SEND_REMINDER':
        case 'SEND_ESCALATION': {
          const link = await createPaymentLink({
            amount: event.rupeeAmount,
            currency: 'INR',
            customerId: event.customerId ?? event.id,
            description: `Invoice ${invoiceNumber ?? event.id} — follow-up #${followUpCount + 1}`,
            customerEmail: event.customerEmail,
            customerPhone: event.customerPhone
          })

          const email = await generateRecoveryEmail({
            type: 'invoice_overdue',
            rupeeAmount: event.rupeeAmount,
            merchantName: event.merchantId,
            paymentLink: link.short_url,
            invoiceNumber,
            dueDate
          })

          if (event.customerEmail) {
            await sendEmail({ to: event.customerEmail, subject: email.subject, html: email.html, text: email.text })
          }

          if (event.customerPhone) {
            const message = await generateWhatsAppMessage({
              type: 'invoice_overdue',
              rupeeAmount: event.rupeeAmount,
              paymentLink: link.short_url
            })
            await sendWhatsApp({ to: event.customerPhone, message })
          }
          break
        }

        case 'PROMISE_TO_PAY': {
          const email = await generateRecoveryEmail({
            type: 'invoice_overdue',
            rupeeAmount: event.rupeeAmount,
            merchantName: event.merchantId,
            invoiceNumber,
            dueDate
          })

          if (event.customerEmail) {
            await sendEmail({ to: event.customerEmail, subject: email.subject, html: email.html, text: email.text })
          }
          break
        }

        case 'ESCALATE_HUMAN': {
          logger.info(`Escalating invoice ${event.id} to human review after ${followUpCount} follow-ups: ${triage.reasoning}`)
          await updateAuditOutcome(auditId, 'ESCALATED', `Escalated after ${followUpCount} follow-ups`, new Date())
          return 'ESCALATED'
        }

        default: {
          logger.warn(`Unknown action: ${action}`)
          await updateAuditOutcome(auditId, 'FAILED', `Unknown action: ${action}`, new Date())
          return 'FAILED'
        }
      }

      await updateAuditOutcome(auditId, 'RECOVERED', `Follow-up ${followUpCount + 1} sent (${action})`, new Date())
      return 'RECOVERED'
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)))
      await updateAuditOutcome(auditId, 'FAILED', error instanceof Error ? error.message : String(error), new Date())
      return 'FAILED'
    }
  }

  private async getFollowUpCount(eventId: string): Promise<number> {
    return countAgentAttempts(eventId, 'InvoiceCollectorAgent')
  }
}

export const invoiceCollectorAgent = new InvoiceCollectorAgent()
