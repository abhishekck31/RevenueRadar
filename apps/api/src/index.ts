import { env } from './config/env'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

import { corsOrigins } from './config/env'

import { logger } from './lib/logger'
import { webhookRouter } from './routes/webhook'
import { eventsRouter } from './routes/events'
import { auditRouter, metricsRouter } from './routes/audit'
import { simulateRouter } from './routes/simulate'
import { errorHandler } from './middleware/error-handler'
import { startWorkers, setSocketIO } from './queues/workers'

const app = express()
const httpServer = createServer(app)

const allowedOrigins = corsOrigins()

// Socket.io shares the API's allowlist — leaving it at '*' would let any page
// on the internet open a live feed of this merchant's revenue events.
export const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins.length > 0 ? allowedOrigins : false, credentials: true }
})

io.on('connection', (socket) => {
  logger.info(`[socket.io] client connected: ${socket.id}`)
})

// Behind ngrok or a platform load balancer the client IP arrives in
// X-Forwarded-For; without this the rate limiters would bucket every request
// under the proxy's address and throttle all users as one.
app.set('trust proxy', 1)

app.use(
  helmet({
    contentSecurityPolicy: false, // JSON API — no documents to constrain
    crossOriginEmbedderPolicy: false
  })
)

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

// Razorpay retries aggressively, so the webhook gets its own shorter window
// rather than sharing the general budget with dashboard traffic.
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded' }
})

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
})

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`)
  next()
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Mounted before express.json() — the webhook route parses its own raw body
// so it can verify the Razorpay HMAC signature against the exact bytes sent.
app.use('/webhook', webhookLimiter, webhookRouter)

// Dashboard payloads are tiny; the cap stops a large body from being buffered.
app.use(express.json({ limit: '10kb' }))

app.use('/api', generalLimiter)

app.use('/api/events', eventsRouter)
app.use('/api/audit', auditRouter)
app.use('/api/metrics', metricsRouter)
app.use('/api', simulateRouter)

app.use(errorHandler)

setSocketIO(io)
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
