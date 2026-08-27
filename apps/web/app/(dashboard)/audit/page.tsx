'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { getAuditEntries, getMetrics, type AuditEntryRow, type Metrics } from '@/lib/api'
import {
  formatRupees,
  formatDate,
  formatTime,
  LEAKAGE_TYPE_LABEL,
  AGENT_LABEL
} from '@/lib/format'
import { StatusPill, ConfidencePill, Pill } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Drawer, DrawerSection } from '@/components/ui/drawer'
import { Timeline, type TimelineStep } from '@/components/ui/timeline'

const PAGE_SIZE = 20

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function toCsvRow(cells: Array<string | number>): string {
  return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntryRow[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [agentFilter, setAgentFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AuditEntryRow | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const mounted = useRef(true)

  const fetchEntries = useCallback(async () => {
    try {
      const [res, metricsRes] = await Promise.all([
        getAuditEntries({ page, limit: PAGE_SIZE, agentType: agentFilter || undefined, outcome: outcomeFilter || undefined }),
        getMetrics()
      ])
      if (!mounted.current) return
      setEntries(res.entries)
      setTotal(res.total)
      setMetrics(metricsRes)
    } catch (err) {
      console.error('[audit] failed to fetch', err)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [page, agentFilter, outcomeFilter])

  useEffect(() => {
    mounted.current = true
    setLoading(true)
    fetchEntries()
    const interval = setInterval(fetchEntries, 5000)
    return () => {
      mounted.current = false
      clearInterval(interval)
    }
  }, [fetchEntries])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  async function handleExportCsv() {
    const res = await getAuditEntries({ page: 1, limit: 1000, agentType: agentFilter || undefined, outcome: outcomeFilter || undefined })
    const header = toCsvRow(['Timestamp', 'Agent', 'Action', 'Rupee At Risk', 'Confidence', 'Triage Score', 'Status', 'Outcome', 'Reasoning'])
    const rows = res.entries.map((e) =>
      toCsvRow([
        e.executedAt,
        AGENT_LABEL[e.agentType] ?? e.agentType,
        e.actionTaken,
        e.rupeeAtRisk,
        e.confidence ?? '',
        e.triageScore ?? '',
        e.status,
        e.outcome ?? '',
        e.reasoning
      ])
    )
    const csv = [header, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-radar-audit-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const timelineSteps = (entry: AuditEntryRow): TimelineStep[] => [
    { label: 'Detected', at: entry.event.detectedAt, tone: 'blue' },
    { label: 'Triaged by orchestrator', at: entry.executedAt, tone: 'blue' },
    { label: `Executed · ${entry.actionTaken}`, at: entry.executedAt, tone: 'blue' },
    {
      label: entry.outcome ?? 'Outcome pending',
      at: entry.completedAt,
      tone: entry.outcome === 'RECOVERED' ? 'success' : entry.outcome === 'FAILED' ? 'danger' : entry.outcome ? 'warning' : 'muted'
    }
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] font-bold text-rzp-text">Decision Log</h2>
        <button onClick={handleExportCsv} className="btn-outline">
          <Download size={13} />
          Export CSV
        </button>
      </div>

      <div className="rzp-card flex flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-rzp-text-muted">Total Decisions</span>
          <span className="text-[14px] font-bold text-rzp-text">{metrics?.totalDecisions ?? 0}</span>
        </div>
        <div className="hidden h-5 w-px bg-rzp-border sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-rzp-text-muted">Avg Confidence</span>
          <span className="text-[14px] font-bold text-rzp-text">{metrics ? Math.round(metrics.avgConfidence * 100) : 0}%</span>
        </div>
        <div className="hidden h-5 w-px bg-rzp-border sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-rzp-text-muted">Escalated</span>
          <span className="text-[14px] font-bold text-rzp-text">{metrics?.escalations ?? 0}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={agentFilter}
          onChange={(e) => {
            setPage(1)
            setAgentFilter(e.target.value)
          }}
          className="rzp-select w-auto min-w-[160px]"
        >
          <option value="">All Agents</option>
          <option value="PaymentRetryAgent">Payment Retry</option>
          <option value="CheckoutNudgeAgent">Checkout Nudge</option>
          <option value="InvoiceCollectorAgent">Invoice Collector</option>
        </select>

        <select
          value={outcomeFilter}
          onChange={(e) => {
            setPage(1)
            setOutcomeFilter(e.target.value)
          }}
          className="rzp-select w-auto min-w-[160px]"
        >
          <option value="">All Outcomes</option>
          <option value="RECOVERED">Recovered</option>
          <option value="FAILED">Failed</option>
          <option value="ESCALATED">Escalated</option>
          <option value="STOPPED">Stopped</option>
        </select>
      </div>

      <div className="rzp-card overflow-x-auto">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="px-5 py-14 text-center text-[13px] text-rzp-text-secondary">No audit entries yet</p>
        ) : (
          <table className="rzp-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Agent</th>
                <th>Action</th>
                <th>₹ At Risk</th>
                <th>Confidence</th>
                <th>Outcome</th>
                <th>Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="cursor-pointer" onClick={() => setSelected(entry)}>
                  <td>
                    <div className="mono text-[12px] leading-tight text-rzp-text">{formatDate(entry.executedAt)}</div>
                    <div className="mono text-[11px] leading-tight text-rzp-text-muted">{formatTime(entry.executedAt)}</div>
                  </td>
                  <td className="font-semibold text-rzp-text">{AGENT_LABEL[entry.agentType] ?? entry.agentType}</td>
                  <td>{entry.actionTaken}</td>
                  <td className="mono font-medium text-rzp-text">{formatRupees(entry.rupeeAtRisk)}</td>
                  <td>
                    <ConfidencePill confidence={entry.confidence} />
                  </td>
                  <td>{entry.outcome ? <StatusPill status={entry.outcome} /> : <StatusPill status={entry.status} />}</td>
                  <td className="max-w-[280px]" title={entry.reasoning}>
                    {truncate(entry.reasoning, 55)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[12px] text-rzp-text-muted">
          Showing {rangeStart}–{rangeEnd} of {total}
        </p>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-outline">
            Previous
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="btn-outline">
            Next
          </button>
        </div>
      </div>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? (AGENT_LABEL[selected.agentType] ?? selected.agentType) : ''}
        headerRight={selected ? <StatusPill status={selected.outcome ?? selected.status} /> : undefined}
      >
        {selected && (
          <>
            <DrawerSection title="Event Details">
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-rzp-text-muted">Type</dt>
                  <dd className="font-semibold text-rzp-text">{LEAKAGE_TYPE_LABEL[selected.eventType] ?? selected.eventType}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-rzp-text-muted">Amount at risk</dt>
                  <dd className="mono font-semibold text-rzp-text">{formatRupees(selected.rupeeAtRisk)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-rzp-text-muted">Triage score</dt>
                  <dd className="mono text-rzp-text">
                    {selected.triageScore !== undefined ? Math.round(selected.triageScore).toLocaleString('en-IN') : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-rzp-text-muted">Priority</dt>
                  <dd>{selected.priority ? <Pill tone="neutral">{selected.priority}</Pill> : '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-rzp-text-muted">Confidence</dt>
                  <dd>
                    <ConfidencePill confidence={selected.confidence} />
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-rzp-text-muted">Customer</dt>
                  <dd className="text-rzp-text">{selected.event.customerEmail ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-rzp-text-muted">Phone</dt>
                  <dd className="mono text-rzp-text">{selected.event.customerPhone ?? '—'}</dd>
                </div>
              </dl>
            </DrawerSection>

            <DrawerSection title="AI Reasoning">
              <div className="rounded-md bg-rzp-blue-light px-4 py-3">
                <p className="text-[13px] italic leading-relaxed text-rzp-text">{selected.reasoning}</p>
              </div>
              {selected.outcomeDetail && <p className="mt-2 text-[12px] text-rzp-text-muted">{selected.outcomeDetail}</p>}
            </DrawerSection>

            <DrawerSection title="Timeline">
              <Timeline steps={timelineSteps(selected)} />
            </DrawerSection>

            <DrawerSection title="Raw Metadata">
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="mb-2 flex items-center gap-1 text-[12px] font-semibold text-rzp-blue hover:underline"
              >
                <ChevronDown size={13} className={`transition-transform ${showRaw ? 'rotate-180' : ''}`} />
                {showRaw ? 'Hide' : 'Show'} JSON
              </button>
              {showRaw && (
                <pre className="mono overflow-x-auto rounded-md border border-rzp-border bg-rzp-surface p-3 text-[11px] leading-relaxed text-rzp-text-secondary">
                  {JSON.stringify(selected.event.metadata, null, 2)}
                </pre>
              )}
            </DrawerSection>
          </>
        )}
      </Drawer>
    </div>
  )
}
