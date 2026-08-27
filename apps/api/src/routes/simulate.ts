import { Router } from 'express'
import { z } from 'zod'
import { normalizeWebhookEvent } from '../normalizer'
import { persistAndQueueEvent } from '../services/events'
import { logger } from '../lib/logger'
import { simulateBodySchema } from '../lib/validation'

export const simulateRouter = Router()

const DEMO_MERCHANT_ID = 'merchant_demo'

function buildWebhookPayload(
  type: z.infer<typeof simulateBodySchema>['type'],
  data: z.infer<typeof simulateBodySchema>['data']
): { eventName: string; payload: Record<string, unknown> } {
  // The schema already guarantees a positive, bounded amount and well-formed
  // contact details, so no defensive coercion is needed here.
  const amountPaise = Math.round(data.amount * 100)
  const customerEmail = data.customerEmail
  const customerPhone = data.customerPhone
  const entityId = `sim_${Date.now()}`

  switch (type) {
    case 'payment_failed':
      return {
        eventName: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: entityId,
              amount: amountPaise,
              order_id: `order_sim_${Date.now()}`,
              email: customerEmail,
              contact: customerPhone,
              error_code: data.errorType ?? 'GATEWAY_ERROR',
              error_reason: data.errorType ?? 'GATEWAY_ERROR',
              attempts: 1
            }
          }
        }
      }

    case 'checkout_abandoned':
      return {
        eventName: 'payment_link.expired',
        payload: {
          payment_link: {
            entity: {
              id: entityId,
              amount: amountPaise,
              description: 'Abandoned checkout',
              customer: { email: customerEmail, contact: customerPhone }
            }
          }
        }
      }

    case 'invoice_overdue':
      return {
        eventName: 'invoice.expired',
        payload: {
          invoice: {
            entity: {
              id: entityId,
              amount_due: amountPaise,
              invoice_number: data.invoiceNumber ?? `INV-${Date.now()}`,
              date: data.dueDate ?? new Date().toISOString(),
              customer_details: { email: customerEmail, contact: customerPhone }
            }
          }
        }
      }
  }
}

simulateRouter.post('/simulate', async (req, res, next) => {
  try {
    const parsed = simulateBodySchema.parse(req.body)
    const { eventName, payload } = buildWebhookPayload(parsed.type, parsed.data)

    const event = normalizeWebhookEvent(eventName, payload, DEMO_MERCHANT_ID)

    if (!event) {
      res.status(400).json({ error: 'Failed to normalize simulated event' })
      return
    }

    // Belt and braces: the schema bounds the amount, but normalization derives
    // the final rupee value and must never queue a zero or negative event.
    if (!Number.isFinite(event.rupeeAmount) || event.rupeeAmount <= 0) {
      res.status(400).json({ error: 'Event amount must be greater than zero' })
      return
    }

    await persistAndQueueEvent(event)

    logger.info(`[simulate] fired ${parsed.type} event ${event.id}`)

    res.status(200).json({ eventId: event.id, message: 'Event queued' })
  } catch (err) {
    next(err)
  }
})
