import { Worker, Job } from 'bullmq'
import type { Server as SocketIOServer } from 'socket.io'
import type { LeakageEvent, TriageResult } from '@revenue-radar/shared'
import { QUEUE_NAMES, STOPPING_RULES } from '@revenue-radar/shared'
import { connection, agentActionsQueue } from './index'
import { logger } from '../lib/logger'
import { triage } from '../orchestrator'
import { createTriageAudit, recordDailyMetric } from '../services/audit'
import { dispatchAgent } from '../agents/dispatcher'

let io: SocketIOServer | undefined

export function setSocketIO(instance: SocketIOServer): void {
  io = instance
}

export function startWorkers(): void {
  const leakageEventsWorker = new Worker(
    QUEUE_NAMES.LEAKAGE_EVENTS,
    async (job: Job<LeakageEvent>) => {
      // BullMQ round-trips job data through JSON, so Date fields come back as strings.
      const event: LeakageEvent = { ...job.data, detectedAt: new Date(job.data.detectedAt) }
      logger.info(`Processing leakage event: ${event.type} for ₹${event.rupeeAmount}`)

      const triageResult = await triage(event)
      logger.info(`[orchestrator] triage result: ${JSON.stringify(triageResult)}`)

      const shouldEscalate =
        triageResult.action === 'ESCALATE_HUMAN' || triageResult.confidence < STOPPING_RULES.MIN_CONFIDENCE

      if (shouldEscalate) {
        logger.info(`Escalating to human: ${triageResult.reasoning}`)
        await createTriageAudit(event, triageResult, 'ESCALATED')
        return
      }

      const delay = triageResult.suggestedRetryAt
        ? Math.max(0, new Date(triageResult.suggestedRetryAt).getTime() - Date.now())
        : 0

      await agentActionsQueue.add(
        'agent-action',
        { event, triageResult },
        { jobId: `${event.id}-${triageResult.agentType}`, delay }
      )
    },
    { connection }
  )

  leakageEventsWorker.on('failed', (job, err) => {
    logger.error(`[worker:leakage-events] job ${job?.id} failed: ${err.message}`)
  })

  const agentActionsWorker = new Worker(
    QUEUE_NAMES.AGENT_ACTIONS,
    async (job: Job<{ event: LeakageEvent; triageResult: TriageResult }>) => {
      const rawEvent = job.data.event
      const event: LeakageEvent = { ...rawEvent, detectedAt: new Date(rawEvent.detectedAt) }
      const triageResult = job.data.triageResult

      const outcome = await dispatchAgent(event, triageResult)

      logger.info(`Agent ${triageResult.agentType} completed: ${outcome} for ₹${event.rupeeAmount}`)

      io?.emit('agent:completed', { event, triage: triageResult, outcome })

      await recordDailyMetric(triageResult.agentType, event.rupeeAmount, outcome)
    },
    { connection }
  )

  agentActionsWorker.on('failed', (job, err) => {
    logger.error(`[worker:agent-actions] job ${job?.id} failed: ${err.message}`)
  })

  logger.info('Workers started')
}
