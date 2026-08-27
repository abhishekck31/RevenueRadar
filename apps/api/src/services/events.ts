import type { Prisma } from '@prisma/client'
import type { LeakageEvent } from '@revenue-radar/shared'
import { prisma } from '../lib/prisma'
import { leakageEventsQueue } from '../queues'
import { MAX_RUPEE_AMOUNT, sanitizeText } from '../lib/validation'

/** Thrown when an event fails the checks every entry point must satisfy. */
export class InvalidEventError extends Error {
  readonly status = 400
}

/**
 * Central gate for both entry points — the Razorpay webhook and the simulator.
 * An event that fails here is never persisted and never queued, so no agent can
 * act on it.
 */
function assertEventIsSane(event: LeakageEvent): void {
  if (!event.id || !event.merchantId) {
    throw new InvalidEventError('Event is missing an id or merchantId')
  }

  if (!Number.isFinite(event.rupeeAmount) || event.rupeeAmount <= 0) {
    throw new InvalidEventError('Event amount must be greater than zero')
  }

  if (event.rupeeAmount > MAX_RUPEE_AMOUNT) {
    throw new InvalidEventError('Event amount exceeds the accepted maximum')
  }
}

export async function persistAndQueueEvent(event: LeakageEvent): Promise<void> {
  assertEventIsSane(event)

  // Customer-controlled strings reach logs, emails and the dashboard, so they
  // are stripped of control characters and angle brackets on the way in.
  const customerEmail = event.customerEmail ? sanitizeText(event.customerEmail) : event.customerEmail
  const customerPhone = event.customerPhone ? sanitizeText(event.customerPhone) : event.customerPhone

  await prisma.leakageEvent.create({
    data: {
      id: event.id,
      type: event.type,
      merchantId: event.merchantId,
      rupeeAmount: event.rupeeAmount,
      customerId: event.customerId,
      customerEmail,
      customerPhone,
      metadata: event.metadata as Prisma.InputJsonValue,
      rawPayload: event.rawWebhookPayload as Prisma.InputJsonValue,
      detectedAt: event.detectedAt
    }
  })

  await leakageEventsQueue.add('leakage-event', event, { jobId: event.id })
}
