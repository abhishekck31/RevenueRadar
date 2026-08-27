import path from 'path'
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const envSchema = z.object({
  // CLAUDE.md constrains this project to Razorpay test-mode APIs, so a live key
  // is rejected at startup rather than discovered when an agent moves real money.
  RAZORPAY_KEY_ID: z.string().startsWith('rzp_test_', 'must be a test-mode key (rzp_test_…)'),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  // The HMAC secret guards every inbound webhook; a short one is trivially brute-forced.
  RAZORPAY_WEBHOOK_SECRET: z.string().min(16, 'must be at least 16 characters'),

  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', 'must be an Anthropic key (sk-ant-…)'),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  // Accepts a bare address or the "Display Name <addr@host>" form Nodemailer allows.
  FROM_EMAIL: z
    .string()
    .regex(/^(?:[^<>]*<\s*[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+\s*>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/, 'must be an email address, optionally in "Name <addr@host>" form'),

  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_WHATSAPP_FROM: z.string().min(1),

  ALERT_EMAIL: z.string().email(),

  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),

  // Comma-separated browser origins allowed to call the API.
  CORS_ORIGINS: z.string().optional()
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    // Only variable names and the rule they broke are printed — never the value,
    // so a malformed secret can't leak into logs or CI output.
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')

    throw new Error(`Invalid environment configuration:\n${problems}\n\nCheck .env against .env.example.`)
  }

  return parsed.data
}

export const env = loadEnv()

/** Browser origins permitted by CORS. Falls back to the local dashboard in development. */
export function corsOrigins(): string[] {
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  }

  return env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']
}
