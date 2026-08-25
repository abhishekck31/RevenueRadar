import { Router } from 'express'
import { prisma } from '../lib/prisma'

export const eventsRouter = Router()

eventsRouter.get('/', async (_req, res, next) => {
  try {
    const events = await prisma.leakageEvent.findMany({
      orderBy: { detectedAt: 'desc' },
      take: 50
    })

    res.json({ events })
  } catch (err) {
    next(err)
  }
})
