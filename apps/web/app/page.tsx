'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { TrendingDown, TrendingUp, Bot, Clock, Sparkles, ArrowRight } from 'lucide-react'
import {
  getMetrics,
  getEvents,
  getAuditEntries,
  type Metrics,
  type LeakageEventRow,
  type AuditEntryRow,
  type AgentType
} from '../lib/api'
import { getSocket } from '../lib/socket'
import {
  formatRupees,
  formatRelativeTime,
  maskEmail,
  buildLatestAuditMap,
  successRateTone,
  AGENT_SHORT
} from '../lib/format'
import { MetricCard } from '../components/ui/metric-card'
import { LeakageTypePill, StatusPill, Pill } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'

const AGENTS: Array<{ type: AgentType; name: string; initial: string; color: string }> = [
  { type: 'PaymentRetryAgent', name: 'PaymentRetryAgent', initial: 'P', color: '#2B5CE6' },
  { type: 'CheckoutNudgeAgent', name: 'CheckoutNudgeAgent', initial: 'C', color: '#B45309' },
  { type: 'InvoiceCollectorAgent', name: 'InvoiceCollectorAgent', initial: 'I', color: '#0F766E' }
]

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [events, setEvents] = useState<LeakageEventRow[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const mounted = useRef(true)

  const fetchAll = useCallback(async () => {
    try {
      const [metricsRes, eventsRes, auditRes] = await Promise.all([getMetrics(), getEvents(8), getAuditEntries({ limit: 60 })])
      if (!mounted.current) return
      setMetrics(metricsRes)
      setEvents(eventsRes.events)
      setAuditEntries(auditRes.entries)
    } catch (err) {
      console.error('[overview] failed to fetch dashboard data', err)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    fetchAll()
    const interval = setInterval(fetchAll, 5000)

    const socket = getSocket()
    setConnected(socket.connected)
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onUpdate = () => fetchAll()

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('event:detected', onUpdate)
    socket.on('agent:completed', onUpdate)

    return () => {
      mounted.current = false
      clearInterval(interval)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('event:detected', onUpdate)
      socket.off('agent:completed', onUpdate)
    }
  }, [fetchAll])

  const latestAudit = buildLatestAuditMap(auditEntries)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={TrendingDown}
          iconColor="#DC2626"
          iconBg="#FEE2E2"
          label="Revenue at Risk"
          value={metrics ? formatRupees(metrics.totalAtRisk) : '—'}
          mono
          subtext={`${metrics?.totalEvents ?? 0} events detected`}
          loading={loading}
        />
        <MetricCard
          icon={TrendingUp}
          iconColor="#15803D"
          iconBg="#DCFCE7"
          label="Recovered"
          value={metrics ? formatRupees(metrics.totalRecovered) : '—'}
          mono
          trend={{ direction: 'up', text: `${metrics ? Math.round(metrics.recoveryRate * 100) : 0}% recovery rate` }}
          loading={loading}
        />
        <MetricCard
          icon={Bot}
          iconColor="#2B5CE6"
          iconBg="#E8EFFE"
          label="Agents Running"
          value="3"
          subtext="All systems operational"
          liveDot
          loading={loading}
        />
        <MetricCard
          icon={Clock}
          iconColor="#B45309"
          iconBg="#FEF3C7"
          label="Pending"
          value={metrics ? String(metrics.pendingActions) : '—'}
          subtext="In queue"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rzp-card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-rzp-border px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-rzp-text">Recent Events</h2>
              {connected && <span className="h-1.5 w-1.5 animate-dot-pulse rounded-full bg-rzp-success" />}
            </div>
            <Link href="/events" className="flex items-center gap-1 text-[13px] font-semibold text-rzp-blue hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-[13px] text-rzp-text-secondary">Waiting for events…</p>
              <Link href="/simulate" className="mt-1 inline-block text-[13px] font-semibold text-rzp-blue hover:underline">
                Fire one in the Simulator →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="rzp-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Customer</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const audit = latestAudit.get(event.id)
                    return (
                      <tr key={event.id} className="animate-slide-in">
                        <td>
                          <LeakageTypePill type={event.type} />
                        </td>
                        <td className="mono font-medium text-rzp-text">{formatRupees(event.rupeeAmount)}</td>
                        <td>{maskEmail(event.customerEmail)}</td>
                        <td>{audit ? <Pill tone="blue">{AGENT_SHORT[audit.agentType]}</Pill> : <span className="text-rzp-text-muted">—</span>}</td>
                        <td>
                          <StatusPill status={audit?.outcome ?? audit?.status ?? 'PENDING'} />
                        </td>
                        <td className="text-rzp-text-muted">{formatRelativeTime(event.detectedAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rzp-card flex flex-col">
          <div className="border-b border-rzp-border px-5 py-4">
            <h2 className="text-[14px] font-bold text-rzp-text">Agent Health</h2>
          </div>

          <div className="flex-1 space-y-5 p-5">
            {AGENTS.map((agent) => {
              const stats = metrics?.byAgent[agent.type]
              const rate = stats?.successRate ?? 0
              const lastAction = auditEntries.find((e) => e.agentType === agent.type)

              return (
                <div key={agent.type}>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold text-white"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.initial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-rzp-text">{agent.name}</p>
                      <p className="truncate text-[12px] text-rzp-text-muted">
                        {lastAction ? lastAction.actionTaken : 'Awaiting dispatch'}
                      </p>
                    </div>

                    <span className={`text-[13px] font-bold ${successRateTone(rate)}`}>{Math.round(rate * 100)}%</span>
                  </div>

                  <div className="mt-2 h-[3px] w-full overflow-hidden rounded-sm bg-rzp-border">
                    <div className="h-full rounded-sm bg-rzp-blue transition-all" style={{ width: `${Math.round(rate * 100)}%` }} />
                  </div>

                  <p className="mt-1.5 text-[11px] text-rzp-text-muted">
                    {stats?.dispatched ?? 0} dispatched · {stats?.recovered ?? 0} recovered
                  </p>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-1.5 border-t border-rzp-border px-5 py-3">
            <Sparkles size={11} className="text-rzp-text-muted" />
            <p className="text-[11px] text-rzp-text-muted">Powered by Claude API</p>
          </div>
        </div>
      </div>
    </div>
  )
}
