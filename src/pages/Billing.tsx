/**
 * Billing (journey G6 / W4): current-plan card rendering every `rzp_status`
 * of the subscription state machine (billing-state-machine.md §1), the
 * subscribe flow (POST /billing/subscribe → Razorpay Checkout.js with
 * `subscription_id`, `short_url` fallback), and the payment-history table.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  ArrowUpRight,
  CircleNotch,
  Receipt,
  WarningCircle,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { billing, type BillingMe, type BillingPayment, type BillingPlan } from '@/api'
import { ApiError } from '@/lib/api-error'
import { money } from '@/lib/ui-helpers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

// ── Status rendering (state machine §1 transition table) ──────────────────

type StatusView = {
  label: string
  tone: 'emerald' | 'amber' | 'blue' | 'zinc' | 'red'
  /** grace-window / transitional copy under the badge */
  note?: string
  /** plan is gone — offer the subscribe CTA again */
  resubscribe?: boolean
}

/** Map local `rzp_status` (RZP states + lapsed/disputed extensions) → UI. */
function statusView(m: BillingMe): StatusView {
  const s = (m.rzp_status ?? m.status ?? 'free').toLowerCase()
  const grace = fmtDate(m.grace_ends_at)
  switch (s) {
    case 'active':
      return { label: 'Active', tone: 'emerald' }
    case 'pending':
    case 'past_due':
      return {
        label: 'Past due',
        tone: 'amber',
        note: grace
          ? `A charge failed — Pro continues until ${grace}. Approve the retry or update your card to keep it.`
          : 'A charge failed — automatic retries are running and Pro continues meanwhile.',
      }
    case 'halted':
      return {
        label: 'Retries exhausted',
        tone: 'amber',
        note: grace
          ? `Card retries failed — access continues until ${grace}. Use the card-change link Razorpay emailed you, then resubscribe.`
          : 'Card retries failed — update your card to restore billing.',
      }
    case 'paused':
      return {
        label: 'Paused',
        tone: 'blue',
        note: 'Billing is frozen and the app is read-only. Resuming restores Pro instantly.',
      }
    case 'lapsed':
      return {
        label: 'Lapsed',
        tone: 'zinc',
        note: 'The grace window ended — you are back on Free caps.',
        resubscribe: true,
      }
    case 'expired':
      return {
        label: 'Expired',
        tone: 'zinc',
        note: 'The checkout never completed — no mandate was registered.',
        resubscribe: true,
      }
    case 'cancelled':
    case 'completed': {
      const end = fmtDate(m.current_period_end)
      return {
        label: end ? `Ends ${end}` : 'Ended',
        tone: 'zinc',
        note: end
          ? 'You stay on Pro until the end of the paid period; it will not renew.'
          : undefined,
        resubscribe: true,
      }
    }
    case 'created':
    case 'authenticated':
      return {
        label: 'Activating',
        tone: 'amber',
        note: 'Checkout started — Pro switches on with the first successful charge.',
      }
    case 'disputed':
      return {
        label: 'Under review',
        tone: 'red',
        note: 'A payment dispute is open; the account is frozen until it resolves.',
      }
    default:
      return { label: 'Free', tone: 'zinc' }
  }
}

const TONE_CLS: Record<StatusView['tone'], string> = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
  amber: 'bg-amber-50 text-amber-900 ring-amber-600/15',
  blue: 'bg-blue-50 text-blue-800 ring-blue-600/15',
  zinc: 'bg-zinc-100 text-zinc-700 ring-zinc-500/10',
  red: 'bg-red-50 text-red-800 ring-red-600/15',
}

const PAY_TONE: Record<string, string> = {
  captured: 'text-emerald-700',
  paid: 'text-emerald-700',
  credited: 'text-emerald-700',
  seen: 'text-emerald-700',
  created: 'text-amber-700',
  pending: 'text-amber-700',
  processing: 'text-amber-700',
  failed: 'text-red-700',
}

function loadCheckout(): Promise<RazorpayCtor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  const { promise, resolve, reject } = Promise.withResolvers<RazorpayCtor>()
  const s = document.createElement('script')
  s.src = 'https://checkout.razorpay.com/v1/checkout.js'
  s.onload = () => {
    if (window.Razorpay) resolve(window.Razorpay)
    else reject(new Error('Razorpay checkout loaded but did not initialise'))
  }
  s.onerror = () => reject(new Error('Could not load the Razorpay checkout script'))
  document.head.appendChild(s)
  return promise
}

// ── Razorpay Checkout.js loader ───────────────────────────────────────────

type RazorpayCtor = new (opts: Record<string, unknown>) => {
  open: () => void
  on: (event: string, cb: (resp: unknown) => void) => void
}

declare global {
  interface Window {
    Razorpay?: RazorpayCtor
  }
}


// ── Page ──────────────────────────────────────────────────────────────────

export function Billing() {
  const [me, setMe] = useState<BillingMe | null>(null)
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [payments, setPayments] = useState<BillingPayment[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  /** sticky 503 posture — survives re-render so the CTA stays replaced */
  const [paymentsUnavailable, setPaymentsUnavailable] = useState(false)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let live = true
    ;(async () => {
      // Public catalog — only enriches copy; failing is non-fatal.
      try {
        const p = await billing.plans()
        if (live) setPlans(p)
      } catch {
        /* unseeded catalog → generic plan naming below */
      }
      try {
        const m = await billing.me()
        if (!live) return
        setMe(m)
        setLoadErr(null)
        // History first (paged receipts); fall back to /me's inline payments
        // whenever the endpoint or its shape differs (pinned contract wins).
        try {
          const h = await billing.history()
          const rows = Array.isArray(h)
            ? h
            : (h as { payments?: BillingPayment[] }).payments
          setPayments(Array.isArray(rows) ? rows : (m.payments ?? []))
        } catch {
          setPayments(m.payments ?? [])
        }
      } catch (e) {
        if (!live) return
        // 401 is handled globally (session-expiry redirect); don't double-report
        setLoadErr(
          e instanceof ApiError && e.status === 401
            ? null
            : e instanceof Error
              ? e.message
              : 'Could not load billing',
        )
      }
    })()
    return () => {
      live = false
    }
  }, [tick])

  const pro = plans.find((p) => p.code === 'pro')
  const proName = pro?.name ?? 'Pro'
  const sv = me ? statusView(me) : null
  // S2 (audit): paid-tier UI must mirror the BACKEND entitlement predicate
  // (billing.effective_plan_code: pro iff active or within grace) — raw
  // rzp_status values like created/authenticated do NOT mean Pro yet.
  const onPaidTier = me?.plan_code === 'pro'
  const showUpgrade = !!sv && (sv.resubscribe || (!onPaidTier && me?.plan_code !== 'pro'))

  const startSubscribe = async () => {
    if (subscribing) return
    setSubscribing(true)
    setPaymentsUnavailable(false)
    try {
      const sub = await billing.subscribe('pro')
      let Rzp: RazorpayCtor | null = null
      try {
        Rzp = await loadCheckout()
      } catch {
        /* fall through to short_url */
      }
      if (!Rzp) {
        if (sub.short_url) {
          window.location.href = sub.short_url
          return
        }
        throw new Error('Checkout could not be opened — please retry')
      }
      const rzp = new Rzp({
        key: sub.key_id,
        subscription_id: sub.subscription_id,
        name: 'FFAA',
        description: `${proName} subscription`,
        theme: { color: '#18181b' },
        handler: (resp: unknown) => {
          const r = resp as {
            razorpay_payment_id?: string
            razorpay_subscription_id?: string
            razorpay_signature?: string
          }
          // Verify is report-only (§5): it marks the payment seen for UI
          // responsiveness; the webhook does all crediting.
          if (r.razorpay_payment_id && r.razorpay_subscription_id && r.razorpay_signature) {
            billing
              .verify({
                razorpay_payment_id: r.razorpay_payment_id,
                razorpay_subscription_id: r.razorpay_subscription_id,
                razorpay_signature: r.razorpay_signature,
              })
              .catch(() => {})
          }
          toast.success('Payment received — Pro activates within a minute.')
          reload()
        },
        modal: { ondismiss: () => setSubscribing(false) },
      })
      rzp.on('payment.failed', () => {
        toast.error('Payment failed — nothing was charged. Try another card.')
        setSubscribing(false)
      })
      rzp.open()
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setPaymentsUnavailable(true)
      } else {
        toast.error(e instanceof Error ? e.message : 'Could not start checkout')
      }
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* current plan */}
      <div className="surface rounded-xl px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
          Current plan
        </p>
        {!sv ? (
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-7 w-44 rounded-lg bg-zinc-200" />
            <Skeleton className="h-4 w-64 rounded-lg bg-zinc-100" />
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="num text-2xl font-semibold tracking-tight text-zinc-900">
                {me?.plan_code === 'pro' || onPaidTier ? proName : 'Free'}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE_CLS[sv.tone]}`}
              >
                {sv.label}
              </span>
              {pro && (
                <span className="num text-sm text-zinc-500">{money(pro.price_rupees)}/mo</span>
              )}
            </div>
            {sv.note && (
              <p
                className={`mt-2 flex items-start gap-1.5 text-xs leading-relaxed ${
                  sv.tone === 'amber' ? 'text-amber-800' : 'text-zinc-500'
                }`}
              >
                {sv.tone === 'amber' && (
                  <WarningCircle weight="fill" className="mt-px h-3.5 w-3.5 shrink-0" />
                )}
                {sv.note}
              </p>
            )}
            {fmtDate(me?.current_period_end) && (
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Current period ends{' '}
                <span className="font-medium text-zinc-700">
                  {fmtDate(me?.current_period_end)}
                </span>
                .
              </p>
            )}
            {showUpgrade && (
              <div className="mt-4">
                <Button
                  type="button"
                  size="sm"
                  disabled={subscribing}
                  onClick={() => void startSubscribe()}
                  className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  {subscribing ? (
                    <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  )}
                  {sv.resubscribe ? `Resubscribe to ${proName}` : `Upgrade to ${proName}`}
                  {pro ? ` · ${money(pro.price_rupees)}/mo` : ''}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* keyless deployment posture (503 payments_not_configured) */}
      {paymentsUnavailable && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed text-amber-900">
            <p className="font-medium">Online payments aren’t set up yet.</p>
            <p className="mt-1">
              This deployment has no Razorpay keys configured, so subscriptions
              can’t be created. Everything on the free tier keeps working — ask
              the operator to add <code className="font-mono">RAZORPAY_KEY_ID</code>{' '}
              and <code className="font-mono">RAZORPAY_KEY_SECRET</code> (see the
              deployment docs). See {' '}
              <Link to="/pricing" className="underline underline-offset-2">
                what Pro includes
              </Link>{' '}
              meanwhile.
            </p>
          </div>
        </div>
      )}

      {/* /me failed but session is alive */}
      {!sv && loadErr && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="text-xs leading-relaxed text-red-900">
            <p className="font-medium">Couldn’t load your plan.</p>
            <p className="mt-1">{loadErr}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reload}
              className="mt-3 h-7 border-red-200 bg-white px-2.5 text-xs font-medium text-red-800 hover:bg-red-100"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* payment history */}
      <div className="surface overflow-hidden rounded-xl">
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/70 px-4 py-2.5">
          <Receipt className="h-3.5 w-3.5 text-zinc-400" />
          <p className="text-xs font-medium text-zinc-700">Payment history</p>
        </div>
        {payments === null ? (
          <div className="space-y-2.5 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 rounded-lg bg-zinc-100" style={{ opacity: 1 - i * 0.25 }} />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-start gap-1 px-5 py-12">
            <p className="text-sm font-medium text-zinc-900">No payments yet</p>
            <p className="max-w-[46ch] text-sm leading-relaxed text-zinc-500">
              Subscription receipts land here once a Pro plan is active.
            </p>
          </div>
        ) : (
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow className="border-zinc-100 hover:bg-transparent">
                <TableHead className="h-10 px-5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Date
                </TableHead>
                <TableHead className="h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Reference
                </TableHead>
                <TableHead className="h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Amount
                </TableHead>
                <TableHead className="h-10 px-5 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-zinc-100">
              {payments.map((p) => (
                <TableRow key={String(p.id)} className="hover:bg-transparent">
                  <TableCell className="px-5 py-2.5 text-xs text-zinc-700">
                    {fmtDate(p.created_at) ?? '—'}
                  </TableCell>
                  <TableCell className="num px-3 py-2.5 text-xs text-zinc-500">
                    {p.razorpay_payment_id ?? p.order_id ?? `#${p.id}`}
                  </TableCell>
                  <TableCell className="num px-3 py-2.5 text-xs font-medium text-zinc-800">
                    {p.amount_rupees != null ? money(p.amount_rupees) : '—'}
                  </TableCell>
                  <TableCell className="px-5 py-2.5 text-right">
                    <span
                      className={`text-xs font-medium capitalize ${
                        PAY_TONE[(p.status ?? '').toLowerCase()] ?? 'text-zinc-500'
                      }`}
                    >
                      {p.status ?? 'unknown'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Link
        to="/pricing"
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
      >
        Compare plans
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
