import { z } from 'zod'

/** Largest event we'll accept: ₹1 crore. Anything above is treated as malformed. */
export const MAX_RUPEE_AMOUNT = 10_000_000

/**
 * Strips angle brackets and control characters from free-text that reaches a
 * log line, an email body, or the dashboard. Customer-supplied values arrive
 * from webhook payloads, so they are never trusted as display-safe.
 */
export function sanitizeText(value: string): string {
  let out = ''

  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0

    // Control characters, including the CR/LF behind log forging and SMTP
    // header injection when a value is interpolated into a message.
    if (code < 0x20 || code === 0x7f) continue

    // Angle brackets, so a value can never open a tag wherever it is rendered.
    if (ch === '<' || ch === '>') continue

    out += ch
  }

  return out.trim()
}

/** A positive rupee amount within the accepted band. Rejects 0, negatives, and NaN. */
export const rupeeAmount = z
  .number()
  .finite('must be a finite number')
  .positive('must be greater than zero')
  .max(MAX_RUPEE_AMOUNT, `must not exceed ₹${MAX_RUPEE_AMOUNT.toLocaleString('en-IN')}`)

/** Indian mobile in E.164 form, as Razorpay and Twilio both expect. */
export const customerPhone = z.string().regex(/^\+91[0-9]{10}$/, 'must be an Indian number in +91XXXXXXXXXX form')

export const customerEmail = z.string().email().max(254).transform(sanitizeText)

export const agentTypeEnum = z.enum(['PaymentRetryAgent', 'CheckoutNudgeAgent', 'InvoiceCollectorAgent'])

export const outcomeEnum = z.enum(['RECOVERED', 'FAILED', 'ESCALATED', 'STOPPED'])

export const leakageTypeEnum = z.enum(['PAYMENT_FAILED', 'CHECKOUT_ABANDONED', 'INVOICE_OVERDUE'])

export const statusEnum = z.enum(['PENDING', 'EXECUTING', 'SUCCESS', 'FAILED', 'ESCALATED'])

/** POST /api/simulate */
export const simulateBodySchema = z.object({
  type: z.enum(['payment_failed', 'checkout_abandoned', 'invoice_overdue']),
  data: z
    .object({
      amount: rupeeAmount,
      customerEmail: customerEmail.optional(),
      customerPhone: customerPhone.optional(),
      errorType: z.enum(['GATEWAY_ERROR', 'BAD_REQUEST_ERROR', 'SERVER_ERROR']).optional(),
      invoiceNumber: z.string().max(50).transform(sanitizeText).optional(),
      dueDate: z.string().max(40).optional()
    })
    .strict()
})

/** GET /api/audit */
export const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  agentType: agentTypeEnum.optional(),
  outcome: outcomeEnum.optional()
})

/** GET /api/events */
export const eventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
})

/** GET /api/metrics/trend */
export const trendQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14)
})

export type SimulateBody = z.infer<typeof simulateBodySchema>
export type AuditQuery = z.infer<typeof auditQuerySchema>
