import type { LeakageEvent, OutcomeType, TriageResult } from '@revenue-radar/shared'
import { STOPPING_RULES } from '@revenue-radar/shared'
import { createPaymentLink } from '../services/razorpay'
import { sendEmail, sendWhatsApp, generateRecoveryEmail, generateWhatsAppMessage } from '../services/notification'
import { createTriageAudit, updateAuditOutcome } from '../services/audit'
import { countAgentAttempts, getLastAttemptAt } from '../lib/stopping-rules'
import { logger } from '../lib/logger'

export class CheckoutNudgeAgent {
  async execute(event: LeakageEvent, triage: TriageResult): Promise<OutcomeType> {
    const attempts = await countAgentAttempts(event.id, 'CheckoutNudgeAgent')

    if (attempts >= STOPPING_RULES.CHECKOUT_NUDGE.maxNudges) {
      logger.info(`Max nudges reached for checkout ${event.id}`)
      return 'STOPPED'
    }

    const lastAttemptAt = await getLastAttemptAt(event.id, 'CheckoutNudgeAgent')
    if (lastAttemptAt) {
      const cooldownMs = STOPPING_RULES.CHECKOUT_NUDGE.cooldownHours * 60 * 60 * 1000
      if (Date.now() - lastAttemptAt.getTime() < cooldownMs) {
        logger.info(`Nudge cooldown active for checkout ${event.id}`)
        return 'STOPPED'
      }
    }

    const auditId = await createTriageAudit(event, triage, 'EXECUTING')

    try {
      switch (triage.action) {
        case 'SEND_EMAIL_NUDGE': {
          const link = await this.createNudgeLink(event)
          const email = await generateRecoveryEmail({
            type: 'checkout_abandoned',
            rupeeAmount: event.rupeeAmount,
            merchantName: event.merchantId,
            paymentLink: link
          })
          await sendEmail({ to: event.customerEmail!, subject: email.subject, html: email.html, text: email.text })
          break
        }

        case 'SEND_WHATSAPP_NUDGE': {
          const link = await this.createNudgeLink(event)
          const message = await generateWhatsAppMessage({
            type: 'checkout_abandoned',
            rupeeAmount: event.rupeeAmount,
            paymentLink: link
          })
          await sendWhatsApp({ to: event.customerPhone!, message })
          break
        }

        case 'SEND_BOTH': {
          const link = await this.createNudgeLink(event)

          const email = await generateRecoveryEmail({
            type: 'checkout_abandoned',
            rupeeAmount: event.rupeeAmount,
            merchantName: event.merchantId,
            paymentLink: link
          })
          await sendEmail({ to: event.customerEmail!, subject: email.subject, html: email.html, text: email.text })

          const message = await generateWhatsAppMessage({
            type: 'checkout_abandoned',
            rupeeAmount: event.rupeeAmount,
            paymentLink: link
          })
          await sendWhatsApp({ to: event.customerPhone!, message })
          break
        }

        case 'SKIP': {
          logger.info(`No contact info — skipping nudge for event ${event.id}`)
          await updateAuditOutcome(auditId, 'FAILED', 'No contact information available', new Date())
          return 'FAILED'
        }

        default: {
          logger.warn(`Unknown action: ${triage.action}`)
          await updateAuditOutcome(auditId, 'FAILED', `Unknown action: ${triage.action}`, new Date())
          return 'FAILED'
        }
      }

      await updateAuditOutcome(auditId, 'RECOVERED', `Nudge sent via ${triage.action}`, new Date())
      return 'RECOVERED'
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)))
      await updateAuditOutcome(auditId, 'FAILED', error instanceof Error ? error.message : String(error), new Date())
      return 'FAILED'
    }
  }

  private async createNudgeLink(event: LeakageEvent): Promise<string> {
    const link = await createPaymentLink({
      amount: event.rupeeAmount,
      currency: 'INR',
      customerId: event.customerId ?? event.id,
      description: 'Complete your checkout',
      customerEmail: event.customerEmail,
      customerPhone: event.customerPhone
    })

    return link.short_url
  }
}

export const checkoutNudgeAgent = new CheckoutNudgeAgent()
