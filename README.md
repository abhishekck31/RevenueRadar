<div align="center">

<!-- Animated Banner SVG -->
<img src="assets/banner.svg" alt="RevenueRadar Banner" width="100%"/>

<br/>

<!-- Razorpay Buildathon Badge -->
<a href="https://razorpay.com/buildathon/">
  <img src="https://img.shields.io/badge/Razorpay-AI%20Buildathon%202026-1A1A2E?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDdWMTdMMTIgMjJMMjAgMTdWN0wxMiAyWiIgZmlsbD0iIzAyOEZGRiIvPjwvc3ZnPg==&logoColor=028FFF&labelColor=0D0D0D"/>
</a>
<a href="#">
  <img src="https://img.shields.io/badge/Track-AI%20Revenue%20Recovery-028FFF?style=for-the-badge&labelColor=0D0D0D"/>
</a>
<a href="#">
  <img src="https://img.shields.io/badge/Stack-Node.js%20%7C%20Multi--Agent-00D26A?style=for-the-badge&labelColor=0D0D0D"/>
</a>
<a href="#">
  <img src="https://img.shields.io/badge/APIs-Razorpay%20Test%20Mode-FF6B35?style=for-the-badge&labelColor=0D0D0D"/>
</a>

<br/><br/>

<!-- Tagline -->
### 💸 Revenue doesn't just disappear. It leaks — slowly, silently, across three surfaces at once.
### RevenueRadar finds it. Triages it. Recovers it.

<br/>

</div>

---

## 🧠 What Is This?

RevenueRadar is a **multi-agent AI system** built on Razorpay's test-mode APIs that monitors a merchant's full revenue pipeline, detects leakage across three failure surfaces simultaneously, and dispatches specialized recovery agents — prioritized by rupee impact.

Most recovery tools solve one problem. RevenueRadar solves all three:

| Surface | The Problem | The Agent |
|---|---|---|
| 💳 Failed Payments | Subscriptions degrade silently | `PaymentRetryAgent` |
| 🛒 Abandoned Checkouts | 60-70% of users drop before paying | `CheckoutNudgeAgent` |
| 📄 Overdue Invoices | B2B invoices sit unpaid for weeks | `InvoiceCollectorAgent` |

At the center of it all: an **AI Orchestrator** that triages every detected event by rupee value, recovery probability, and time sensitivity — and decides which agent to deploy, when, and with what action.

---

## 🏗️ Architecture

```
                        ┌─────────────────────────────────┐
                        │        RAZORPAY WEBHOOKS         │
                        │  payment.failed  |  checkout.*   │
                        │  invoice.overdue |  subscription.*│
                        └────────────────┬────────────────┘
                                         │
                                         ▼
                        ┌─────────────────────────────────┐
                        │         EVENT INGESTION          │
                        │   Normalise → Enrich → Queue     │
                        └────────────────┬────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │         🧠 AI ORCHESTRATOR             │
                     │                                        │
                     │  • Score rupee impact                  │
                     │  • Estimate recovery probability       │
                     │  • Detect time sensitivity             │
                     │  • Select best intervention            │
                     │  • Dispatch sub-agent                  │
                     └──────┬──────────────┬────────┬────────┘
                            │              │        │
               ┌────────────▼──┐  ┌────────▼───┐  ┌▼──────────────────┐
               │ PaymentRetry  │  │  Checkout  │  │  InvoiceCollector  │
               │    Agent      │  │   Nudge    │  │      Agent         │
               │               │  │   Agent    │  │                    │
               │ • Diagnose    │  │ • Detect   │  │ • Draft follow-up  │
               │   failure     │  │   cause    │  │ • Escalate         │
               │ • Pick retry  │  │ • Craft    │  │ • Promise-to-pay   │
               │   window      │  │   nudge    │  │   tracker          │
               │ • Execute     │  │ • Send at  │  │ • Log touchpoints  │
               │   with limits │  │   best time│  │                    │
               └──────┬────────┘  └─────┬──────┘  └────────┬───────────┘
                      │                 │                   │
                      └────────────┬────┘───────────────────┘
                                   │
                                   ▼
                     ┌─────────────────────────────┐
                     │      UNIFIED AUDIT TRAIL     │
                     │  detected → triaged → acted  │
                     │  → outcome → rupees recovered│
                     └─────────────────────────────┘
```

---

## ⚡ How It Works

**Step 1 — Detect**
Razorpay webhooks stream events into the ingestion layer. Every `payment.failed`, `checkout.abandoned`, and `invoice.overdue` event is captured, normalised, and queued.

**Step 2 — Triage**
The AI Orchestrator scores each event: *How much rupee value is at risk? How likely is recovery? How time-sensitive is the intervention?* High-impact, high-probability events get dispatched first.

**Step 3 — Dispatch**
The right sub-agent is deployed with bounded permissions — max retries, cooldown periods, human escalation triggers. No double-charging. No spam. Every action is explainable.

**Step 4 — Recover**
Each agent executes its recovery playbook via Razorpay APIs — retrying payments at optimal windows, sending personalized nudges, drafting invoice follow-ups with escalating urgency.

**Step 5 — Audit**
Every decision is logged: what was detected, triage score, agent dispatched, action taken, reason, and outcome. Full audit trail. Always.

---

## 📊 What Gets Measured

```
Total Revenue at Risk Detected     ₹ xxxxxxx
├── Failed Payments                ₹ xxxxxxx  (xx events)
├── Abandoned Checkouts            ₹ xxxxxxx  (xx events)
└── Overdue Invoices               ₹ xxxxxxx  (xx events)

Total Recovered                    ₹ xxxxxxx  (xx.x% recovery rate)
├── PaymentRetryAgent              ₹ xxxxxxx  (xx% success)
├── CheckoutNudgeAgent             ₹ xxxxxxx  (xx% success)
└── InvoiceCollectorAgent          ₹ xxxxxxx  (xx% success)

Avg Time to Recovery               xx minutes
Escalated to Human                 xx events
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Job Scheduling | Bull / BullMQ (Redis-backed) |
| Webhook Server | Express.js |
| AI Orchestrator | Claude API (claude-sonnet-4-6) |
| Payment APIs | Razorpay Test-Mode APIs |
| Audit Store | PostgreSQL |
| Queue | Redis |

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/abhishekck31/revenue-radar
cd revenue-radar

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your Razorpay test keys and Claude API key

# Start Redis
redis-server

# Run the agent
npm run dev
```

---

## 🔐 Safety & Bounds

Every agent action is constrained:
- **Max 3 retry attempts** per failed payment with exponential backoff
- **Cooldown periods** between nudges — no customer spam
- **Confidence threshold** — low-confidence decisions escalate to human
- **No double-charging** safeguards on every payment action
- **Full audit trail** — every action logged before execution

---

<div align="center">

---

**Built for Razorpay AI Buildathon 2026 · AI Revenue Recovery Track**

*The difference: most tools detect one leak. RevenueRadar maps the whole pipe.*

<img src="https://img.shields.io/badge/Applications%20Close-5%20September%202026-FF6B35?style=flat-square&labelColor=0D0D0D"/>

</div>