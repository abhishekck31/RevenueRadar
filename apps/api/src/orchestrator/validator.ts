import { z } from 'zod'

const TriageResponseSchema = z.object({
  agentType: z.enum(['PaymentRetryAgent', 'CheckoutNudgeAgent', 'InvoiceCollectorAgent']),
  action: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  rupeeAtRisk: z.number().positive(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  recoveryProbability: z.number().min(0).max(1),
  score: z.number(),
  suggestedRetryAt: z.string().datetime().optional()
})

export function validateTriageResponse(raw: unknown): z.infer<typeof TriageResponseSchema> {
  return TriageResponseSchema.parse(raw)
}
