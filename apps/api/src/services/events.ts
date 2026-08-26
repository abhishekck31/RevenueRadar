import type { Prisma } from '@prisma/client'
import type { LeakageEvent } from '@revenue-radar/shared'
import { prisma } from '../lib/prisma'
import { leakageEventsQueue } from '../queues'

export async function persistAndQueueEvent(event: LeakageEvent): Promise<void> {
  await prisma.leakageEvent.create({
    data: {
      id: event.id,
      type: event.type,
      merchantId: event.merchantId,
      rupeeAmount: event.rupeeAmount,
      customerId: event.customerId,
      customerEmail: event.customerEmail,
      customerPhone: event.customerPhone,
      metadata: event.metadata as Prisma.InputJsonValue,
      rawPayload: event.rawWebhookPayload as Prisma.InputJsonValue,
      detectedAt: event.detectedAt
    }
  })

  await leakageEventsQueue.add('leakage-event', event, { jobId: event.id })
}
