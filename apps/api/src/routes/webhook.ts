import express, { Router, Request, Response } from 'express'
import { validateWebhookSignature } from '../services/razorpay'
import { normalizeWebhookEvent } from '../normalizer'
import { persistAndQueueEvent, InvalidEventError } from '../services/events'
import { logger } from '../lib/logger'

export const webhookRouter = Router()

// Razorpay webhook bodies are small; anything larger is not a legitimate event
// and shouldn't be buffered, let alone HMAC'd.
const RAW_BODY_LIMIT = '64kb'

webhookRouter.post(
  '/razorpay',
  express.raw({ type: 'application/json', limit: RAW_BODY_LIMIT }),
  async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature']
    const rawBody = req.body

    // Nothing is parsed until the HMAC over the raw bytes checks out, so a
    // forged payload never reaches the JSON parser or the normalizer.
    if (!Buffer.isBuffer(rawBody) || typeof signature !== 'string' || !validateWebhookSignature(rawBody, signature)) {
      // Deliberately opaque: the response says only that the signature failed,
      // never which part, so it can't be used as a verification oracle.
      logger.warn('[webhook] rejected event: invalid signature')
      res.status(400).json({ error: 'Invalid webhook signature' })
      return
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>
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
      // A malformed event will never become valid, so acknowledge it rather
      // than returning an error Razorpay would retry indefinitely.
      if (err instanceof InvalidEventError) {
        logger.warn(`[webhook] discarded unusable event: ${err.message}`)
        res.status(200).json({ status: 'ignored' })
        return
      }

      logger.error(err instanceof Error ? err : new Error(String(err)))
      res.status(500).json({ error: 'Failed to process webhook event' })
    }
  }
)
