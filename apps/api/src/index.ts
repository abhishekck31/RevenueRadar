import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

import { env } from './config/env'
import { logger } from './lib/logger'
import { webhookRouter } from './routes/webhook'
import { eventsRouter } from './routes/events'
import { auditRouter } from './routes/audit'
import { errorHandler } from './middleware/error-handler'

const app = express()

app.use(cors())
app.use(helmet())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/webhook', webhookRouter)
app.use('/events', eventsRouter)
app.use('/audit', auditRouter)

app.use(errorHandler)

const httpServer = createServer(app)
export const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
})

io.on('connection', (socket) => {
  logger.info(`[socket.io] client connected: ${socket.id}`)
})

httpServer.listen(env.PORT, () => {
  logger.info(`RevenueRadar API listening on port ${env.PORT}`)
})
