import crypto from 'crypto'
import Razorpay from 'razorpay'
import { env } from '../config/env'

export const razorpayClient = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET
})

interface RazorpayPayment {
  id: string
  amount: number
  currency: string
  status: string
  order_id: string
  email: string
  contact: string
  error_code?: string
  error_description?: string
  error_reason?: string
  created_at: number
}

interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  status: string
  attempts: number
}

/**
 * Verifies the Razorpay HMAC over the exact bytes received.
 *
 * Takes the raw Buffer rather than a decoded string: re-encoding a body that
 * isn't valid UTF-8 substitutes replacement characters, which would change the
 * digest and reject a legitimate event. Comparison is constant-time so a
 * caller can't recover the expected signature byte by byte from response
 * timing.
 */
export function validateWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const providedBuffer = Buffer.from(signature, 'utf8')

  // timingSafeEqual throws on length mismatch, so this guard has to come first.
  // The length of an HMAC-SHA256 hex digest is fixed and public, so leaking it
  // through an early return costs nothing.
  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  const payment = await razorpayClient.payments.fetch(paymentId)
  return payment as unknown as RazorpayPayment
}

export async function fetchOrder(orderId: string): Promise<RazorpayOrder> {
  const order = await razorpayClient.orders.fetch(orderId)
  return order as unknown as RazorpayOrder
}

export async function createPaymentLink(params: {
  amount: number
  currency: string
  customerId: string
  description: string
  customerEmail?: string
  customerPhone?: string
}): Promise<{ id: string; short_url: string }> {
  const paymentLink = await razorpayClient.paymentLink.create({
    amount: Math.round(params.amount * 100),
    currency: params.currency,
    description: params.description,
    customer: {
      email: params.customerEmail,
      contact: params.customerPhone
    },
    notes: { customerId: params.customerId },
    notify: {
      email: Boolean(params.customerEmail),
      sms: Boolean(params.customerPhone)
    }
  })

  return { id: paymentLink.id, short_url: paymentLink.short_url }
}
