'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, RefreshCw, Zap } from 'lucide-react'
import { getEvents, getAuditEntries, type LeakageEventRow, type AuditEntryRow } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import {
  formatRupees,
  formatRelativeTime,
  maskEmail,
  buildLatestAuditMap,
  triageScoreTone,
  AGENT_SHORT
} from '@/lib/format'
import { LeakageTypePill, StatusPill, Pill } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Timeline, type TimelineStep } from '@/components/ui/timeline'

export default function EventsPage() {
  const [events, setEvents] = useState<LeakageEventRow[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const mounted = useRef(true)

  const fetchAll = useCallback(async () => {
    try {
      const [eventsRes, auditRes] = await Promise.all([getEvents(50), getAuditEntries({ limit: 100 })])
      if (!mounted.current) return
      setEvents(eventsRes.events)
      setAuditEntries(auditRes.entries)
    } catch (err) {
      console.error('[events] failed to fetch', err)
    } finally {
      if (mounted.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    fetchAll()
    const interval = setInterval(fetchAll, 5000)

    const socket = getSocket()
    const onUpdate = () => fetchAll()
    socket.on('event:detected', onUpdate)
    socket.on('agent:completed', onUpdate)

    return () => {
      mounted.current = false
      clearInterval(interval)
      socket.off('event:detected', onUpdate)
      socket.off('agent:completed', onUpdate)
    }
  }, [fetchAll])

  const latestAudit = buildLatestAuditMap(auditEntries)

  const filtered = useMemo(
    () =>
      events.filter((event) => {
        if (typeFilter !== 'ALL' && event.type !== typeFilter) return false

        const audit = latestAudit.get(event.id)
        const status = audit?.status ?? 'PENDING'
        if (statusFilter !== 'ALL' && status !== statusFilter) return false

        if (search.trim()) {
          const q = search.trim().toLowerCase()
          if (!String(event.rupeeAmount).includes(q) && !event.id.toLowerCase().includes(q)) return false
        }

        return true
      }),
    [events, typeFilter, statusFilter, search, latestAudit]
  )

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[16px] font-bold text-rzp-text">All Events</h2>
          <Pill tone="blue">{filtered.length}</Pill>
        </div>
        <button
          className="btn-outline"
          onClick={() => {
            setRefreshing(true)
            fetchAll()
          }}
          disabled={refreshing}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rzp-select w-auto min-w-[150px]">
          <option value="ALL">All Types</option>
          <option value="PAYMENT_FAILED">Payment Failed</option>
          <option value="CHECKOUT_ABANDONED">Checkout Abandoned</option>
          <option value="INVOICE_OVERDUE">Invoice Overdue</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rzp-select w-auto min-w-[150px]">
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="EXECUTING">Executing</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="ESCALATED">Escalated</option>
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by amount or event ID…"
          className="rzp-input w-full min-w-[220px] flex-1 sm:w-auto"
        />
      </div>

      {loading ? (
        <div className="rzp-card space-y-2 p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rzp-card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rzp-blue-light">
            <Zap size={22} className="text-rzp-blue" />
          </div>
          <p className="mb-1 text-[15px] font-bold text-rzp-text">No events yet</p>
          <p className="mb-4 text-[13px] text-rzp-text-secondary">Go to Simulator to fire test events</p>
          <Link href="/simulate" className="btn-primary">
            Open Simulator
          </Link>
        </div>
      ) : (
        <div className="rzp-card overflow-x-auto">
          <table className="rzp-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Customer</th>
                <th>Triage Score</th>
                <th>Agent</th>
                <th>Action</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Time</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => {
                const audit = latestAudit.get(event.id)
                const isExpanded = expanded.has(event.id)
                const confidence = audit?.confidence

                const steps: TimelineStep[] = [
                  { label: 'Detected', at: event.detectedAt, tone: 'blue' },
                  { label: 'Triaged', at: audit?.executedAt, tone: audit ? 'blue' : 'muted' },
                  { label: `Executed${audit ? ` · ${audit.actionTaken}` : ''}`, at: audit?.executedAt, tone: audit ? 'blue' : 'muted' },
                  {
                    label: audit?.outcome ?? 'Outcome pending',
                    at: audit?.completedAt,
                    tone: audit?.outcome === 'RECOVERED' ? 'success' : audit?.outcome === 'FAILED' ? 'danger' : audit?.outcome ? 'warning' : 'muted'
                  }
                ]

                return (
                  <Fragment key={event.id}>
                    <tr className="animate-slide-in cursor-pointer" onClick={() => toggleExpand(event.id)}>
                      <td>
                        <LeakageTypePill type={event.type} />
                      </td>
                      <td className="mono font-medium text-rzp-text">{formatRupees(event.rupeeAmount)}</td>
                      <td>{maskEmail(event.customerEmail)}</td>
                      <td className={`mono font-medium ${triageScoreTone(audit?.triageScore)}`}>
                        {audit?.triageScore !== undefined ? Math.round(audit.triageScore).toLocaleString('en-IN') : '—'}
                      </td>
                      <td>{audit ? <Pill tone="blue">{AGENT_SHORT[audit.agentType]}</Pill> : <span className="text-rzp-text-muted">—</span>}</td>
                      <td className="text-rzp-text-secondary">{audit?.actionTaken ?? '—'}</td>
                      <td>
                        {confidence !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-10 overflow-hidden rounded-sm bg-rzp-border">
                              <div
                                className={`h-full rounded-sm ${confidence > 0.8 ? 'bg-rzp-success' : confidence >= 0.6 ? 'bg-rzp-warning' : 'bg-rzp-danger'}`}
                                style={{ width: `${Math.round(confidence * 100)}%` }}
                              />
                            </div>
                            <span className="mono text-[12px] text-rzp-text-secondary">{Math.round(confidence * 100)}%</span>
                          </div>
                        ) : (
                          <span className="text-rzp-text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <StatusPill status={audit?.outcome ?? audit?.status ?? 'PENDING'} />
                      </td>
                      <td className="text-rzp-text-muted">{formatRelativeTime(event.detectedAt)}</td>
                      <td>
                        <ChevronDown
                          size={15}
                          className={`text-rzp-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="bg-rzp-surface !p-0">
                          <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-4">
                              <div>
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-rzp-text-muted">AI Reasoning</p>
                                <div className="rounded-md border border-rzp-blue-light bg-rzp-blue-light px-4 py-3">
                                  <p className="text-[13px] italic leading-relaxed text-rzp-text">
                                    {audit?.reasoning ?? 'Awaiting orchestrator triage…'}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-rzp-text-muted">Raw Metadata</p>
                                <pre className="mono overflow-x-auto rounded-md border border-rzp-border bg-white p-3 text-[11px] leading-relaxed text-rzp-text-secondary">
                                  {JSON.stringify(event.metadata, null, 2)}
                                </pre>
                              </div>
                            </div>

                            <div>
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-rzp-text-muted">Timeline</p>
                              <Timeline steps={steps} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
