import type { NextFunction, Request, Response } from 'express'
import { logger } from '../lib/logger'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  logger.error(err instanceof Error ? err : new Error(String(err)))

  const status = err instanceof Error && 'status' in err ? Number((err as { status?: number }).status) : 500

  res.status(Number.isFinite(status) ? status : 500).json({
    error: 'Internal server error',
    message: err instanceof Error ? err.message : 'Unknown error'
  })
}
