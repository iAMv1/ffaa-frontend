// P3 public site — landing. Markets the real app: OCR invoice extraction,
// Indian bank parsing, reconciliation, duplicates, Tally export, reminders.
// Motion reuses the house springs (stiffness 100 / damping 20); the app-root
// MotionConfig(reducedMotion="user") disables transforms for users who opt out.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import {
  ArrowRight,
  ArrowsLeftRight,
  Bank,
  Checks,
  CopySimple,
  EnvelopeSimple,
  FileCode,
  Receipt,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

/* ── shared chrome ──────────────────────────────────────────────────── */

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-zinc-900 text-[11px] font-bold text-white">
            F
          </span>
          FFAA
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/pricing"
            className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            Pricing
          </Link>
          <Link
            to="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            Login
          </Link>
          <Button asChild size="sm" className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
            <Link to="/register">
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-200/80">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight">FFAA</p>
          <p className="mt-0.5 text-xs text-zinc-400">Practice bookkeeping, minus the data entry.</p>
        </div>
        <nav className="flex items-center gap-5 text-xs text-zinc-500">
          <Link to="/pricing" className="hover:text-zinc-900">Pricing</Link>
          <Link to="/login" className="hover:text-zinc-900">Login</Link>
          <Link to="/register" className="hover:text-zinc-900">Create account</Link>
        </nav>
      </div>
    </footer>
  )
}

/* ── motion helpers ─────────────────────────────────────────────────── */

const SPRING = { type: 'spring', stiffness: 100, damping: 20 } as const

const group = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: SPRING },
}

function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={group} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
      {children}
    </motion.div>
  )
}

/* Count-up driven by one spring — same pattern as Overview. */
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const raw = useMotionValue(0)
  const spring = useSpring(raw, { stiffness: 100, damping: 20 })
  const text = useTransform(spring, (v) => format(Math.round(v)))
  useEffect(() => {
    raw.set(value)
  }, [value, raw])
  return <motion.span>{text}</motion.span>
}

function Metric({ value, format, label }: { value: number; format: (n: number) => string; label: string }) {
  return (
    <div className="text-center">
      <p className="num text-2xl font-semibold tracking-tight sm:text-3xl">
        <CountUp value={value} format={format} />
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{label}</p>
    </div>
  )
}

/* ── content ────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Receipt,
    title: 'Invoice OCR',
    body: 'Drop in scanned or photographed invoices. RapidOCR reads every line, including Indian-style totals written in lakhs and commas.',
  },
  {
    icon: Bank,
    title: 'Bank statement parsing',
    body: 'HDFC, ICICI, and SBI statements parse cleanly — month-name dates, running balances, and narration columns all handled.',
  },
  {
    icon: ArrowsLeftRight,
    title: 'Reconciliation',
    body: 'Bank credits are matched against open invoices so you always know which books entries the money actually settled.',
  },
  {
    icon: CopySimple,
    title: 'Duplicate detection',
    body: 'Re-uploaded statements and repeated invoices get flagged before they double-count revenue in your books.',
  },
  {
    icon: FileCode,
    title: 'Tally XML export',
    body: 'One click produces import-ready Tally XML vouchers — no retyping entries at the end of the month.',
  },
  {
    icon: EnvelopeSimple,
    title: 'Reminder emails',
    body: 'Polite, scheduled payment reminders go out per client while an invoice is still unpaid — follow-up without the awkward chase.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Upload',
    body: 'Add client folders, then drop in invoices and bank statements — scans, photos, PDFs, or CSVs.',
  },
  {
    n: '02',
    title: 'Extract & match',
    body: 'FFAA reads the documents, reconciles payments against invoices, and flags anything duplicated.',
  },
  {
    n: '03',
    title: 'Export to Tally',
    body: 'Review the results on screen, then export clean Tally XML your accountant imports directly.',
  },
]

function SectionHead({ kicker, title, body }: { kicker: string; title: string; body?: string }) {
  return (
    <div className="max-w-xl">
      <motion.p variants={rise} className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
        {kicker}
      </motion.p>
      <motion.h2 variants={rise} className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </motion.h2>
      {body ? (
        <motion.p variants={rise} className="mt-3 text-sm leading-relaxed text-zinc-500">
          {body}
        </motion.p>
      ) : null}
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────── */

export function Landing() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-zinc-900">
      <PublicNav />

      <main className="flex-1">
        {/* hero */}
        <section className="mx-auto w-full max-w-[1100px] px-6 pb-16 pt-20 text-center sm:pt-28">
          <motion.div variants={group} initial="hidden" animate="show">
            <motion.p variants={rise} className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
              Books · GST · Tally
            </motion.p>
            <motion.h1
              variants={rise}
              className="mx-auto mt-4 max-w-2xl text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl"
            >
              Invoice to Tally, without the busywork.
            </motion.h1>
            <motion.p variants={rise} className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-zinc-500 sm:text-base">
              FFAA reads your invoices and Indian bank statements, matches payments
              against the books, catches duplicates, and hands you a clean Tally
              XML — so data entry stops eating your week.
            </motion.p>
            <motion.div variants={rise} className="mt-8 flex items-center justify-center gap-3">
              <Button asChild className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
                <Link to="/register">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-zinc-200 text-xs font-medium text-zinc-700">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* honest capability metrics — what the app does, not vanity counts */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 border-y border-zinc-200/80 py-8 sm:grid-cols-3">
            <Metric value={6} format={(n) => String(n)} label="bookkeeping surfaces — upload through Tally export" />
            <Metric value={3} format={(n) => String(n)} label="bank formats parsed — HDFC · ICICI · SBI" />
            <Metric value={499} format={(n) => `₹${n}`} label="per month on Pro after the free tier" />
          </div>
        </section>

        {/* feature grid */}
        <section className="border-y border-zinc-200/80 bg-surface">
          <div className="mx-auto w-full max-w-[1100px] px-6 py-20">
            <Reveal>
              <SectionHead
                kicker="What's inside"
                title="Six tools that close your books"
                body="Every surface maps to a real step in a practice: read documents, parse statements, reconcile, de-dupe, remind, export."
              />
            </Reveal>
            <Reveal>
              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <motion.article key={f.title} variants={rise} className="surface elev-1 rounded-xl p-6">
                    <f.icon className="h-5 w-5 text-zinc-900" aria-hidden />
                    <h3 className="mt-4 text-sm font-semibold tracking-tight">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.body}</p>
                  </motion.article>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* how it works */}
        <section className="mx-auto w-full max-w-[1100px] px-6 py-20">
          <Reveal>
            <SectionHead kicker="How it works" title="Three steps, end to end" />
          </Reveal>
          <Reveal>
            <ol className="mt-12 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <motion.li key={s.n} variants={rise} className="rounded-xl border border-zinc-200 bg-surface p-6">
                  <p className="num text-xs font-semibold tracking-widest text-zinc-400">{s.n}</p>
                  <h3 className="mt-3 text-sm font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.body}</p>
                </motion.li>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* pricing teaser */}
        <section className="border-t border-zinc-200/80 bg-surface">
          <div className="mx-auto grid w-full max-w-[1100px] items-center gap-8 px-6 py-20 lg:grid-cols-[1fr_1.2fr]">
            <Reveal>
              <SectionHead
                kicker="Pricing"
                title="Start free, upgrade when the practice grows"
                body="The free tier handles 10 invoices a month for 1 client. Pro removes the caps and adds reminders and Tally export."
              />
              <motion.div variants={rise} className="mt-6 flex items-center gap-3">
                <Button asChild variant="outline" className="border-zinc-200 text-xs font-medium text-zinc-700">
                  <Link to="/pricing">Compare plans</Link>
                </Button>
              </motion.div>
            </Reveal>
            <Reveal>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: 'Free', price: '₹0', cadence: 'forever', pts: ['10 invoices / month', '1 client', 'OCR + reconciliation'] },
                  { name: 'Pro', price: '₹499', cadence: 'per month', pts: ['Unlimited invoices & clients', 'Reminders + Tally export'], hot: true },
                ].map((p) => (
                  <motion.div
                    key={p.name}
                    variants={rise}
                    className={
                      p.hot
                        ? 'elev-2 rounded-xl border border-zinc-900 bg-white p-6'
                        : 'elev-1 rounded-xl border border-zinc-200 bg-white p-6'
                    }
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{p.name}</p>
                    <p className="mt-2 num text-2xl font-semibold tracking-tight">
                      {p.price}
                      <span className="ml-1.5 text-xs font-normal text-zinc-400">{p.cadence}</span>
                    </p>
                    <ul className="mt-4 space-y-1.5">
                      {p.pts.map((pt) => (
                        <li key={pt} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-600">
                          <Checks className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* closing CTA */}
        <section className="mx-auto w-full max-w-[1100px] px-6 py-20 text-center">
          <Reveal>
            <motion.h2 variants={rise} className="mx-auto max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl">
              Your next statement is where the busywork starts. Or ends.
            </motion.h2>
            <motion.div variants={rise} className="mt-7 flex items-center justify-center gap-3">
              <Button asChild className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
                <Link to="/register">
                  Create a free account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="text-xs font-medium text-zinc-600">
                <Link to="/login">I already have one</Link>
              </Button>
            </motion.div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  )
}
