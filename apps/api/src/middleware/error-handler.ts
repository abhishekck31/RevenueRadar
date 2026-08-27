import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { logger } from '../lib/logger'
import { env } from '../config/env'

const isDevelopment = env.NODE_ENV === 'development'

/** An error carrying an HTTP status it wants surfaced (e.g. InvalidEventError). */
function statusOf(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = Number((err as { status?: unknown }).status)
    if (Number.isInteger(status) && status >= 400 && status <= 499) {
      return status
    }
  }

  return undefined
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Validation failures describe the caller's own input, so echoing them back
  // is safe and is the only way they can fix the request.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      issues: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    })
    return
  }

  const clientStatus = statusOf(err)

  if (clientStatus) {
    res.status(clientStatus).json({ error: err instanceof Error ? err.message : 'Request rejected' })
    return
  }

  // Everything else is a server fault. Log it in full internally — the stack is
  // kept in every environment, since this sink is the server's own log and is
  // the only way to diagnose a production failure.
  const error = err instanceof Error ? err : new Error(String(err))

  logger.error(`Unhandled error on ${req.method} ${req.path}`, {
    message: error.message,
    stack: error.stack
  })

  // ...but never hand the client the message or stack: they routinely carry
  // connection strings, file paths and query fragments.
  res.status(500).json({
    error: isDevelopment && err instanceof Error ? err.message : 'Internal server error'
  })
}

/**
 * Last-resort handlers. CLAUDE.md requires graceful degradation, so a rejected
 * promise must never take the process down silently or leave it in an unknown
 * state without a trace.
 */
export function registerProcessErrorHandlers(): void {
  process.on('unhandledRejection', (reason) => {
    logger.error(reason instanceof Error ? reason : new Error(`Unhandled rejection: ${String(reason)}`))
  })

  process.on('uncaughtException', (err) => {
    logger.error(err instanceof Error ? err : new Error(String(err)))

    // The process is in an undefined state after an uncaught exception; keep
    // running only long enough for the log write to flush.
    setTimeout(() => process.exit(1), 100).unref()
  })
}
