import express, { Router, Request, Response } from 'express'
import { validateWebhookSignature } from '../services/razorpay'
import { normalizeWebhookEvent } from '../normalizer'
import { persistAndQueueEvent } from '../services/events'
import { logger } from '../lib/logger'

export const webhookRouter = Router()

webhookRouter.post('/razorpay', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature']
  const rawBody = (req.body as Buffer).toString('utf8')

  if (typeof signature !== 'string' || !validateWebhookSignature(rawBody, signature)) {
    logger.warn('[webhook] rejected event: invalid signature')
    res.status(400).json({ error: 'Invalid webhook signature' })
    return
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' })
    return
  }

  const eventName = typeof body.event === 'string' ? body.event : undefined
  logger.info(`[webhook] received event: ${eventName ?? 'unknown'}`)

  if (!eventName) {
    res.status(200).json({ status: 'ignored' })
    return
  }

  const merchantId = typeof body.account_id === 'string' ? body.account_id : 'unknown'
  const payload = (body.payload as Record<string, unknown>) ?? {}

  const event = normalizeWebhookEvent(eventName, payload, merchantId)

  if (!event) {
    logger.info(`[webhook] event type not handled: ${eventName}`)
    res.status(200).json({ status: 'ignored' })
    return
  }

  try {
    await persistAndQueueEvent(event)

    res.status(200).json({ status: 'queued', eventId: event.id })
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)))
    res.status(500).json({ error: 'Failed to process webhook event' })
  }
})
