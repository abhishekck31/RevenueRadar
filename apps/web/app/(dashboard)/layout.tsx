import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-rzp-surface text-rzp-text">
      <Sidebar />
      <div className="min-h-screen pb-14 md:ml-[240px] md:pb-0">
        <TopBar />
        <main className="p-5">{children}</main>
      </div>
    </div>
  )
}
