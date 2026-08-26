import { Router } from 'express'
import { prisma } from '../lib/prisma'

export const eventsRouter = Router()

eventsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))

    const events = await prisma.leakageEvent.findMany({
      orderBy: { detectedAt: 'desc' },
      take: limit
    })

    res.json({ events })
  } catch (err) {
    next(err)
  }
})
