import { Router } from 'express'

export const eventsRouter = Router()

eventsRouter.get('/', async (_req, res) => {
  // Stub: fetch LeakageEvent records via Prisma in a later task.
  res.json({ events: [] })
})
