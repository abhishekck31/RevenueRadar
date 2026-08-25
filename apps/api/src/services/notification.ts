import type { AuditEntry } from '@revenue-radar/shared'
import { logger } from '../lib/logger'

export interface NotificationPayload {
  channel: 'email' | 'whatsapp'
  to: string
  subject?: string
  message: string
  relatedAuditEntryId?: AuditEntry['id']
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // Stub: wire up Nodemailer / Twilio in a later task.
  logger.info(`[notification:stub] would send ${payload.channel} to ${payload.to}: ${payload.message}`)
}
