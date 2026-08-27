import type { Metadata } from 'next'
import { Hero } from '@/components/landing/hero'
import { AgentCards } from '@/components/landing/agent-cards'
import { Pipeline } from '@/components/landing/pipeline'
import { Proof } from '@/components/landing/proof'
import { CTASection } from '@/components/landing/cta-section'

export const metadata: Metadata = {
  title: 'RevenueRadar — Revenue doesn\u2019t vanish. It leaks.',
  description:
    'Multi-agent AI that watches failed payments, abandoned checkouts, and overdue invoices — then sends the right agent to recover them.'
}

export default function LandingPage() {
  return (
    <main className="bg-[#0A0F1E]">
      <Hero />
      <AgentCards />
      <Pipeline />
      <Proof />
      <CTASection />
    </main>
  )
}
