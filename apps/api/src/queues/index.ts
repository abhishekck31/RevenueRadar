import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { QUEUE_NAMES } from '@revenue-radar/shared'
import { env } from '../config/env'

export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 50
}

const queueOpts = { connection, defaultJobOptions }

export const leakageEventsQueue = new Queue(QUEUE_NAMES.LEAKAGE_EVENTS, queueOpts)
export const agentActionsQueue = new Queue(QUEUE_NAMES.AGENT_ACTIONS, queueOpts)
export const notificationsQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, queueOpts)
export const auditQueue = new Queue(QUEUE_NAMES.AUDIT, queueOpts)
