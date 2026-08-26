<div align="center"> 

<img src="https://razorpay.com/favicon.ico" width="40" height="40" alt="Razorpay" />

# RevenueRadar

**Multi-agent AI system for revenue leakage detection and recovery**

[Overview](#overview) · [How It Works](#how-it-works) · [Architecture](#architecture) · [Tech Stack](#tech-stack) · [Project Structure](#project-structure) · [Quick Start](#quick-start) · [Safety Bounds](#safety-bounds)

Built for the Razorpay AI Buildathon.

</div>

---

## Overview

Revenue rarely disappears in one step — it leaks, across several surfaces at once. A card payment fails silently. A checkout is abandoned before the last step. An invoice goes unpaid for weeks. Handled separately, each of these is a minor operational task. Left unmonitored, together they compound into real, ongoing revenue loss.

RevenueRadar watches all three surfaces continuously, scores every detected event by rupee impact and recovery probability, and dispatches a purpose-built recovery agent for each case — within strict, auditable limits.

| Surface | Problem | Recovery Agent |
| --- | --- | --- |
| Failed Payments | Recurring or one-time payments failing due to transient card or network issues | `PaymentRetryAgent` |
| Abandoned Checkouts | Customers dropping off before completing checkout | `CheckoutNudgeAgent` |
| Overdue Invoices | B2B invoices going unpaid past their due date | `InvoiceCollectorAgent` |

---

## How It Works

1. **Detect** — Razorpay webhooks for `payment.failed`, checkout abandonment, and invoice overdue events are received, verified, and normalized into a common `LeakageEvent` type.
2. **Triage** — An AI orchestrator, backed by the Claude API, scores each event by rupee amount at risk, recovery probability, and time decay, then selects the appropriate recovery agent.
3. **Dispatch** — The selected agent acts under hard-coded stopping rules: capped retry counts, cooldown windows, and a minimum confidence threshold below which the event is escalated to a human instead of acted on.
4. **Recover** — Agents execute recovery actions against Razorpay test-mode APIs and send customer notifications by email or WhatsApp.
5. **Audit** — Every decision and action is written to an immutable audit trail before execution, giving a full record of what was detected, why an action was chosen, and what happened.

---

## Architecture

The source lives at [`docs/architecture.mmd`](docs/architecture.mmd) — paste it into [Excalidraw](https://excalidraw.com)'s Mermaid-to-Excalidraw tool (the diagram icon in the left toolbar) for a fully editable native Excalidraw version.

```mermaid
%%{init: {"flowchart": {"curve": "basis"}, "themeVariables": {"fontSize": "16px", "fontFamily": "Trebuchet MS, Verdana, Arial, sans-serif", "clusterBkg": "#FAFAF7", "clusterBorder": "#B8B5AC", "edgeLabelBackground": "#ffffff", "lineColor": "#5A5A5A"}} }%%
flowchart TD
    subgraph Frontend["Frontend"]
        Dashboard["Dashboard (Next.js)<br/>live metrics · audit log · agent status"]
        Simulator["Webhook Simulator<br/>fire test events · demo mode"]
    end

    subgraph Backend["Backend"]
        API["Express API<br/>REST · WebSocket · auth"]
        Receiver["Webhook Receiver<br/>Razorpay events → queue"]
    end

    Orchestrator["AI Orchestrator (Claude API)<br/>score rupee impact · pick agent · decide intervention"]

    subgraph Agents["Agents"]
        Payment["PaymentRetryAgent<br/>diagnose · retry · backoff"]
        Checkout["CheckoutNudgeAgent<br/>detect · craft nudge · send"]
        Invoice["InvoiceCollectorAgent<br/>follow-up · escalate · log"]
    end

    subgraph Notifications["Notifications"]
        Razorpay["Razorpay API"]
        Mailer["Nodemailer"]
        Twilio["Twilio WhatsApp"]
        AuditLog["Audit logger"]
    end

    subgraph Infra["Infrastructure"]
        Postgres["PostgreSQL<br/>audit trail · events"]
        Redis["Redis + BullMQ<br/>queues · scheduling"]
        Prisma["Prisma ORM<br/>schema · migrations"]
    end

    Dashboard --> API
    Simulator --> Receiver
    API --> Receiver
    API --> Orchestrator
    Receiver --> Orchestrator

    Orchestrator --> Payment
    Orchestrator --> Checkout
    Orchestrator --> Invoice

    Payment --> Razorpay
    Checkout --> Mailer
    Checkout --> Twilio
    Invoice --> AuditLog

    Payment -.-> Redis
    Checkout -.-> Redis
    Invoice -.-> Redis
    Redis -.-> Postgres
    Redis -.-> Prisma

    classDef frontend fill:#E1F5EE,stroke:#0F6E56,stroke-width:2.5px,color:#0A2E27,font-weight:bold;
    classDef backend fill:#E6F1FB,stroke:#185FA5,stroke-width:2.5px,color:#0C2E4D,font-weight:bold;
    classDef orch fill:#EEEDFE,stroke:#534AB7,stroke-width:2.5px,color:#241F5C,font-weight:bold;
    classDef payment fill:#E6F1FB,stroke:#185FA5,stroke-width:2.5px,color:#0C2E4D,font-weight:bold;
    classDef checkout fill:#FAECE7,stroke:#993C1D,stroke-width:2.5px,color:#4D1E0E,font-weight:bold;
    classDef invoice fill:#E1F5EE,stroke:#0F6E56,stroke-width:2.5px,color:#0A2E27,font-weight:bold;
    classDef infra fill:#F1EFE8,stroke:#5F5E5A,stroke-width:2.5px,color:#2B2A28,font-weight:bold;

    class Dashboard,Simulator frontend;
    class API,Receiver backend;
    class Orchestrator orch;
    class Payment payment;
    class Checkout checkout;
    class Invoice invoice;
    class Razorpay,Mailer,Twilio,AuditLog,Postgres,Redis,Prisma infra;
```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 20, TypeScript (strict mode) |
| Backend | Express.js |
| AI Orchestrator | Claude API |
| Queueing | BullMQ, backed by Redis |
| Database | PostgreSQL, accessed via Prisma ORM |
| Notifications | Nodemailer (email), Twilio (WhatsApp) |
| Frontend | Next.js (App Router), Tailwind CSS |
| Payments | Razorpay test-mode APIs |
| Validation | Zod |
| Logging | Winston |

---

## Project Structure

```
revenue-radar/
├── apps/
│   ├── api/            Express backend, orchestrator, and agents
│   │   └── src/
│   │       ├── agents/         PaymentRetryAgent, CheckoutNudgeAgent, InvoiceCollectorAgent
│   │       ├── orchestrator/   Claude-driven event triage
│   │       ├── queues/         BullMQ queue and worker definitions
│   │       ├── routes/         Webhook receiver, events, audit endpoints
│   │       ├── services/       Razorpay, notification, and audit services
│   │       ├── middleware/
│   │       └── config/
│   └── web/             Next.js dashboard
│       └── app/
│           ├── page.tsx         Overview
│           ├── events/          Live event feed
│           ├── audit/           Audit trail
│           └── simulate/        Webhook simulator
├── packages/
│   └── shared/          Shared types and constants
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
└── .env.example
```

---

## Quick Start

**Prerequisites:** Node.js 20+, Docker

```bash
# 1. Clone
git clone https://github.com/abhishekck31/revenue-radar
cd revenue-radar

# 2. Setup (installs deps, starts DB, seeds data)
make setup

# 3. Add your API keys to .env
# Required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, ANTHROPIC_API_KEY
# Optional for full demo: SMTP_*, TWILIO_*
nano .env

# 4. Start development
make dev

# Open:
# Dashboard → http://localhost:3000
# API       → http://localhost:3001
# DB Studio → npx prisma studio
```

**Or run everything in Docker:**
```bash
make docker
```

`make` not installed (e.g. on Windows without WSL)? Run the underlying commands directly — see the [Makefile](Makefile).

---

## Safety Bounds

RevenueRadar's agents operate under fixed limits that cannot be bypassed at runtime:

- `PaymentRetryAgent` — maximum 3 retries per payment, minimum 30 minutes between attempts
- `CheckoutNudgeAgent` — maximum 2 nudges per abandoned checkout, 2-hour cooldown
- `InvoiceCollectorAgent` — maximum 5 follow-ups, escalates to a human after 3 unanswered
- Any triage decision with confidence below 0.6 is escalated to a human rather than executed
- Every action is written to the audit trail before it runs

---

<div align="center">
<sub>Most tools solve one leak. RevenueRadar maps the whole pipe.</sub>
</div>
