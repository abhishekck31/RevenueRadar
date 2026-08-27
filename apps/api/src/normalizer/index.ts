import { v4 as uuidv4 } from 'uuid'
import type { LeakageEvent, LeakageType } from '@revenue-radar/shared'
import { logger } from '../lib/logger'
import { entityOf, nested, num, paiseToRupees, str, type JsonRecord } from './entity'

const EVENT_TYPE_MAP: Record<string, LeakageType> = {
  'payment.failed': 'PAYMENT_FAILED',
  'order.paid': 'CHECKOUT_ABANDONED', // we treat unpaid orders separately
  'invoice.expired': 'INVOICE_OVERDUE',
  'subscription.halted': 'PAYMENT_FAILED',
  'subscription.cancelled': 'PAYMENT_FAILED',
  'payment_link.expired': 'CHECKOUT_ABANDONED'
}

function baseEvent(
  type: LeakageType,
  merchantId: string,
  payload: JsonRecord
): Omit<LeakageEvent, 'rupeeAmount' | 'metadata'> {
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
  payload: JsonRecord,
  merchantId: string
): LeakageEvent | null {
  const type = EVENT_TYPE_MAP[eventName]

  if (!type) {
    return null
  }

  switch (eventName) {
    case 'payment.failed': {
      const entity = entityOf(payload, 'payment')

      return {
        ...baseEvent(type, merchantId, payload),
        rupeeAmount: paiseToRupees(entity, 'amount'),
        customerId: str(entity, 'customer_id'),
        customerEmail: str(entity, 'email'),
        customerPhone: str(entity, 'contact'),
        metadata: {
          paymentId: str(entity, 'id'),
          orderId: str(entity, 'order_id'),
          errorCode: str(entity, 'error_code'),
          errorReason: str(entity, 'error_reason'),
          attempts: num(entity, 'attempts')
        }
      }
    }

    case 'payment_link.expired': {
      const entity = entityOf(payload, 'payment_link')
      const customer = nested(entity, 'customer')

      return {
        ...baseEvent(type, merchantId, payload),
        rupeeAmount: paiseToRupees(entity, 'amount'),
        customerEmail: str(customer, 'email'),
        customerPhone: str(customer, 'contact'),
        metadata: {
          paymentLinkId: str(entity, 'id'),
          description: str(entity, 'description')
        }
      }
    }

    case 'invoice.expired': {
      const entity = entityOf(payload, 'invoice')
      const customer = nested(entity, 'customer_details')

      return {
        ...baseEvent(type, merchantId, payload),
        rupeeAmount: paiseToRupees(entity, 'amount_due'),
        customerEmail: str(customer, 'email'),
        customerPhone: str(customer, 'contact'),
        metadata: {
          invoiceId: str(entity, 'id'),
          invoiceNumber: str(entity, 'invoice_number'),
          dueDate: str(entity, 'date')
        }
      }
    }

    case 'subscription.halted':
    case 'subscription.cancelled': {
      const entity = entityOf(payload, 'subscription')

      return {
        ...baseEvent(type, merchantId, payload),
        // A subscription entity carries no amount of its own — the previous
        // code read `charge_at`, which is a unix timestamp, and so produced a
        // rupee figure in the billions. The plan amount is the real value when
        // Razorpay expands it; otherwise this stays 0 and the event is
        // rejected by the positive-amount check rather than acted on.
        rupeeAmount: paiseToRupees(nested(entity, 'plan'), 'amount'),
        metadata: {
          subscriptionId: str(entity, 'id'),
          planId: str(entity, 'plan_id'),
          status: str(entity, 'status')
        }
      }
    }

    default:
      logger.warn(`[normalizer] mapped event type "${eventName}" has no extraction rule`)
      return null
  }
}
