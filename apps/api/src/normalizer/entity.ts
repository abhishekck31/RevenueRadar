/**
 * Typed accessors for Razorpay webhook payloads.
 *
 * Payload bodies are attacker-shaped until the HMAC passes and unversioned
 * after that, so every field is read defensively rather than cast through
 * `any`. A missing or wrong-typed field yields undefined instead of throwing
 * deep inside an agent.
 */

export type JsonRecord = Record<string, unknown>

export function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonRecord) : undefined
}

/** Reads `payload[section].entity`, the shape every Razorpay event uses. */
export function entityOf(payload: JsonRecord, section: string): JsonRecord {
  return asRecord(asRecord(payload[section])?.entity) ?? {}
}

export function str(source: JsonRecord, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function num(source: JsonRecord, key: string): number | undefined {
  const value = source[key]

  if (typeof value === 'number' && Number.isFinite(value)) return value

  // Razorpay sends some numeric fields as strings depending on the event.
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }

  return undefined
}

/**
 * Converts a paise amount to rupees. Returns 0 when absent or negative so the
 * caller's own positive-amount check rejects the event.
 */
export function paiseToRupees(source: JsonRecord, key: string): number {
  const paise = num(source, key)
  return paise !== undefined && paise > 0 ? paise / 100 : 0
}

/** Reads a nested record, e.g. `entity.customer` or `entity.customer_details`. */
export function nested(source: JsonRecord, key: string): JsonRecord {
  return asRecord(source[key]) ?? {}
}
