import path from 'path'
import dotenv from 'dotenv'
import { PrismaClient, type Prisma } from '@prisma/client'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

const MERCHANT_ID = 'merchant_demo_razorpay'

type LeakType = 'PAYMENT_FAILED' | 'CHECKOUT_ABANDONED' | 'INVOICE_OVERDUE'
type AgentType = 'PaymentRetryAgent' | 'CheckoutNudgeAgent' | 'InvoiceCollectorAgent'
type Outcome = 'RECOVERED' | 'FAILED' | 'ESCALATED'

interface EventSpec {
  type: LeakType
  agentType: AgentType
  actionTaken: string
  outcome: Outcome
  amountRange: [number, number]
}

const customers = [
  { email: 'priya.sharma@gmail.com', phone: '+919876543210' },
  { email: 'rahul.verma@company.in', phone: '+919845678901' },
  { email: 'sneha.k@startup.io', phone: '+918765432109' },
  { email: 'amit.patel@business.com', phone: '+917654321098' },
  { email: 'divya.nair@enterprise.co', phone: '+916543210987' },
  { email: 'karan.mehta@tech.com', phone: '+915432109876' }
]

const reasonings: Record<LeakType, string[]> = {
  PAYMENT_FAILED: [
    'GATEWAY_ERROR on recent subscription — high retry success rate, executing immediate retry',
    'Card expired — sending payment link for customer to update payment method',
    'SERVER_ERROR detected 20 minutes ago — optimal retry window, high confidence',
    'BAD_REQUEST_ERROR with 2 prior attempts — escalating to human review',
    'Transient bank decline — scheduling retry for next morning 9am window'
  ],
  CHECKOUT_ABANDONED: [
    'Customer dropped at UPI step — sending WhatsApp nudge with payment link',
    'High-value cart abandoned — sending email + WhatsApp with personalized message',
    'Price-point abandon detected — nudging with email, phone not available',
    'Repeat visitor abandoned — high conversion probability, sending both channels'
  ],
  INVOICE_OVERDUE: [
    'First follow-up on overdue invoice — sending gentle payment reminder',
    'Second follow-up, 15 days overdue — escalating tone in follow-up message',
    'Invoice 30+ days overdue, no response — escalating to human collections team',
    'Customer previously responded — sending promise-to-pay follow-up'
  ]
}

function repeat(spec: EventSpec, count: number): EventSpec[] {
  return Array.from({ length: count }, () => ({ ...spec }))
}

const specs: EventSpec[] = [
  // 12 PAYMENT_FAILED
  ...repeat({ type: 'PAYMENT_FAILED', agentType: 'PaymentRetryAgent', actionTaken: 'IMMEDIATE_RETRY', outcome: 'RECOVERED', amountRange: [499, 9999] }, 5),
  ...repeat({ type: 'PAYMENT_FAILED', agentType: 'PaymentRetryAgent', actionTaken: 'SEND_PAYMENT_LINK', outcome: 'RECOVERED', amountRange: [499, 9999] }, 4),
  ...repeat({ type: 'PAYMENT_FAILED', agentType: 'PaymentRetryAgent', actionTaken: 'ESCALATE_HUMAN', outcome: 'ESCALATED', amountRange: [499, 9999] }, 2),
  ...repeat({ type: 'PAYMENT_FAILED', agentType: 'PaymentRetryAgent', actionTaken: 'SEND_PAYMENT_LINK', outcome: 'FAILED', amountRange: [499, 9999] }, 1),

  // 10 CHECKOUT_ABANDONED
  ...repeat({ type: 'CHECKOUT_ABANDONED', agentType: 'CheckoutNudgeAgent', actionTaken: 'SEND_BOTH', outcome: 'RECOVERED', amountRange: [299, 4999] }, 4),
  ...repeat({ type: 'CHECKOUT_ABANDONED', agentType: 'CheckoutNudgeAgent', actionTaken: 'SEND_EMAIL_NUDGE', outcome: 'RECOVERED', amountRange: [299, 4999] }, 3),
  ...repeat({ type: 'CHECKOUT_ABANDONED', agentType: 'CheckoutNudgeAgent', actionTaken: 'SEND_BOTH', outcome: 'FAILED', amountRange: [299, 4999] }, 2),
  ...repeat({ type: 'CHECKOUT_ABANDONED', agentType: 'CheckoutNudgeAgent', actionTaken: 'ESCALATE_HUMAN', outcome: 'ESCALATED', amountRange: [299, 4999] }, 1),

  // 8 INVOICE_OVERDUE
  ...repeat({ type: 'INVOICE_OVERDUE', agentType: 'InvoiceCollectorAgent', actionTaken: 'SEND_REMINDER', outcome: 'RECOVERED', amountRange: [5000, 99999] }, 3),
  ...repeat({ type: 'INVOICE_OVERDUE', agentType: 'InvoiceCollectorAgent', actionTaken: 'SEND_ESCALATION', outcome: 'RECOVERED', amountRange: [5000, 99999] }, 2),
  ...repeat({ type: 'INVOICE_OVERDUE', agentType: 'InvoiceCollectorAgent', actionTaken: 'ESCALATE_HUMAN', outcome: 'ESCALATED', amountRange: [5000, 99999] }, 2),
  ...repeat({ type: 'INVOICE_OVERDUE', agentType: 'InvoiceCollectorAgent', actionTaken: 'SEND_REMINDER', outcome: 'FAILED', amountRange: [5000, 99999] }, 1)
]

function randomAmount([min, max]: [number, number]): number {
  return Math.round(min + Math.random() * (max - min))
}

// Mirrors the orchestrator's own bands: escalations sit near the 0.6 stopping-rule
// threshold, successful recoveries land high, failures in between.
function confidenceFor(outcome: Outcome): number {
  const base = outcome === 'RECOVERED' ? 0.82 + Math.random() * 0.15 : outcome === 'ESCALATED' ? 0.38 + Math.random() * 0.2 : 0.62 + Math.random() * 0.16
  return Number(base.toFixed(2))
}

// score = (rupeeAmount * recoveryProbability) / timeDecayFactor  — per CLAUDE.md
function triageScoreFor(type: LeakType, amount: number): { score: number; priority: string } {
  const recoveryProbability = type === 'PAYMENT_FAILED' ? 0.8 : type === 'CHECKOUT_ABANDONED' ? 0.25 : 0.55
  const timeDecayFactor = [1.0, 1.5, 2.5, 4.0][Math.floor(Math.random() * 4)]
  const score = Number(((amount * recoveryProbability) / timeDecayFactor).toFixed(2))
  const priority = score > 5000 ? 'HIGH' : score >= 1000 ? 'MEDIUM' : 'LOW'
  return { score, priority }
}

function randomDetectedAt(): Date {
  return new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
}

function metadataFor(type: LeakType, index: number): Record<string, unknown> {
  switch (type) {
    case 'PAYMENT_FAILED':
      return {
        paymentId: `pay_sim_${index}`,
        orderId: `order_sim_${index}`,
        errorCode: 'GATEWAY_ERROR',
        errorReason: 'GATEWAY_ERROR',
        attempts: 1 + (index % 3)
      }
    case 'CHECKOUT_ABANDONED':
      return {
        paymentLinkId: `plink_sim_${index}`,
        description: 'Abandoned checkout'
      }
    case 'INVOICE_OVERDUE':
      return {
        invoiceId: `inv_sim_${index}`,
        invoiceNumber: `INV-2024-${String(100 + index).padStart(3, '0')}`,
        dueDate: new Date(Date.now() - (3 + (index % 20)) * 24 * 60 * 60 * 1000).toISOString()
      }
  }
}

async function main() {
  console.log('🌱 Seeding RevenueRadar...')

  // ── Clear existing data ──────────────────────────────────────
  await prisma.auditEntry.deleteMany()
  await prisma.leakageEvent.deleteMany()
  await prisma.recoveryMetric.deleteMany()

  const reasoningCounter: Record<LeakType, number> = { PAYMENT_FAILED: 0, CHECKOUT_ABANDONED: 0, INVOICE_OVERDUE: 0 }

  let totalAtRisk = 0
  let totalRecovered = 0
  let paymentRetried = 0
  let nudgesSent = 0
  let invoicesFollowedUp = 0

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]
    const customer = customers[i % customers.length]
    const amount = randomAmount(spec.amountRange)
    const detectedAt = randomDetectedAt()
    const executedAt = new Date(detectedAt.getTime() + (2 + Math.random() * 38) * 60 * 1000)
    const completedAt = new Date(executedAt.getTime() + (1 + Math.random() * 14) * 60 * 1000)

    const reasoningList = reasonings[spec.type]
    const reasoning = reasoningList[reasoningCounter[spec.type] % reasoningList.length]
    reasoningCounter[spec.type] += 1

    const event = await prisma.leakageEvent.create({
      data: {
        type: spec.type,
        merchantId: MERCHANT_ID,
        rupeeAmount: amount,
        customerId: `cust_${(i % customers.length) + 1}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        metadata: metadataFor(spec.type, i) as Prisma.InputJsonValue,
        rawPayload: { simulated: true, source: 'seed' } as Prisma.InputJsonValue,
        detectedAt
      }
    })

    const status = spec.outcome === 'RECOVERED' ? 'SUCCESS' : spec.outcome
    const outcomeDetail =
      spec.outcome === 'FAILED'
        ? 'Recovery attempt did not go through — customer did not complete payment'
        : spec.outcome === 'ESCALATED'
          ? 'Escalated to human review after stopping-rule threshold'
          : `Action ${spec.actionTaken} completed successfully`

    const { score, priority } = triageScoreFor(spec.type, amount)

    await prisma.auditEntry.create({
      data: {
        eventId: event.id,
        agentType: spec.agentType,
        actionTaken: spec.actionTaken,
        reasoning,
        rupeeAtRisk: amount,
        confidence: confidenceFor(spec.outcome),
        triageScore: score,
        priority,
        status,
        outcome: spec.outcome,
        outcomeDetail,
        executedAt,
        completedAt
      }
    })

    totalAtRisk += amount
    if (spec.outcome === 'RECOVERED') totalRecovered += amount
    if (spec.agentType === 'PaymentRetryAgent') paymentRetried += 1
    if (spec.agentType === 'CheckoutNudgeAgent') nudgesSent += 1
    if (spec.agentType === 'InvoiceCollectorAgent') invoicesFollowedUp += 1
  }

  // ── RecoveryMetric ────────────────────────────────────────────
  await prisma.recoveryMetric.create({
    data: {
      date: new Date(),
      totalAtRisk,
      totalRecovered,
      paymentRetried,
      nudgesSent,
      invoicesFollowedUp,
      recoveryRate: totalAtRisk > 0 ? totalRecovered / totalAtRisk : 0
    }
  })

  console.log('✅ Seeded:')
  console.log(`   ${specs.length} leakage events (7 days)`)
  console.log(`   ${specs.length} audit entries`)
  console.log('   1 recovery metric record')
  console.log('')
  console.log('📊 Dashboard: http://localhost:3000')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
