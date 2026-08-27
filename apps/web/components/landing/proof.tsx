import { Check } from 'lucide-react'

const RESUME_LINES = ['9.1 CGPA', 'Python, C++, Java', 'Team player', 'Hardworking and passionate']

const WORK_LINES = [
  'A repo that actually runs on a clean clone',
  'A 5-minute video of the thing working',
  'The bound you set so an agent cannot spam a customer',
  'What broke at 2am, and what you changed'
]

export function Proof() {
  return (
    <section className="landing-dark py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-[26px] font-extrabold tracking-tight text-white sm:text-[32px]">
          We read the work, not the resume.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/25">What we skim past</p>
            <ul className="mt-5 space-y-3.5">
              {RESUME_LINES.map((line) => (
                <li key={line} className="text-[15px] text-white/25 line-through">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">What we actually read</p>
            <ul className="mt-5 space-y-3.5">
              {WORK_LINES.map((line) => (
                <li key={line} className="flex gap-3 text-[15px] leading-snug text-white">
                  <Check size={16} className="mt-1 shrink-0 text-[#22C55E]" strokeWidth={3} />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-14 text-center text-[15px] italic" style={{ color: '#FFB800' }}>
          That&rsquo;s the resume we read.
        </p>
      </div>
    </section>
  )
}
