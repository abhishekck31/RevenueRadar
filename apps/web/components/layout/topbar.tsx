'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSocket } from '@/lib/socket'

const PAGE_TITLES: Array<{ href: string; title: string }> = [
  { href: '/events', title: 'Live Events' },
  { href: '/audit', title: 'Audit Trail' },
  { href: '/simulate', title: 'Webhook Simulator' },
  { href: '/', title: 'Overview' }
]

const MERCHANT_ID = 'merchant_demo_razorpay'

export function TopBar() {
  const pathname = usePathname()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = getSocket()
    setConnected(socket.connected)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  const title = PAGE_TITLES.find(({ href }) => (href === '/' ? pathname === '/' : pathname.startsWith(href)))?.title ?? 'Overview'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rzp-border bg-white px-6">
      <h1 className="text-[16px] font-bold tracking-tight text-rzp-text">{title}</h1>

      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-rzp-text-secondary">
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-dot-pulse bg-rzp-success' : 'bg-rzp-text-muted'}`}
          />
          {connected ? 'Live' : 'Offline'}
        </span>

        <span className="mono hidden rounded-full bg-[#F3F4F6] px-3 py-1 text-[11px] text-rzp-text-secondary sm:inline-flex">
          {MERCHANT_ID}
        </span>
      </div>
    </header>
  )
}
