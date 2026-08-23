<div align="center">

<br/>

<!-- Razorpay Logo -->
<img src="https://razorpay.com/favicon.ico" width="32" height="32"/>

<br/><br/>

<sup>RAZORPAY · AI REVENUE RECOVERY</sup>

<br/>

# RevenueRadar

**Multi-agent revenue recovery system**<br/>
<sub>detect · triage · recover</sub>

<br/>

![](https://img.shields.io/badge/PaymentRetryAgent-0078FF?style=flat-square&labelColor=0D1117&color=0D1117&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjQiIGN5PSI0IiByPSI0IiBmaWxsPSIjMDA3OEZGIi8+PC9zdmc+&logoWidth=8)&nbsp;![](https://img.shields.io/badge/CheckoutNudgeAgent-FF6B35?style=flat-square&labelColor=0D1117&color=0D1117&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjQiIGN5PSI0IiByPSI0IiBmaWxsPSIjRkY2QjM1Ii8+PC9zdmc+&logoWidth=8)&nbsp;![](https://img.shields.io/badge/InvoiceCollectorAgent-00C970?style=flat-square&labelColor=0D1117&color=0D1117&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgOCA4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjQiIGN5PSI0IiByPSI0IiBmaWxsPSIjMDBDOTcwIi8+PC9zdmc+&logoWidth=8)

<br/>

</div>

---

Revenue doesn't vanish in one step — it **leaks**. A payment degrades, a checkout gets abandoned, an invoice goes overdue. RevenueRadar watches all three surfaces simultaneously, scores every leak by rupee impact, and dispatches the right recovery agent automatically.

---

## How it works

```
Razorpay Webhooks
       │
       ▼
  Event Ingestion  ──  normalise · enrich · queue
       │
       ▼
  ┌─────────────────────────────────┐
  │        AI Orchestrator          │
  │  score rupee impact             │
  │  estimate recovery probability  │
  │  select intervention            │
  └──────┬──────────┬──────────┬───┘
         │          │          │
    PaymentRetry  Checkout  InvoiceCollector
      Agent        Nudge       Agent
                   Agent
         │          │          │
         └──────────┴──────────┘
                    │
             Unified Audit Trail
         detected · triaged · recovered
```

**Detect** — Webhooks stream every `payment.failed`, `checkout.abandoned`, and `invoice.overdue` event into the ingestion layer.

**Triage** — The AI Orchestrator scores each event: rupee value at risk, recovery probability, time sensitivity. Highest impact goes first.

**Dispatch** — The right sub-agent deploys with bounded permissions — max retries, cooldown windows, human escalation triggers. No double-charging. No spam.

**Recover** — Agents execute via Razorpay test-mode APIs and log every decision.

---

## The three surfaces

| Surface | The problem | Agent |
|---|---|---|
| Failed payments | Subscriptions degrading silently | `PaymentRetryAgent` |
| Abandoned checkouts | 60–70% of users drop before paying | `CheckoutNudgeAgent` |
| Overdue invoices | B2B payments sitting unpaid for weeks | `InvoiceCollectorAgent` |

---

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js |
| Job scheduling | BullMQ + Redis |
| Webhooks | Express.js |
| AI Orchestrator | Claude API |
| Payments | Razorpay test-mode APIs |
| Audit store | PostgreSQL |

---

## Setup

```bash
git clone https://github.com/abhishekck31/revenue-radar
cd revenue-radar
npm install
cp .env.example .env
# Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, ANTHROPIC_API_KEY
redis-server &
npm run dev
```

---

## Safety bounds

Every agent action is constrained — max 3 retries per payment, cooldown periods between nudges, confidence threshold before human escalation, no double-charging safeguards, full audit log before every action executes.

---

<div align="center">
<sub>Most tools solve one leak. RevenueRadar maps the whole pipe.</sub>
</div>