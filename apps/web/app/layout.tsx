import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RevenueRadar',
  description: 'Multi-agent revenue leakage detection and recovery'
}

// Root layout stays chrome-free: the dashboard sidebar/topbar live in the
// (dashboard) route group so /landing can render edge to edge.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
