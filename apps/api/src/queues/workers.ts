import { Worker, Job } from 'bullmq'
import type { LeakageEvent } from '@revenue-radar/shared'
import { QUEUE_NAMES } from '@revenue-radar/shared'
import { connection, agentActionsQueue } from './index'
import { logger } from '../lib/logger'
import { triage } from '../orchestrator'

export function startWorkers(): void {
  const leakageEventsWorker = new Worker(
    QUEUE_NAMES.LEAKAGE_EVENTS,
    async (job: Job<LeakageEvent>) => {
      const event = job.data
      logger.info(`Processing leakage event: ${event.type} for ₹${event.rupeeAmount}`)

      const triageResult = await triage(event)
      logger.info(`[orchestrator] triage result: ${JSON.stringify(triageResult)}`)

      await agentActionsQueue.add('agent-action', { event, triageResult }, { jobId: `${event.id}-action` })
    },
    { connection }
  )

  leakageEventsWorker.on('failed', (job, err) => {
    logger.error(`[worker:leakage-events] job ${job?.id} failed: ${err.message}`)
  })

  const agentActionsWorker = new Worker(
    QUEUE_NAMES.AGENT_ACTIONS,
    async (job) => {
      logger.info(`[worker:agent-actions:stub] processing job ${job.id}`)
    },
    { connection }
  )

  agentActionsWorker.on('failed', (job, err) => {
    logger.error(`[worker:agent-actions] job ${job?.id} failed: ${err.message}`)
  })

  logger.info('Workers started')
}
