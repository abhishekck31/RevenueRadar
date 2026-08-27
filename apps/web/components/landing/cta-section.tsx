import Link from 'next/link'
import { ArrowRight, Github } from 'lucide-react'
import { GITHUB_URL } from './constants'

export function CTASection() {
  return (
    <section className="landing-dark border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/30">
          Built for the Razorpay AI Buildathon
        </p>

        <p className="mt-4 text-[40px] font-black tracking-tight text-white sm:text-[52px]" style={{ letterSpacing: '-0.03em' }}>
          RevenueRadar
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-hero btn-hero-primary">
            Open the dashboard
            <ArrowRight size={15} />
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-hero btn-hero-ghost">
            <Github size={15} />
            View on GitHub
          </a>
        </div>

        <p className="mt-10 text-[13px] italic text-white/35">
          Most tools solve one leak. RevenueRadar maps the whole pipe.
        </p>
      </div>
    </section>
  )
}
