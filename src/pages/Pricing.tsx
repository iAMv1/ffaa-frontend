// P3 public site — pricing. Hardcoded plans mirroring the billing seed
// (free ₹0 / 10 invoices · pro ₹499 unlimited). P4's /billing/plans endpoint
// can replace the constants without touching layout.
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { ArrowRight, Check, Minus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { PublicNav, Footer } from '@/pages/Landing'
import { useAuth } from '@/state/auth'

const SPRING = { type: 'spring', stiffness: 100, damping: 20 } as const

const group = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: SPRING },
}

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    cadence: 'forever',
    blurb: 'For trying FFAA on one real client.',
    cta: 'Start free',
    hot: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    cadence: 'per month',
    blurb: 'For practices running every client through FFAA.',
    cta: 'Go Pro',
    hot: true,
  },
]

/* rows render per plan; `null` = not on that plan */
type Cell = string | null
const MATRIX: Array<{ feature: string; free: Cell; pro: Cell }> = [
  { feature: 'Invoice OCR (RapidOCR)', free: '10 / month', pro: 'Unlimited' },
  { feature: 'Client folders', free: '1', pro: 'Unlimited' },
  { feature: 'Bank statement parsing (HDFC · ICICI · SBI)', free: null, pro: 'Included' },
  { feature: 'Reconciliation matching', free: 'Basic', pro: 'Full' },
  { feature: 'Duplicate detection', free: 'Included', pro: 'Included' },
  { feature: 'Tally XML export', free: null, pro: 'Included' },
  { feature: 'Payment reminder emails', free: null, pro: 'Included' },
]

const FAQ = [
  {
    q: 'Where does my data live?',
    a: 'Each account is an isolated tenant: your clients, invoices, and bank files are stored under your account only, and documents you upload are processed solely to extract lines for your books. Nothing is shared across accounts or used to train anything.',
  },
  {
    q: 'Does this replace my GST filing or Tally?',
    a: 'No — FFAA sits before them. It extracts and matches the raw paperwork, then exports Tally XML vouchers you import into Tally as usual. Always review entries before filing GST returns.',
  },
  {
    q: 'Can I cancel Pro anytime?',
    a: 'Yes. Cancel from the billing page and your plan simply expires at the end of the paid period — no lock-in. You drop back to Free limits, and your existing data stays readable and exportable.',
  },
  {
    q: 'What counts as an invoice?',
    a: 'Every invoice document FFAA successfully processes in a calendar month. Re-uploads that are caught as duplicates do not count against the limit, and the counter resets at the start of each month.',
  },
]

function CellValue({ v }: { v: Cell }) {
  if (v === null) return <Minus className="h-3.5 w-3.5 text-zinc-300" aria-label="Not included" />
  return <span className="text-zinc-700">{v}</span>
}

export function Pricing() {
  // W4 wiring: a signed-in visitor's upgrade intent lands in Billing
  // (subscribe flow + 503 posture live there); signed-out visitors register.
  const { user } = useAuth()
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-zinc-900">
      <PublicNav />

      <main className="flex-1">
        {/* plans */}
        <section className="mx-auto w-full max-w-[820px] px-6 pb-16 pt-16 text-center sm:pt-20">
          <motion.div variants={group} initial="hidden" animate="show">
            <motion.p variants={rise} className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
              Pricing
            </motion.p>
            <motion.h1 variants={rise} className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Two plans. No surprises.
            </motion.h1>
            <motion.p variants={rise} className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
              Start free with real limits, upgrade when your practice does.
            </motion.p>
          </motion.div>

          <motion.div variants={group} initial="hidden" animate="show" className="mt-12 grid gap-5 text-left sm:grid-cols-2">
            {PLANS.map((p) => (
              <motion.div
                key={p.name}
                variants={rise}
                className={
                  p.hot
                    ? 'elev-2 flex flex-col rounded-xl border border-zinc-900 bg-white p-7'
                    : 'elev-1 flex flex-col rounded-xl border border-zinc-200 bg-white p-7'
                }
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{p.name}</p>
                  {p.hot ? (
                    <span className="rounded-full border border-zinc-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 num text-3xl font-semibold tracking-tight">
                  {p.price}
                  <span className="ml-1.5 text-xs font-normal text-zinc-400">{p.cadence}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{p.blurb}</p>
                <Button
                  asChild
                  size="sm"
                  className={
                    p.hot
                      ? 'mt-6 w-full bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800'
                      : 'mt-6 w-full border-zinc-200 text-xs font-medium text-zinc-700'
                  }
                  variant={p.hot ? 'default' : 'outline'}
                >
                  <Link to={user ? '/app/billing' : '/register'}>
                    {p.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* comparison matrix */}
        <section className="border-y border-zinc-200/80 bg-surface">
          <div className="mx-auto w-full max-w-[820px] px-6 py-16">
            <motion.h2 variants={rise} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-xl font-semibold tracking-tight">
              What each plan includes
            </motion.h2>
            <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 elev-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-canvas/60 text-left">
                    <th className="px-5 py-3 font-medium text-zinc-500">Feature</th>
                    <th className="w-28 px-4 py-3 text-center font-medium text-zinc-500">Free</th>
                    <th className="w-28 px-4 py-3 text-center font-medium text-zinc-900">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.feature} className="border-b border-zinc-100 last:border-b-0">
                      <td className="px-5 py-3 leading-relaxed text-zinc-600">{row.feature}</td>
                      <td className="px-4 py-3 text-center">
                        <CellValue v={row.free} />
                      </td>
                      <td className="bg-zinc-50/60 px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Check className={`h-3.5 w-3.5 ${row.pro === null ? 'text-zinc-300' : 'text-zinc-900'}`} aria-hidden />
                          {row.pro !== null && <CellValue v={row.pro} />}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-[720px] px-6 py-16">
          <h2 className="text-xl font-semibold tracking-tight">Questions people ask</h2>
          <dl className="mt-8 space-y-8">
            {FAQ.map((item, i) => (
              <motion.div
                key={item.q}
                variants={rise}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <dt className="flex items-start gap-3 text-sm font-semibold tracking-tight">
                  <span className="num mt-px text-zinc-400">{String(i + 1).padStart(2, '0')}</span>
                  {item.q}
                </dt>
                <dd className="mt-2 pl-8 text-sm leading-relaxed text-zinc-500">{item.a}</dd>
              </motion.div>
            ))}
          </dl>
        </section>

        {/* closing CTA */}
        <section className="mx-auto w-full max-w-[1100px] px-6 pb-20 text-center">
          <Button asChild className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
            <Link to="/register">
              Create a free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-3 text-xs text-zinc-400">Free tier needs no card.</p>
        </section>
      </main>

      <Footer />
    </div>
  )
}
