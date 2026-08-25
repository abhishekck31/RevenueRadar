import { Worker } from 'bullmq'
import { QUEUE_NAMES } from '@revenue-radar/shared'
import { connection } from './index'
import { logger } from '../lib/logger'

export function registerWorkers(): Worker[] {
  const leakageEventsWorker = new Worker(
    QUEUE_NAMES.LEAKAGE_EVENTS,
    async (job) => {
      logger.info(`[worker:leakage-events:stub] processing job ${job.id}`)
    },
    { connection }
  )

  const agentActionsWorker = new Worker(
    QUEUE_NAMES.AGENT_ACTIONS,
    async (job) => {
      logger.info(`[worker:agent-actions:stub] processing job ${job.id}`)
    },
    { connection }
  )

  const notificationsWorker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      logger.info(`[worker:notifications:stub] processing job ${job.id}`)
    },
    { connection }
  )

  const auditWorker = new Worker(
    QUEUE_NAMES.AUDIT,
    async (job) => {
      logger.info(`[worker:audit:stub] processing job ${job.id}`)
    },
    { connection }
  )

  return [leakageEventsWorker, agentActionsWorker, notificationsWorker, auditWorker]
}
