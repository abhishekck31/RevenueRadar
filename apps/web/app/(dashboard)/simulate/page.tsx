'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, X, Loader2, UserRound, CreditCard, ShoppingCart, FileText } from 'lucide-react'
import { simulateEvent } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { formatRupees, formatTime, AGENT_SHORT } from '@/lib/format'

const PIPELINE_STEPS = ['Event Fired', 'Received', 'Queued', 'Orchestrator', 'Agent', 'Recovered'] as const
const STEP_DELAY_MS = 800
const PIPELINE_TIMEOUT_MS = 20000

type SimType = 'payment_failed' | 'checkout_abandoned' | 'invoice_overdue'
type StepState = 'pending' | 'active' | 'done' | 'failed' | 'escalated'
type Terminal = 'success' | 'failed' | 'escalated'

interface PipelineState {
  eventId: string
  stepIndex: number
  status: 'running' | Terminal
  details: Partial<Record<number, string>>
}

interface LogEntry {
  id: string
  type: SimType
  amount: number
  firedAt: number
  status: 'pending' | Terminal
  outcome?: string
  durationMs?: number
}

const SIM_LABEL: Record<SimType, string> = {
  payment_failed: 'Payment Failed',
  checkout_abandoned: 'Checkout Abandoned',
  invoice_overdue: 'Invoice Overdue'
}

export default function SimulatePage() {
  const [pipeline, setPipeline] = useState<PipelineState | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [firing, setFiring] = useState<SimType | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const activeEventRef = useRef<string | null>(null)
  const firedAtRef = useRef<number>(0)

  useEffect(() => {
    const socket = getSocket()

    function onCompleted(payload: { event: { id: string; rupeeAmount: number }; triage?: { agentType: string; confidence: number }; outcome: string }) {
      if (payload.event.id !== activeEventRef.current) return

      timersRef.current.forEach(clearTimeout)
      timersRef.current = []

      const durationMs = Date.now() - firedAtRef.current
      const seconds = (durationMs / 1000).toFixed(1)

      // Escalation is a designed safety path (confidence below the stopping-rule
      // threshold), not a failure — surface it in amber rather than red.
      const terminal: Terminal =
        payload.outcome === 'RECOVERED' ? 'success' : payload.outcome === 'ESCALATED' ? 'escalated' : 'failed'

      setPipeline((prev) =>
        prev && prev.eventId === payload.event.id
          ? {
              ...prev,
              stepIndex: PIPELINE_STEPS.length - 1,
              status: terminal,
              details: {
                ...prev.details,
                3: payload.triage
                  ? `${AGENT_SHORT[payload.triage.agentType] ?? payload.triage.agentType} · ${Math.round(payload.triage.confidence * 100)}% confidence`
                  : undefined,
                4: payload.triage ? AGENT_SHORT[payload.triage.agentType] ?? payload.triage.agentType : undefined,
                5:
                  terminal === 'success'
                    ? `${formatRupees(payload.event.rupeeAmount)} recovered in ${seconds}s`
                    : `${payload.outcome} after ${seconds}s`
              }
            }
          : prev
      )

      setLog((prev) =>
        prev.map((entry) =>
          entry.id === payload.event.id ? { ...entry, status: terminal, outcome: payload.outcome, durationMs } : entry
        )
      )
    }

    socket.on('agent:completed', onCompleted)
    return () => {
      socket.off('agent:completed', onCompleted)
      timersRef.current.forEach(clearTimeout)
    }
  }, [])

  async function fire(type: SimType, amount: number, data: Record<string, unknown>) {
    setFiring(type)
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    try {
      const startedAt = Date.now()
      const { eventId } = await simulateEvent(type, { amount, ...data })

      activeEventRef.current = eventId
      firedAtRef.current = startedAt

      setPipeline({ eventId, stepIndex: 0, status: 'running', details: { 1: eventId.slice(0, 18) } })
      const newEntry: LogEntry = { id: eventId, type, amount, firedAt: startedAt, status: 'pending' }
      setLog((prev) => [newEntry, ...prev].slice(0, 10))

      for (let step = 1; step < PIPELINE_STEPS.length - 1; step++) {
        timersRef.current.push(
          setTimeout(() => {
            setPipeline((prev) => (prev && prev.eventId === eventId ? { ...prev, stepIndex: step } : prev))
          }, step * STEP_DELAY_MS)
        )
      }

      timersRef.current.push(
        setTimeout(() => {
          setPipeline((prev) => (prev && prev.eventId === eventId && prev.status === 'running' ? { ...prev, status: 'failed' } : prev))
          setLog((prev) =>
            prev.map((entry) => (entry.id === eventId && entry.status === 'pending' ? { ...entry, status: 'failed', outcome: 'TIMEOUT' } : entry))
          )
        }, PIPELINE_TIMEOUT_MS)
      )
    } catch (err) {
      console.error('[simulate] failed to fire event', err)
      setPipeline({ eventId: 'error', stepIndex: 0, status: 'failed', details: {} })
    } finally {
      setFiring(null)
    }
  }

  function stepState(index: number): StepState {
    if (!pipeline) return 'pending'
    if (index < pipeline.stepIndex) return 'done'
    if (index === pipeline.stepIndex) {
      if (pipeline.status === 'success') return 'done'
      if (pipeline.status === 'failed') return 'failed'
      if (pipeline.status === 'escalated') return 'escalated'
      return 'active'
    }
    return 'pending'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[16px] font-bold text-rzp-text">Fire a test event</h2>
        <p className="mt-0.5 text-[13px] text-rzp-text-secondary">
          Fire test events to see RevenueRadar recover revenue in real time
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <PaymentFailedCard onFire={fire} firing={firing === 'payment_failed'} />
        <CheckoutAbandonedCard onFire={fire} firing={firing === 'checkout_abandoned'} />
        <InvoiceOverdueCard onFire={fire} firing={firing === 'invoice_overdue'} />
      </div>

      <div className="rzp-card p-5">
        <h3 className="mb-6 text-[14px] font-bold text-rzp-text">Recovery Pipeline</h3>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[820px] items-start">
            {PIPELINE_STEPS.map((rawStep, i) => {
              const state = stepState(i)
              const nextDone = stepState(i + 1) === 'done' || stepState(i + 1) === 'active'

              // The final step is named for whatever terminal state we actually reached,
              // so an escalation doesn't read as "Recovered" in amber.
              const step =
                i === PIPELINE_STEPS.length - 1 && pipeline && pipeline.status !== 'running'
                  ? pipeline.status === 'success'
                    ? 'Recovered'
                    : pipeline.status === 'escalated'
                      ? 'Escalated'
                      : 'Failed'
                  : rawStep

              return (
                <div key={rawStep} className="flex flex-1 items-start">
                  <div className="flex w-[128px] shrink-0 flex-col items-center px-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                        state === 'done'
                          ? 'border-rzp-success bg-rzp-success text-white'
                          : state === 'active'
                            ? 'border-rzp-blue bg-white text-rzp-blue'
                            : state === 'failed'
                              ? 'border-rzp-danger bg-rzp-danger text-white'
                              : state === 'escalated'
                                ? 'border-rzp-warning bg-rzp-warning text-white'
                                : 'border-rzp-border bg-white text-rzp-text-muted'
                      }`}
                    >
                      {state === 'done' ? (
                        <Check size={15} strokeWidth={3} />
                      ) : state === 'failed' ? (
                        <X size={15} strokeWidth={3} />
                      ) : state === 'escalated' ? (
                        <UserRound size={14} strokeWidth={2.5} />
                      ) : state === 'active' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <span className="text-[11px] font-bold">{i + 1}</span>
                      )}
                    </div>

                    <p
                      className={`mt-2 text-center text-[12px] font-semibold ${
                        state === 'done'
                          ? 'text-rzp-success'
                          : state === 'active'
                            ? 'text-rzp-blue'
                            : state === 'failed'
                              ? 'text-rzp-danger'
                              : state === 'escalated'
                                ? 'text-rzp-warning'
                                : 'text-rzp-text-muted'
                      }`}
                    >
                      {step}
                    </p>

                    {pipeline?.details[i] && (
                      <p className="mono mt-1 max-w-[124px] break-words text-center text-[10px] leading-snug text-rzp-text-muted">
                        {pipeline.details[i]}
                      </p>
                    )}
                  </div>

                  {i < PIPELINE_STEPS.length - 1 && (
                    <div
                      className={`mt-4 h-px flex-1 border-t-2 border-dashed transition-colors ${
                        state === 'done' && nextDone ? 'border-rzp-success' : 'border-rzp-border'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {!pipeline && <p className="mt-4 text-center text-[12px] text-rzp-text-muted">Fire an event above to watch the pipeline run</p>}
      </div>

      <div className="rzp-card overflow-hidden">
        <div className="border-b border-rzp-border px-5 py-4">
          <h3 className="text-[14px] font-bold text-rzp-text">Recent Simulations</h3>
        </div>

        {log.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-rzp-text-secondary">No events fired yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="rzp-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Outcome</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {log.map((entry) => {
                  const seconds = entry.durationMs !== undefined ? entry.durationMs / 1000 : undefined
                  const durationTone =
                    seconds === undefined
                      ? 'text-rzp-text-muted'
                      : seconds < 2
                        ? 'text-rzp-success'
                        : seconds <= 5
                          ? 'text-rzp-warning'
                          : 'text-rzp-danger'

                  return (
                    <tr key={entry.id} className="animate-slide-in">
                      <td className="mono text-[12px]">{formatTime(new Date(entry.firedAt).toISOString())}</td>
                      <td className="font-semibold text-rzp-text">{SIM_LABEL[entry.type]}</td>
                      <td className="mono font-medium text-rzp-text">{formatRupees(entry.amount)}</td>
                      <td>
                        <span
                          className={`pill ${
                            entry.status === 'success'
                              ? 'pill-success'
                              : entry.status === 'failed'
                                ? 'pill-danger'
                                : entry.status === 'escalated'
                                  ? 'pill-warning'
                                  : 'pill-pending'
                          }`}
                        >
                          {entry.status === 'pending' ? 'Processing…' : (entry.outcome ?? entry.status)}
                        </span>
                      </td>
                      <td className={`mono font-medium ${durationTone}`}>{seconds !== undefined ? `${seconds.toFixed(1)}s` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SimCard({
  title,
  icon: Icon,
  accent,
  buttonLabel,
  firing,
  onSubmit,
  children
}: {
  title: string
  icon: typeof CreditCard
  accent: string
  buttonLabel: string
  firing: boolean
  onSubmit: (e: React.FormEvent) => void
  children: React.ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="rzp-card overflow-hidden" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-4">
        <Icon size={16} style={{ color: accent }} strokeWidth={2.2} />
        <h3 className="text-[14px] font-bold text-rzp-text">{title}</h3>
      </div>

      <div className="space-y-3 px-5 pb-4">{children}</div>

      <div className="px-5 pb-5">
        <button
          type="submit"
          disabled={firing}
          className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: accent }}
        >
          {firing && <Loader2 size={14} className="animate-spin" />}
          {firing ? 'Firing…' : buttonLabel}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-rzp-text-secondary">{label}</label>
      {children}
    </div>
  )
}

function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-rzp-text-muted">₹</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="rzp-input mono w-full pl-7" />
    </div>
  )
}

type FireFn = (type: SimType, amount: number, data: Record<string, unknown>) => void

function PaymentFailedCard({ onFire, firing }: { onFire: FireFn; firing: boolean }) {
  const [amount, setAmount] = useState(4999)
  const [errorType, setErrorType] = useState('GATEWAY_ERROR')
  const [email, setEmail] = useState('test@example.com')
  const [phone, setPhone] = useState('+919999999999')

  return (
    <SimCard
      title="Payment Failed"
      icon={CreditCard}
      accent="#DC2626"
      buttonLabel="Fire Payment Failed Event"
      firing={firing}
      onSubmit={(e) => {
        e.preventDefault()
        onFire('payment_failed', amount, { errorType, customerEmail: email, customerPhone: phone })
      }}
    >
      <Field label="Amount">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      <Field label="Error Type">
        <select value={errorType} onChange={(e) => setErrorType(e.target.value)} className="rzp-select w-full">
          <option value="GATEWAY_ERROR">GATEWAY_ERROR</option>
          <option value="BAD_REQUEST_ERROR">BAD_REQUEST_ERROR</option>
          <option value="SERVER_ERROR">SERVER_ERROR</option>
        </select>
      </Field>
      <Field label="Customer Email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="rzp-input w-full" />
      </Field>
      <Field label="Customer Phone">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rzp-input mono w-full" />
      </Field>
    </SimCard>
  )
}

function CheckoutAbandonedCard({ onFire, firing }: { onFire: FireFn; firing: boolean }) {
  const [amount, setAmount] = useState(1999)
  const [email, setEmail] = useState('test@example.com')
  const [phone, setPhone] = useState('+919999999999')

  return (
    <SimCard
      title="Checkout Abandoned"
      icon={ShoppingCart}
      accent="#B45309"
      buttonLabel="Fire Checkout Abandoned Event"
      firing={firing}
      onSubmit={(e) => {
        e.preventDefault()
        onFire('checkout_abandoned', amount, { customerEmail: email, customerPhone: phone })
      }}
    >
      <Field label="Amount">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      <Field label="Customer Email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="rzp-input w-full" />
      </Field>
      <Field label="Customer Phone">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rzp-input mono w-full" />
      </Field>
    </SimCard>
  )
}

function InvoiceOverdueCard({ onFire, firing }: { onFire: FireFn; firing: boolean }) {
  const [amount, setAmount] = useState(24999)
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2024-001')
  const [email, setEmail] = useState('test@example.com')
  // This card shows a Due Date field where the others show a phone input, so
  // the number is a fixed demo value rather than editable state.
  const phone = '+919999999999'
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10))

  return (
    <SimCard
      title="Invoice Overdue"
      icon={FileText}
      accent="#2B5CE6"
      buttonLabel="Fire Invoice Overdue Event"
      firing={firing}
      onSubmit={(e) => {
        e.preventDefault()
        onFire('invoice_overdue', amount, { invoiceNumber, customerEmail: email, customerPhone: phone, dueDate })
      }}
    >
      <Field label="Amount">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      <Field label="Invoice Number">
        <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="rzp-input mono w-full" />
      </Field>
      <Field label="Customer Email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="rzp-input w-full" />
      </Field>
      <Field label="Due Date">
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rzp-input w-full" />
      </Field>
    </SimCard>
  )
}
