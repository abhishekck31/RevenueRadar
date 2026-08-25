import { Router } from 'express'
import type { LeakageEvent, LeakageType } from '@revenue-radar/shared'
import { validateWebhookSignature } from '../services/razorpay'
import { leakageEventsQueue } from '../queues'
import { logger } from '../lib/logger'

export const webhookRouter = Router()

const EVENT_TYPE_MAP: Record<string, LeakageType> = {
  'payment.failed': 'PAYMENT_FAILED',
  'order.checkout.abandoned': 'CHECKOUT_ABANDONED',
  'invoice.overdue': 'INVOICE_OVERDUE'
}

webhookRouter.post('/razorpay', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature']
    const rawBody = JSON.stringify(req.body)

    if (typeof signature !== 'string' || !validateWebhookSignature(rawBody, signature)) {
      res.status(400).json({ error: 'Invalid webhook signature' })
      return
    }

    const razorpayEventType: string | undefined = req.body?.event
    const leakageType = razorpayEventType ? EVENT_TYPE_MAP[razorpayEventType] : undefined

    if (!leakageType) {
      logger.warn(`[webhook] unrecognized event type: ${razorpayEventType}`)
      res.status(202).json({ status: 'ignored' })
      return
    }

    const payload = req.body.payload ?? {}
    const entity = payload.payment?.entity ?? payload.order?.entity ?? payload.invoice?.entity ?? {}

    const normalizedEvent: LeakageEvent = {
      id: entity.id ?? `evt_${Date.now()}`,
      type: leakageType,
      merchantId: entity.merchant_id ?? 'unknown',
      rupeeAmount: entity.amount ? entity.amount / 100 : 0,
      customerId: entity.customer_id,
      customerEmail: entity.email,
      customerPhone: entity.contact,
      metadata: {},
      detectedAt: new Date(),
      rawWebhookPayload: req.body
    }

    await leakageEventsQueue.add('leakage-event', normalizedEvent)

    res.status(202).json({ status: 'queued', eventId: normalizedEvent.id })
  } catch (err) {
    next(err)
  }
})
