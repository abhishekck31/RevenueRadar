import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { eventsQuerySchema } from '../lib/validation'

export const eventsRouter = Router()

eventsRouter.get('/', async (req, res, next) => {
  try {
    const { limit } = eventsQuerySchema.parse(req.query)

    const events = await prisma.leakageEvent.findMany({
      orderBy: { detectedAt: 'desc' },
      take: limit
    })

    res.json({ events })
  } catch (err) {
    next(err)
  }
})
