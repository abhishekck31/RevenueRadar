import crypto from 'crypto'
import Razorpay from 'razorpay'
import { env } from '../config/env'

export const razorpayClient = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET
})

export function validateWebhookSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
}
