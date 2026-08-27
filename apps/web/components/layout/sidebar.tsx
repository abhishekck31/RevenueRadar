'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity, ScrollText, Zap } from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/events', label: 'Live Events', icon: Activity },
  { href: '/audit', label: 'Audit Trail', icon: ScrollText },
  { href: '/simulate', label: 'Simulator', icon: Zap }
]

export function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

function Logo() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rzp-blue">
      <svg width="14" height="18" viewBox="0 0 14 18" fill="none" aria-hidden="true">
        <path d="M8.4 0L0 10.2h5.1L4.2 18 13.5 6.9H7.8L8.4 0z" fill="#FFFFFF" />
      </svg>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] flex-col bg-rzp-sidebar md:flex">
        <div className="flex h-14 items-center gap-2.5 px-5">
          <Logo />
          <span className="text-[15px] font-bold tracking-tight text-white">RevenueRadar</span>
        </div>

        <div className="mx-5 h-px bg-white/10" />

        <nav className="flex-1 px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">Main</p>

          <div className="space-y-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-3 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-colors',
                    active
                      ? 'border-l-[3px] border-rzp-blue bg-white/10 pl-[13px] text-white'
                      : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
                  )}
                >
                  <Icon size={16} strokeWidth={2} />
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="p-4">
          <Link
            href="/landing"
            className="block rounded-md border border-rzp-blue/20 bg-rzp-blue/[0.12] p-3 transition-colors hover:bg-rzp-blue/20"
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-dot-pulse rounded-full bg-rzp-blue" />
              <p className="text-[11px] font-bold text-white">AI Revenue Recovery</p>
            </div>
            <p className="mt-1 pl-3.5 text-[10px] text-white/45">Razorpay Buildathon &middot; view landing</p>
          </Link>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-around bg-rzp-sidebar md:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx('flex flex-col items-center gap-0.5 text-[10px] font-semibold', active ? 'text-white' : 'text-white/55')}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
