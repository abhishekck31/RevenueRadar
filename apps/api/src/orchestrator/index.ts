import Anthropic from '@anthropic-ai/sdk'
import type { AgentType, LeakageEvent, TriageResult } from '@revenue-radar/shared'
import { env } from '../config/env'
import { logger } from '../lib/logger'
import { extractJson } from '../lib/json'
import { buildTriagePrompt } from './prompt-builder'
import { validateTriageResponse } from './validator'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const ORCHESTRATOR_SYSTEM_PROMPT = `
You are the RevenueRadar orchestrator — an AI that triages revenue leakage events for merchants on Razorpay.

Your job: analyze each leakage event and decide the optimal recovery action.

## Scoring logic
Score each event using:
  score = (rupeeAmount * recoveryProbability) / timeDecayFactor

Recovery probability by type:
- PAYMENT_FAILED:
    - error_code "BAD_REQUEST_ERROR" → 0.3 (likely fraud/wrong details)
    - error_code "GATEWAY_ERROR" → 0.8 (transient, retry works)
    - error_code "SERVER_ERROR" → 0.85 (retry almost always works)
    - no error_code → 0.6 (default)
- CHECKOUT_ABANDONED: 0.25 (nudge converts ~25%)
- INVOICE_OVERDUE: 0.55 (follow-up converts ~55%)

Time decay:
- Detected < 1 hour ago → timeDecayFactor = 1.0 (urgent)
- Detected 1-6 hours ago → timeDecayFactor = 1.5
- Detected 6-24 hours ago → timeDecayFactor = 2.5
- Detected > 24 hours ago → timeDecayFactor = 4.0

Priority:
- score > 5000 → HIGH
- score 1000-5000 → MEDIUM
- score < 1000 → LOW

## Agent selection
- PAYMENT_FAILED → PaymentRetryAgent
- CHECKOUT_ABANDONED → CheckoutNudgeAgent
- INVOICE_OVERDUE → InvoiceCollectorAgent

## Action selection per agent

PaymentRetryAgent actions:
- "IMMEDIATE_RETRY" — GATEWAY_ERROR or SERVER_ERROR, < 2 hours old
- "DELAYED_RETRY" — BAD_REQUEST_ERROR or > 2 hours old, schedule for next morning 9am
- "SEND_PAYMENT_LINK" — 2+ failed retries already attempted
- "ESCALATE_HUMAN" — amount > ₹50,000 or confidence < 0.6

CheckoutNudgeAgent actions:
- "SEND_EMAIL_NUDGE" — customerEmail available
- "SEND_WHATSAPP_NUDGE" — customerPhone available, amount > ₹1,000
- "SEND_BOTH" — both available and amount > ₹5,000
- "SKIP" — no contact info available

InvoiceCollectorAgent actions:
- "SEND_REMINDER" — first follow-up
- "SEND_ESCALATION" — 2nd or 3rd follow-up
- "PROMISE_TO_PAY" — customer has responded previously
- "ESCALATE_HUMAN" — 4+ follow-ups unanswered

## Response format
Always respond with ONLY valid JSON, no prose, no markdown:
{
  "agentType": "PaymentRetryAgent" | "CheckoutNudgeAgent" | "InvoiceCollectorAgent",
  "action": string,
  "confidence": number (0.0 to 1.0),
  "reasoning": string (1-2 sentences max, explain the decision),
  "rupeeAtRisk": number,
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "recoveryProbability": number,
  "score": number,
  "suggestedRetryAt"?: string (ISO datetime, only for DELAYED_RETRY)
}
`

function fallbackResult(event: LeakageEvent): TriageResult {
  const agentType: AgentType =
    event.type === 'PAYMENT_FAILED'
      ? 'PaymentRetryAgent'
      : event.type === 'CHECKOUT_ABANDONED'
        ? 'CheckoutNudgeAgent'
        : 'InvoiceCollectorAgent'

  return {
    eventId: event.id,
    agentType,
    action: 'ESCALATE_HUMAN',
    confidence: 0,
    reasoning: 'Orchestrator failed — escalating to human review',
    rupeeAtRisk: event.rupeeAmount,
    priority: 'HIGH',
    recoveryProbability: 0,
    score: 0
  }
}

export async function triage(event: LeakageEvent): Promise<TriageResult> {
  const userMessage = buildTriagePrompt(event)

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )

    if (!textBlock) {
      throw new Error('Claude response contained no text block')
    }

    const validated = validateTriageResponse(extractJson(textBlock.text))

    const result: TriageResult = {
      eventId: event.id,
      ...validated
    }

    logger.info(
      `Triage complete: ${result.agentType} → ${result.action} (confidence: ${result.confidence}, priority: ${result.priority})`
    )

    return result
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)))
    return fallbackResult(event)
  }
}
