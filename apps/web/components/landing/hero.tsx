'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Github } from 'lucide-react'
import { GITHUB_URL } from './constants'

function RazorpayMark() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rzp-blue">
      <svg width="12" height="16" viewBox="0 0 14 18" fill="none" aria-hidden="true">
        <path d="M8.4 0L0 10.2h5.1L4.2 18 13.5 6.9H7.8L8.4 0z" fill="#FFFFFF" />
      </svg>
    </div>
  )
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-white/[0.08] bg-[#0A0F1E]/80 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/landing" className="flex items-center gap-2.5">
          <RazorpayMark />
          <span className="text-[15px] font-extrabold tracking-tight text-white">RevenueRadar</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-hero btn-hero-ghost !px-4 !py-2 !text-[13px]">
            <Github size={14} />
            GitHub
          </a>
          <Link href="/" className="btn-hero btn-hero-primary !px-4 !py-2 !text-[13px]">
            View Demo
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>
    </header>
  )
}

const STATS = [
  { value: '₹2.4L', label: 'Recovered' },
  { value: '87%', label: 'Recovery rate' },
  { value: '3', label: 'Agents running' }
]

export function Hero() {
  return (
    <section className="landing-dark relative overflow-hidden">
      <Nav />

      <div className="pointer-events-none absolute inset-0 dot-grid" aria-hidden="true" />
      <div className="scan-line" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(43,92,230,0.18), transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-40 text-center sm:pt-44">
        <div className="animate-fade-up delay-1 inline-flex items-center gap-2 rounded-full border border-rzp-blue/25 bg-rzp-blue/10 px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 animate-dot-pulse rounded-full bg-rzp-blue-mid" />
          <span className="text-[12px] font-semibold tracking-tight text-rzp-blue-mid">
            Razorpay AI Buildathon · AI Revenue Recovery
          </span>
        </div>

        <h1
          className="animate-fade-up delay-2 mx-auto mt-7 max-w-3xl text-[42px] font-black leading-[1.05] text-white sm:text-[56px] lg:text-[64px]"
          style={{ letterSpacing: '-0.03em' }}
        >
          Revenue doesn&rsquo;t vanish.
          <br />
          It <span className="text-shimmer">leaks</span>.
        </h1>

        <p className="animate-fade-up delay-3 mx-auto mt-6 max-w-[440px] text-[17px] leading-relaxed text-white/45">
          RevenueRadar watches failed payments, abandoned checkouts, and overdue invoices simultaneously — then sends the
          right agent to recover them.
        </p>

        <div className="animate-fade-up delay-4 mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-hero btn-hero-primary">
            View live demo
            <ArrowRight size={15} />
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-hero btn-hero-ghost">
            <Github size={15} />
            View on GitHub
          </a>
        </div>

        <div className="animate-fade-up delay-5 mt-16 grid grid-cols-3 border-t border-white/[0.06] pt-8">
          {STATS.map((stat, i) => (
            <div key={stat.label} className={i > 0 ? 'border-l border-white/[0.06]' : ''}>
              <p className="mono text-[24px] font-bold text-white sm:text-[28px]">{stat.value}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
