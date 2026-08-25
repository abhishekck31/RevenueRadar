import { Router } from 'express'

export const auditRouter = Router()

auditRouter.get('/', async (_req, res) => {
  // Stub: fetch AuditEntry records via Prisma in a later task.
  res.json({ auditEntries: [] })
})
