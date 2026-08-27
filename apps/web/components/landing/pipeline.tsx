'use client'

import { useEffect, useRef, useState } from 'react'

interface Step {
  n: string
  label: string
  subtitle: string
  color: string
}

const STEPS: Step[] = [
  { n: '1', label: 'Detect', subtitle: 'Razorpay webhook lands, signature verified', color: '#2B5CE6' },
  { n: '2', label: 'Triage', subtitle: 'Scored by rupees at risk and time decay', color: '#2B5CE6' },
  { n: '3', label: 'Decide', subtitle: 'Claude picks the agent and the action', color: '#7C3AED' },
  { n: '4', label: 'Execute', subtitle: 'Retry, nudge, or follow up — within bounds', color: '#2B5CE6' },
  { n: '5', label: 'Recover', subtitle: 'Outcome written to an immutable audit trail', color: '#15803D' }
]

export function Pipeline() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Fire once, when the pipeline first scrolls into view.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="bg-rzp-surface py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rzp-blue">Process</p>
        <h2 className="mt-2.5 text-[26px] font-extrabold tracking-tight text-rzp-text sm:text-[28px]">
          Five steps. Zero manual work.
        </h2>
        <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-rzp-text-secondary">
          From the webhook hitting the receiver to the outcome landing in the audit trail, nobody has to open a dashboard.
        </p>

        <div ref={ref} className="mt-14 flex flex-col gap-8 md:flex-row md:items-start md:gap-0">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex flex-1 items-start">
              <div
                className={`flex w-full flex-col items-center px-2 text-center md:w-auto md:min-w-[132px] ${
                  visible ? 'animate-pipeline-step' : 'opacity-0'
                }`}
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-bold text-white"
                  style={{ backgroundColor: step.color, boxShadow: `0 6px 16px -6px ${step.color}` }}
                >
                  {step.n}
                </div>
                <p className="mt-3 text-[14px] font-bold text-rzp-text">{step.label}</p>
                <p className="mt-1 max-w-[150px] text-[12px] leading-snug text-rzp-text-muted">{step.subtitle}</p>
              </div>

              {i < STEPS.length - 1 && (
                <div className="mt-5 hidden h-0.5 flex-1 overflow-hidden rounded-full bg-rzp-border md:block">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: visible ? '100%' : '0%',
                      transitionDelay: `${i * 200 + 120}ms`,
                      background: 'linear-gradient(90deg, #2B5CE6, rgba(43,92,230,0.25))'
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
