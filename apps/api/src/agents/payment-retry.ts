import type { LeakageEvent, OutcomeType, TriageResult } from '@revenue-radar/shared'
import { STOPPING_RULES } from '@revenue-radar/shared'
import { fetchPayment, createPaymentLink } from '../services/razorpay'
import { sendEmail, sendWhatsApp, generateRecoveryEmail, generateWhatsAppMessage } from '../services/notification'
import { createTriageAudit, updateAuditOutcome } from '../services/audit'
import { countAgentAttempts } from '../lib/stopping-rules'
import { logger } from '../lib/logger'
import { env } from '../config/env'

export class PaymentRetryAgent {
  async execute(event: LeakageEvent, triage: TriageResult): Promise<OutcomeType> {
    const attempts = await countAgentAttempts(event.id, 'PaymentRetryAgent')

    if (attempts >= STOPPING_RULES.PAYMENT_RETRY.maxRetries) {
      logger.info(`Max retries reached for payment ${event.metadata.paymentId ?? event.id}`)
      return 'STOPPED'
    }

    const auditId = await createTriageAudit(event, triage, 'EXECUTING')

    try {
      switch (triage.action) {
        case 'IMMEDIATE_RETRY':
        case 'DELAYED_RETRY': {
          if (triage.action === 'DELAYED_RETRY') {
            logger.info(`Executing scheduled retry for event ${event.id}`)
          }

          const paymentId = typeof event.metadata.paymentId === 'string' ? event.metadata.paymentId : undefined

          if (paymentId) {
            const payment = await fetchPayment(paymentId)
            logger.info(`Payment ${paymentId} failure reason: ${payment.error_reason ?? 'unknown'}`)
          }

          const link = await createPaymentLink({
            amount: event.rupeeAmount,
            currency: 'INR',
            customerId: event.customerId ?? event.id,
            description: `Retry payment for order ${event.metadata.orderId ?? event.id}`,
            customerEmail: event.customerEmail,
            customerPhone: event.customerPhone
          })

          await this.notifyWithPaymentLink(event, link.short_url)
          break
        }

        case 'SEND_PAYMENT_LINK': {
          const link = await createPaymentLink({
            amount: event.rupeeAmount,
            currency: 'INR',
            customerId: event.customerId ?? event.id,
            description: `Payment link for order ${event.metadata.orderId ?? event.id}`,
            customerEmail: event.customerEmail,
            customerPhone: event.customerPhone
          })

          await this.notifyWithPaymentLink(event, link.short_url)
          logger.info(`Payment link sent to ${event.customerEmail ?? event.customerPhone ?? 'unknown contact'}`)
          break
        }

        case 'ESCALATE_HUMAN': {
          logger.info(`Escalating payment ${event.id} to human review: ${triage.reasoning}`)

          await sendEmail({
            to: env.ALERT_EMAIL,
            subject: `[RevenueRadar] Payment escalation — ₹${event.rupeeAmount}`,
            text: `Event ${event.id} escalated. Reasoning: ${triage.reasoning}`,
            html: `<p>Event ${event.id} escalated.</p><p>Reasoning: ${triage.reasoning}</p>`
          })

          await updateAuditOutcome(auditId, 'ESCALATED', triage.reasoning, new Date())
          return 'ESCALATED'
        }

        default: {
          logger.warn(`Unknown action: ${triage.action}`)
          await updateAuditOutcome(auditId, 'FAILED', `Unknown action: ${triage.action}`, new Date())
          return 'FAILED'
        }
      }

      await updateAuditOutcome(auditId, 'RECOVERED', `Action ${triage.action} completed`, new Date())
      return 'RECOVERED'
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)))
      await updateAuditOutcome(auditId, 'FAILED', error instanceof Error ? error.message : String(error), new Date())
      return 'FAILED'
    }
  }

  private async notifyWithPaymentLink(event: LeakageEvent, paymentLink: string): Promise<void> {
    const email = await generateRecoveryEmail({
      type: 'payment_failed',
      rupeeAmount: event.rupeeAmount,
      merchantName: event.merchantId,
      paymentLink
    })

    if (event.customerEmail) {
      await sendEmail({ to: event.customerEmail, subject: email.subject, html: email.html, text: email.text })
    }

    if (event.customerPhone) {
      const message = await generateWhatsAppMessage({
        type: 'payment_failed',
        rupeeAmount: event.rupeeAmount,
        paymentLink
      })
      await sendWhatsApp({ to: event.customerPhone, message })
    }
  }
}

export const paymentRetryAgent = new PaymentRetryAgent()
