import nodemailer from 'nodemailer'
import twilio from 'twilio'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '../config/env'
import { logger } from '../lib/logger'
import { extractJson } from '../lib/json'

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
})

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)

const claude = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

// ─── Email ───────────────────────────────────────────────────────

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<{ messageId: string }> {
  const info = await transporter.sendMail({
    from: env.FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text
  })

  logger.info(`[notification] email sent to ${params.to}: ${params.subject}`)

  return { messageId: info.messageId }
}

// ─── WhatsApp ────────────────────────────────────────────────────

export async function sendWhatsApp(params: { to: string; message: string }): Promise<{ sid: string }> {
  const message = await twilioClient.messages.create({
    from: env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${params.to}`,
    body: params.message
  })

  logger.info(`[notification] whatsapp sent to ${params.to}`)

  return { sid: message.sid }
}

// ─── AI Message Generation ───────────────────────────────────────

const RECOVERY_EMAIL_SYSTEM_PROMPT = `
You are writing recovery emails for merchants on Razorpay.
Tone: professional, empathetic, not pushy.
Always include a clear CTA.
Keep it under 150 words.
Respond ONLY with JSON: { "subject": string, "html": string, "text": string }
`

export async function generateRecoveryEmail(params: {
  type: 'payment_failed' | 'checkout_abandoned' | 'invoice_overdue'
  rupeeAmount: number
  merchantName: string
  paymentLink?: string
  invoiceNumber?: string
  dueDate?: string
}): Promise<{ subject: string; html: string; text: string }> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: RECOVERY_EMAIL_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Write a recovery email for this situation:\n${JSON.stringify(params, null, 2)}`
      }
    ]
  })

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')

  if (!textBlock) {
    throw new Error('Claude response contained no text block')
  }

  return extractJson(textBlock.text) as { subject: string; html: string; text: string }
}

const WHATSAPP_MESSAGE_SYSTEM_PROMPT = `
You are writing WhatsApp recovery messages for Razorpay merchants.
Tone: friendly, brief, human. Max 3 sentences. Include payment link if provided.
Respond with plain text only — no JSON, no markdown.
`

export async function generateWhatsAppMessage(params: {
  type: 'payment_failed' | 'checkout_abandoned' | 'invoice_overdue'
  rupeeAmount: number
  paymentLink?: string
}): Promise<string> {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: WHATSAPP_MESSAGE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Write a WhatsApp message for this situation:\n${JSON.stringify(params, null, 2)}`
      }
    ]
  })

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')

  if (!textBlock) {
    throw new Error('Claude response contained no text block')
  }

  return textBlock.text.trim()
}
