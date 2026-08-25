import { v4 as uuidv4 } from 'uuid'
import type { LeakageEvent, LeakageType } from '@revenue-radar/shared'
import { logger } from '../lib/logger'

const EVENT_TYPE_MAP: Record<string, LeakageType> = {
  'payment.failed': 'PAYMENT_FAILED',
  'order.paid': 'CHECKOUT_ABANDONED', // we treat unpaid orders separately
  'invoice.expired': 'INVOICE_OVERDUE',
  'subscription.halted': 'PAYMENT_FAILED',
  'subscription.cancelled': 'PAYMENT_FAILED',
  'payment_link.expired': 'CHECKOUT_ABANDONED'
}

function baseEvent(type: LeakageType, merchantId: string, payload: Record<string, unknown>): Omit<LeakageEvent, 'rupeeAmount' | 'metadata'> {
  return {
    id: uuidv4(),
    type,
    merchantId,
    detectedAt: new Date(),
    rawWebhookPayload: payload
  }
}

export function normalizeWebhookEvent(
  eventName: string,
  payload: Record<string, unknown>,
  merchantId: string
): LeakageEvent | null {
  const type = EVENT_TYPE_MAP[eventName]

  if (!type) {
    return null
  }

  switch (eventName) {
    case 'payment.failed': {
      const entity = ((payload.payment as Record<string, any>)?.entity ?? {}) as Record<string, any>

      return {
        ...baseEvent(type, merchantId, payload),
        rupeeAmount: entity.amount ? entity.amount / 100 : 0,
        customerId: entity.customer_id,
        customerEmail: entity.email,
        customerPhone: entity.contact,
        metadata: {
          paymentId: entity.id,
          orderId: entity.order_id,
          errorCode: entity.error_code,
          errorReason: entity.error_reason,
          attempts: entity.attempts
        }
      }
    }

    case 'payment_link.expired': {
      const entity = ((payload.payment_link as Record<string, any>)?.entity ?? {}) as Record<string, any>

      return {
        ...baseEvent(type, merchantId, payload),
        rupeeAmount: entity.amount ? entity.amount / 100 : 0,
        customerEmail: entity.customer?.email,
        customerPhone: entity.customer?.contact,
        metadata: {
          paymentLinkId: entity.id,
          description: entity.description
        }
      }
    }

    case 'invoice.expired': {
      const entity = ((payload.invoice as Record<string, any>)?.entity ?? {}) as Record<string, any>

      return {
        ...baseEvent(type, merchantId, payload),
        rupeeAmount: entity.amount_due ? entity.amount_due / 100 : 0,
        customerEmail: entity.customer_details?.email,
        customerPhone: entity.customer_details?.contact,
        metadata: {
          invoiceId: entity.id,
          invoiceNumber: entity.invoice_number,
          dueDate: entity.date
        }
      }
    }

    case 'subscription.halted':
    case 'subscription.cancelled': {
      const entity = ((payload.subscription as Record<string, any>)?.entity ?? {}) as Record<string, any>

      return {
        ...baseEvent(type, merchantId, payload),
        rupeeAmount: entity.current_start ? entity.charge_at ?? 0 : 0,
        metadata: {
          subscriptionId: entity.id,
          planId: entity.plan_id,
          status: entity.status
        }
      }
    }

    default:
      logger.warn(`[normalizer] mapped event type "${eventName}" has no extraction rule`)
      return null
  }
}
