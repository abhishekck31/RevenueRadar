import { env } from './config/env'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

import { logger } from './lib/logger'
import { webhookRouter } from './routes/webhook'
import { eventsRouter } from './routes/events'
import { auditRouter } from './routes/audit'
import { errorHandler } from './middleware/error-handler'
import { startWorkers } from './queues/workers'

const app = express()
const httpServer = createServer(app)

export const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
})

io.on('connection', (socket) => {
  logger.info(`[socket.io] client connected: ${socket.id}`)
})

app.use(helmet())
app.use(cors())

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`)
  next()
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Mounted before express.json() — the webhook route parses its own raw body
// so it can verify the Razorpay HMAC signature against the exact bytes sent.
app.use('/webhook', webhookRouter)

app.use(express.json())

app.use('/api/events', eventsRouter)
app.use('/api/audit', auditRouter)

app.use(errorHandler)

startWorkers()

httpServer.listen(env.PORT, () => {
  console.log(`
  ██████╗ ███████╗██╗   ██╗███████╗███╗   ██╗██╗   ██╗███████╗
  ██╔══██╗██╔════╝██║   ██║██╔════╝████╗  ██║██║   ██║██╔════╝
  ██████╔╝█████╗  ██║   ██║█████╗  ██╔██╗ ██║██║   ██║█████╗
  ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║██║   ██║██╔══╝
  ██║  ██║███████╗ ╚████╔╝ ███████╗██║ ╚████║╚██████╔╝███████╗
  ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝
  ██████╗  █████╗ ██████╗  █████╗ ██████╗
  ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗
  ██████╔╝███████║██║  ██║███████║██████╔╝
  ██╔══██╗██╔══██║██║  ██║██╔══██║██╔══██╗
  ██║  ██║██║  ██║██████╔╝██║  ██║██║  ██║
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝

  Multi-agent revenue recovery · Razorpay AI Buildathon
  API running on port ${env.PORT}
`)
})
