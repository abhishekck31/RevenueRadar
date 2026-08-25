import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { QUEUE_NAMES } from '@revenue-radar/shared'
import { env } from '../config/env'

export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })

export const leakageEventsQueue = new Queue(QUEUE_NAMES.LEAKAGE_EVENTS, { connection })
export const agentActionsQueue = new Queue(QUEUE_NAMES.AGENT_ACTIONS, { connection })
export const notificationsQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection })
export const auditQueue = new Queue(QUEUE_NAMES.AUDIT, { connection })
