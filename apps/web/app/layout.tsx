import type { Metadata } from 'next'
import { Sidebar } from '../components/layout/sidebar'
import { TopBar } from '../components/layout/topbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'RevenueRadar',
  description: 'Multi-agent revenue leakage detection and recovery'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-rzp-surface font-sans text-rzp-text antialiased">
        <Sidebar />
        <div className="min-h-screen pb-14 md:ml-[240px] md:pb-0">
          <TopBar />
          <main className="p-6">{children}</main>
        </div>
      </body>
    </html>
  )
}
