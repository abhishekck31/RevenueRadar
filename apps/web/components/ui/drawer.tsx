'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

export function Drawer({
  open,
  onClose,
  title,
  headerRight,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 z-[100] transition-opacity ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />

      <div
        className={`absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto bg-white shadow-high transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rzp-border bg-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-bold text-rzp-text">{title}</h2>
            {headerRight}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-rzp-text-muted transition-colors hover:bg-rzp-surface hover:text-rzp-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-rzp-text-muted">{title}</h3>
      {children}
    </section>
  )
}
