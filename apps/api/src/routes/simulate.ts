import { Router } from 'express'
import { z } from 'zod'
import { normalizeWebhookEvent } from '../normalizer'
import { persistAndQueueEvent } from '../services/events'
import { logger } from '../lib/logger'

export const simulateRouter = Router()

const DEMO_MERCHANT_ID = 'merchant_demo'

const simulateSchema = z.object({
  type: z.enum(['payment_failed', 'checkout_abandoned', 'invoice_overdue']),
  data: z.record(z.unknown()).default({})
})

function buildWebhookPayload(
  type: z.infer<typeof simulateSchema>['type'],
  data: Record<string, unknown>
): { eventName: string; payload: Record<string, unknown> } {
  const amountPaise = Math.round(Number(data.amount ?? 0) * 100)
  const customerEmail = typeof data.customerEmail === 'string' ? data.customerEmail : undefined
  const customerPhone = typeof data.customerPhone === 'string' ? data.customerPhone : undefined
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
              error_code: typeof data.errorType === 'string' ? data.errorType : 'GATEWAY_ERROR',
              error_reason: typeof data.errorType === 'string' ? data.errorType : 'GATEWAY_ERROR',
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
              invoice_number: typeof data.invoiceNumber === 'string' ? data.invoiceNumber : `INV-${Date.now()}`,
              date: typeof data.dueDate === 'string' ? data.dueDate : new Date().toISOString(),
              customer_details: { email: customerEmail, contact: customerPhone }
            }
          }
        }
      }
  }
}

simulateRouter.post('/simulate', async (req, res, next) => {
  try {
    const parsed = simulateSchema.parse(req.body)
    const { eventName, payload } = buildWebhookPayload(parsed.type, parsed.data)

    const event = normalizeWebhookEvent(eventName, payload, DEMO_MERCHANT_ID)

    if (!event) {
      res.status(400).json({ error: 'Failed to normalize simulated event' })
      return
    }

    await persistAndQueueEvent(event)

    logger.info(`[simulate] fired ${parsed.type} event ${event.id}`)

    res.status(200).json({ eventId: event.id, message: 'Event queued' })
  } catch (err) {
    next(err)
  }
})
