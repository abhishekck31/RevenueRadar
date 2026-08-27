import { Router } from 'express'
import { getAuditEntries, getRecoveryMetrics, getRecoveryTrend } from '../services/audit'
import { auditQuerySchema, trendQuerySchema } from '../lib/validation'

export const auditRouter = Router()
export const metricsRouter = Router()

auditRouter.get('/', async (req, res, next) => {
  try {
    // Unbounded `limit` previously let one request pull the whole audit table.
    const { page, limit, agentType, outcome } = auditQuerySchema.parse(req.query)

    const result = await getAuditEntries({ page, limit, agentType, outcome })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

metricsRouter.get('/', async (_req, res, next) => {
  try {
    const metrics = await getRecoveryMetrics()
    res.json(metrics)
  } catch (err) {
    next(err)
  }
})

metricsRouter.get('/trend', async (req, res, next) => {
  try {
    const { days } = trendQuerySchema.parse(req.query)
    const trend = await getRecoveryTrend(days)
    res.json({ trend })
  } catch (err) {
    next(err)
  }
})
