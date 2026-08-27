import { CreditCard, ShoppingCart, FileText, type LucideIcon } from 'lucide-react'

interface AgentSpec {
  name: string
  icon: LucideIcon
  accent: string
  accentBg: string
  eventType: string
  blurb: string
  actions: string[]
  bound: string
}

// Actions and bounds mirror the real agents in apps/api/src/agents — the landing
// page should never advertise a capability the system doesn't actually have.
const AGENTS: AgentSpec[] = [
  {
    name: 'PaymentRetryAgent',
    icon: CreditCard,
    accent: '#DC2626',
    accentBg: '#FEE2E2',
    eventType: 'PAYMENT_FAILED',
    blurb:
      'Reads the gateway error code to tell a soft decline from a hard one, then retries only what is worth retrying — and sends a fresh payment link when a retry cannot work.',
    actions: ['Immediate retry on soft declines', 'Delayed retry after a cooldown', 'Send a new Razorpay payment link'],
    bound: 'Max 3 retries · 30 min apart'
  },
  {
    name: 'CheckoutNudgeAgent',
    icon: ShoppingCart,
    accent: '#B45309',
    accentBg: '#FEF3C7',
    eventType: 'CHECKOUT_ABANDONED',
    blurb:
      'Picks the channel the customer is most likely to answer on, writes the nudge around the cart value, and stops before it turns into spam.',
    actions: ['Email nudge with the cart restored', 'WhatsApp nudge via Twilio', 'Both channels for high-value carts'],
    bound: 'Max 2 nudges · 2 hr cooldown'
  },
  {
    name: 'InvoiceCollectorAgent',
    icon: FileText,
    accent: '#0F766E',
    accentBg: '#CCFBF1',
    eventType: 'INVOICE_OVERDUE',
    blurb:
      'Escalates tone with age — a polite reminder at first, firmer language as the invoice runs past due, and a hand-off to a human when nobody replies.',
    actions: ['Reminder on the first overdue days', 'Escalation as the invoice ages', 'Hand off to a human after 3 unanswered'],
    bound: 'Max 5 follow-ups · human after 3'
  }
]

export function AgentCards() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-[28px] font-extrabold tracking-tight text-rzp-text sm:text-[32px]">
            Three surfaces. One system.
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-relaxed text-rzp-text-secondary">
            Most tools watch one leak. RevenueRadar watches all three at once, ranks them by rupees at risk, and dispatches
            the specialist that fits.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {AGENTS.map(({ name, icon: Icon, accent, accentBg, eventType, blurb, actions, bound }) => (
            <article key={name} className="agent-card flex flex-col">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: accentBg }}
                >
                  <Icon size={16} style={{ color: accent }} strokeWidth={2.2} />
                </div>
                <h3 className="text-[16px] font-bold tracking-tight text-rzp-text">{name}</h3>
              </div>

              <span
                className="mono mt-3 self-start rounded-full px-2.5 py-1 text-[10px] font-medium"
                style={{ color: accent, backgroundColor: accentBg }}
              >
                {eventType}
              </span>

              <p className="mt-4 text-[13px] leading-relaxed text-rzp-text-secondary">{blurb}</p>

              <ul className="mt-5 space-y-2">
                {actions.map((action) => (
                  <li key={action} className="flex gap-2 text-[13px] text-rzp-text">
                    <span className="select-none font-bold text-rzp-blue">&rarr;</span>
                    {action}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex-1" />

              <div className="border-t border-rzp-border pt-3">
                <p className="mono text-[11px] text-rzp-text-muted">{bound}</p>
                <p className="mt-1 text-[11px] text-rzp-text-muted">Built on Razorpay APIs</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
