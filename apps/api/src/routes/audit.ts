import { Router } from 'express'
import { getAuditEntries, getRecoveryMetrics, getRecoveryTrend } from '../services/audit'

export const auditRouter = Router()
export const metricsRouter = Router()

auditRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.max(1, Number(req.query.limit) || 20)
    const agentType = typeof req.query.agentType === 'string' && req.query.agentType ? req.query.agentType : undefined
    const outcome = typeof req.query.outcome === 'string' && req.query.outcome ? req.query.outcome : undefined

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
    const days = Math.max(1, Math.min(90, Number(req.query.days) || 14))
    const trend = await getRecoveryTrend(days)
    res.json({ trend })
  } catch (err) {
    next(err)
  }
})
