import winston from 'winston'

const { combine, timestamp, printf, colorize, errors, json } = winston.format

const isProd = process.env.NODE_ENV === 'production'

/**
 * Key fragments whose values are never safe to write to a log sink. Matched as
 * substrings and case-insensitively, so `RAZORPAY_KEY_SECRET`, `authToken` and
 * `x-razorpay-signature` are all caught.
 */
const SENSITIVE_KEY_PARTS = [
  'password',
  'secret',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'signature',
  'cookie',
  'credential',
  'jwt'
]

/**
 * `key` deliberately isn't in the list above: it would swallow ordinary fields
 * like `keyCount` or `orderKey`. These exact names cover the real credentials
 * without that collateral damage.
 */
const SENSITIVE_EXACT_KEYS = new Set(['key', 'keys', 'auth', 'pass'])

const REDACTED = '[REDACTED]'
const MAX_DEPTH = 6

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()

  if (SENSITIVE_EXACT_KEYS.has(lower)) return true

  const normalized = lower.replace(/[-_]/g, '')
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part.replace(/[-_]/g, '')))
}

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') {
    return value
  }

  // Webhook payloads can be self-referential once normalized; without this a
  // cycle would recurse until the stack blows.
  if (seen.has(value as object)) return '[Circular]'
  seen.add(value as object)

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1, seen))
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      isSensitiveKey(k) ? REDACTED : redactValue(v, depth + 1, seen)
    ])
  )
}

/**
 * Redacts credential-shaped fields anywhere in a log entry's metadata. Applied
 * before any transport sees the record, so it covers the console and both
 * files at once.
 */
const redactSensitive = winston.format((info) => {
  const seen = new WeakSet<object>()

  for (const [key, value] of Object.entries(info)) {
    // level/message/timestamp are winston's own and must stay intact.
    if (key === 'level' || key === 'message' || key === 'timestamp' || key === 'stack') continue

    info[key] = isSensitiveKey(key) ? REDACTED : redactValue(value, 0, seen)
  }

  return info
})

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const extras = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
  return `${ts} [${level}]: ${stack ?? message}${extras}`
})

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: combine(errors({ stack: true }), redactSensitive(), timestamp()),
  transports: [
    // The console transport is present in production too: container platforms
    // collect stdout, and previously prod logs went only to files inside the
    // container where `docker logs` could not see them.
    new winston.transports.Console({
      format: isProd ? json() : combine(colorize(), consoleFormat)
    }),
    ...(isProd
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error', format: json() }),
          new winston.transports.File({ filename: 'logs/combined.log', format: json() })
        ]
      : [])
  ]
})
