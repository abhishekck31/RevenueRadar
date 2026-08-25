import { Router } from 'express'
import { getAuditEntries, getRecoveryMetrics } from '../services/audit'

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
