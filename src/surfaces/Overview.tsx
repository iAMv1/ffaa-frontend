import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Check, Plus, X } from '@phosphor-icons/react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { useData } from '@/state/data'
import { useUi } from '@/state/ui'
import { EmptyHint, money, statusClass } from '@/lib/ui-helpers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const int = (n: number) => String(Math.round(n))

/* Count-up driven by one spring; first set animates 0 → value, later sets glide. */
function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const raw = useMotionValue(0)
  const spring = useSpring(raw, { stiffness: 100, damping: 20 })
  const text = useTransform(spring, (v) => format(Math.round(v)))
  useEffect(() => {
    raw.set(value)
  }, [value, raw])
  return <motion.span>{text}</motion.span>
}

function SectionHead({
  kicker,
  title,
  right,
}: {
  kicker: string
  title: string
  right?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
          {kicker}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">{title}</h3>
      </div>
      {right != null && <div className="num shrink-0 text-xs text-zinc-400">{right}</div>}
    </div>
  )
}

type TipPayload = ReadonlyArray<{ value?: number | string }>

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TipPayload
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="surface rounded-lg px-3 py-2 text-xs">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="num mt-0.5 text-sm font-semibold text-zinc-900">
        {money(Number(payload[0].value ?? 0))}
      </p>
    </div>
  )
}

function MetricSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-px border-y border-zinc-200 bg-zinc-200 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-white px-6 py-10 lg:px-10">
          <Skeleton className="h-3 w-20 rounded-sm bg-zinc-100" />
          <Skeleton className="mt-4 h-9 w-28 rounded-sm bg-zinc-100" />
        </div>
      ))}
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="surface divide-y divide-zinc-100 rounded-xl">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between px-5 py-4">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-36 rounded-sm bg-zinc-100" />
            <Skeleton className="h-3 w-24 rounded-sm bg-zinc-100" />
          </div>
          <Skeleton className="h-3.5 w-16 rounded-sm bg-zinc-100" />
        </div>
      ))}
    </div>
  )
}

const ONBOARD_DISMISS_KEY = 'ffaa.onboarding.dismissed'

type OnboardingStep = {
  label: string
  done: boolean
  cta: string
  action: () => void
}

/** First-run checklist (journey §4): derived from live counts — no wizard,
 *  no server state. Dismissal persists in localStorage; the card vanishes for
 *  good once every step's condition holds. */
function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const complete = steps.every((s) => s.done)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(ONBOARD_DISMISS_KEY) === '1',
  )
  if (complete || dismissed) return null
  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(ONBOARD_DISMISS_KEY, '1')
    } catch {
      /* private mode etc. — session-only dismissal is fine */
    }
  }
  return (
    <section className="surface relative rounded-xl px-6 py-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss getting-started checklist"
        className="absolute right-3 top-3 rounded-md p-1 text-zinc-400 outline-none transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
        Get started
      </p>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={s.label}>
            {s.done ? (
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                  <Check weight="bold" className="h-3 w-3" />
                </span>
                <span className="truncate text-sm text-zinc-400 line-through">{s.label}</span>
              </div>
            ) : (
              // Step-linked (journey §4): the whole row is the action.
              <button
                type="button"
                onClick={s.action}
                className="group flex w-full items-center gap-3 rounded-lg px-1 py-0.5 text-left outline-none transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-500 ring-1 ring-inset ring-zinc-200">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-zinc-800">{s.label}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-700" />
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
export function Overview() {
  const {
    loading,
    scopeAll, setScopeAll,
    activeClient,
    stats,
    invoices,
    chartData,
    clientId,
    clients,
  } = useData()
  const { setShowCreateClient } = useUi()
  const navigate = useNavigate()

  const recent = [...invoices].sort((a, b) => b.id - a.id).slice(0, 7)

  const onboardingSteps: OnboardingStep[] = [
    {
      label: 'Add your first client',
      done: clients.length > 0,
      cta: 'Add client',
      action: () => setShowCreateClient(true),
    },
    {
      label: 'Upload your first invoice',
      done: invoices.length > 0,
      cta: 'Upload',
      action: () => navigate('/app/invoices'),
    },
    {
      label: 'Approve an extraction',
      done: stats.approved > 0,
      cta: 'Review queue',
      action: () => navigate('/app/invoices'),
    },
  ]

  return (
    <div className="space-y-12">
      {/* scope switch */}
      <div className="flex items-center justify-end gap-2.5 text-xs">
        <span className="text-zinc-500">{scopeAll ? 'All clients' : activeClient?.name ?? 'All clients'}</span>
        <Switch
          checked={scopeAll}
          aria-label="Show all clients"
          onCheckedChange={() => setScopeAll((v) => !v)}
          className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-zinc-300 [&_[data-slot=switch-thumb]]:bg-white"
        />
      </div>

      {!loading && <OnboardingChecklist steps={onboardingSteps} />}
      {/* metrics — asymmetric hairline band, the numbers are the hero */}
      {loading ? (
        <MetricSkeleton />
      ) : (
        <dl className="grid grid-cols-2 gap-px border-y border-zinc-200 bg-zinc-200 lg:grid-cols-4">
          {([
            { label: 'Booked volume', value: stats.total, format: money },
            { label: 'Pending review', value: stats.pending, format: int },
            { label: 'Approved', value: stats.approved, format: int },
            { label: 'Open bank lines', value: stats.unrec, format: int },
          ] as const).map((m) => (
            <div key={m.label} className="bg-white px-6 py-10 lg:px-10">
              <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
                {m.label}
              </dt>
              <dd className="num mt-3 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums lg:text-4xl">
                <CountUp value={m.value} format={m.format} />
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-[1.5fr_1fr]">
        {/* volume by party */}
        <section>
          <SectionHead
            kicker={scopeAll ? 'Across all clients' : activeClient?.name ?? 'Scope'}
            title="Volume by party"
            right={`${invoices.length} invoices`}
          />
          <div className="surface rounded-xl p-6">
            {loading ? (
              <Skeleton className="h-64 rounded-lg bg-zinc-100" />
            ) : chartData.length === 0 ? (
              <EmptyHint
                title="No volume yet"
                body="Upload a sales or purchase invoice. Totals group by company name from OCR."
              />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="28%">
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'Geist Mono' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'Geist Mono' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                    />
                    <Tooltip cursor={{ fill: '#fafafa' }} content={<ChartTip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#059669' : '#d4d4d8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* recent activity */}
        <section>
          <SectionHead kicker="Latest" title="Recent activity" />
          {loading ? (
            <ActivitySkeleton />
          ) : recent.length === 0 ? (
            <div className="surface rounded-xl">
              <EmptyHint
                title="Nothing yet"
                body="Approved and reviewed invoices land here as they come in."
              />
            </div>
          ) : (
            <div className="surface divide-y divide-zinc-100 rounded-xl">
              {recent.map((inv, i) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2, ease: 'easeOut' }}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">{inv.company_name}</p>
                    <p className="num mt-0.5 truncate text-[11px] text-zinc-400">
                      {inv.invoice_number} · {inv.invoice_date?.slice(0, 10) ?? '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="num text-sm font-semibold text-zinc-900 tabular-nums">
                      {money(inv.total_amount)}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-transparent px-2 py-0 text-[11px] ring-1 ring-inset',
                        statusClass(inv.status),
                      )}
                    >
                      {inv.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* quick client entry kept for scope drill-down; also the first-run
          onboarding path — a new tenant must be able to mint client #1 */}
      {!loading && (
        <section>
          <SectionHead kicker="Directory" title="Clients" />
          {clients.length === 0 ? (
            <div className="surface flex flex-col items-center gap-3 rounded-xl px-5 py-10 text-center">
              <p className="text-sm text-zinc-500">
                No clients yet. Add your first client to start filing invoices and bank statements.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowCreateClient(true)}
                className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800"
              >
                <Plus className="h-3.5 w-3.5" weight="bold" />
                Add your first client
              </Button>
            </div>
          ) : (
            <div className="surface divide-y divide-zinc-100 rounded-xl">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/app/clients/${c.id}`)}
                  className={cn(
                    'flex w-full items-center justify-between px-5 py-3.5 text-left text-sm transition hover:bg-zinc-50',
                    clientId === c.id && 'bg-emerald-50/60',
                  )}
                >
                  <span className="font-medium text-zinc-800">{c.name}</span>
                  {clientId === c.id && (
                    <span className="text-[11px] font-medium text-emerald-700">Active</span>
                  )}
                </button>
              ))}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
                onClick={() => setShowCreateClient(true)}
              >
                Add client
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
