# RevenueRadar — Claude Code Instructions

## What this project is
Multi-agent AI system that monitors a merchant's revenue pipeline, detects leakage across three surfaces (failed payments, abandoned checkouts, overdue invoices), triages by rupee impact, and dispatches specialized recovery agents. Built for Razorpay AI Buildathon.

## Stack
- **Runtime**: Node.js 20 + TypeScript
- **Backend**: Express.js (API + webhook receiver)
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Anthropic Claude API (claude-sonnet-4-6) — orchestrator brain
- **Notifications**: Nodemailer (email) + Twilio (WhatsApp)
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Payments**: Razorpay test-mode APIs only

## Monorepo structure
```
revenue-radar/
├── apps/
│   ├── api/          # Express backend + agents
│   └── web/          # Next.js dashboard
├── packages/
│   └── shared/       # Shared types, constants, utils
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

## Architecture rules — never break these

### Agent boundaries
- Each agent (PaymentRetryAgent, CheckoutNudgeAgent, InvoiceCollectorAgent) lives in `apps/api/src/agents/`
- Agents never call each other directly — always go through the orchestrator
- Every agent action MUST be logged to the audit trail BEFORE execution
- Agents must check stopping rules before any Razorpay API call

### Orchestrator
- Lives in `apps/api/src/orchestrator/`
- Uses Claude API to score events and decide which agent to dispatch
- Scoring formula: `score = (rupeeAmount * recoveryProbability) / timeDecayFactor`
- Always returns structured JSON with: `{ agentType, action, confidence, reasoning, rupeeAtRisk }`

### Stopping rules (hard limits — never bypass)
- PaymentRetryAgent: max 3 retries per payment, min 30min between retries
- CheckoutNudgeAgent: max 2 nudges per abandoned checkout, 2hr cooldown
- InvoiceCollectorAgent: max 5 follow-ups, escalate to human after 3 unanswered
- If confidence < 0.6, escalate to human instead of executing

### Audit trail
- Every event must have: `eventId, eventType, detectedAt, rupeeAmount, agentDispatched, actionTaken, reasoning, outcome, timestamp`
- Use Prisma for all DB operations — no raw SQL
- Audit records are immutable — never update, only insert

### Webhook handling
- Validate Razorpay webhook signature on every request
- Normalize all events to internal `LeakageEvent` type before queuing
- Dead letter queue for failed processing

### Error handling
- All agent actions wrapped in try/catch
- Failed actions logged to audit trail with error details
- Never throw unhandled rejections — always graceful degradation

## Key types (always use these, never redefine)

```typescript
// packages/shared/src/types.ts

export type LeakageType = 'PAYMENT_FAILED' | 'CHECKOUT_ABANDONED' | 'INVOICE_OVERDUE'
export type AgentType = 'PaymentRetryAgent' | 'CheckoutNudgeAgent' | 'InvoiceCollectorAgent'
export type ActionStatus = 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'ESCALATED'
export type OutcomeType = 'RECOVERED' | 'FAILED' | 'ESCALATED' | 'STOPPED'

export interface LeakageEvent {
  id: string
  type: LeakageType
  merchantId: string
  rupeeAmount: number
  customerId?: string
  customerEmail?: string
  customerPhone?: string
  metadata: Record<string, unknown>
  detectedAt: Date
  rawWebhookPayload: Record<string, unknown>
}

export interface TriageResult {
  eventId: string
  agentType: AgentType
  action: string
  confidence: number
  reasoning: string
  rupeeAtRisk: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface AuditEntry {
  id: string
  eventId: string
  eventType: LeakageType
  agentType: AgentType
  actionTaken: string
  reasoning: string
  rupeeAtRisk: number
  status: ActionStatus
  outcome?: OutcomeType
  outcomeDetail?: string
  executedAt: Date
  completedAt?: Date
}
```

## Environment variables needed
```
# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Anthropic
ANTHROPIC_API_KEY=

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/revenue_radar

# Redis
REDIS_URL=redis://localhost:6379

# Email (Nodemailer)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=

# App
PORT=3001
NODE_ENV=development
JWT_SECRET=
```

## Prisma schema (reference)
```prisma
model LeakageEvent {
  id              String      @id @default(cuid())
  type            String
  merchantId      String
  rupeeAmount     Float
  customerId      String?
  customerEmail   String?
  customerPhone   String?
  metadata        Json
  rawPayload      Json
  detectedAt      DateTime    @default(now())
  auditEntries    AuditEntry[]
}

model AuditEntry {
  id            String        @id @default(cuid())
  eventId       String
  event         LeakageEvent  @relation(fields: [eventId], references: [id])
  agentType     String
  actionTaken   String
  reasoning     String
  rupeeAtRisk   Float
  status        String
  outcome       String?
  outcomeDetail String?
  executedAt    DateTime      @default(now())
  completedAt   DateTime?
}

model RecoveryMetric {
  id              String    @id @default(cuid())
  date            DateTime  @default(now())
  totalAtRisk     Float
  totalRecovered  Float
  paymentRetried  Int
  nudgesSent      Int
  invoicesFollowedUp Int
  recoveryRate    Float
}
```

## Claude API usage pattern
```typescript
// Always use this pattern for the orchestrator
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: `You are the RevenueRadar orchestrator. Your job is to triage revenue leakage events and decide the optimal recovery action. Always respond in valid JSON only. No prose.`,
  messages: [{
    role: 'user',
    content: `Triage this leakage event: ${JSON.stringify(event)}`
  }]
})
```

## BullMQ queue names
- `leakage-events` — incoming events to triage
- `agent-actions` — dispatched agent jobs
- `notifications` — email/WhatsApp sends
- `audit` — audit trail writes (separate queue for reliability)

## Dashboard pages
- `/` — overview: total at risk, recovered today, recovery rate, active agents
- `/events` — live event feed with leakage type, amount, status
- `/audit` — full audit trail table, filterable by agent and outcome
- `/simulate` — webhook event simulator for demo

## What to build first (in order)
1. Project scaffold + docker-compose
2. Prisma schema + migrations
3. Shared types package
4. Express server + webhook receiver
5. BullMQ setup + event normalizer
6. AI Orchestrator (Claude API)
7. PaymentRetryAgent
8. CheckoutNudgeAgent
9. InvoiceCollectorAgent
10. Notification service (email + WhatsApp)
11. Audit trail service
12. Next.js dashboard
13. WebSocket for live updates
14. Webhook simulator

## Code style
- TypeScript strict mode always
- Async/await, no callbacks
- Zod for all input validation
- Winston for logging
- Never use `any` type
- Export named exports only, no default exports
- File naming: kebab-case for files, PascalCase for classes