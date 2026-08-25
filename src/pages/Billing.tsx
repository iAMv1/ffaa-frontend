// P4 replaces — placeholder billing so `/app/billing` resolves. P4 wires plan
// status from the subscription endpoint, the Razorpay checkout modal, and the
// payment-history table.
import { Link } from 'react-router'
import { Card } from '@/components/ui/card'

export function Billing() {
  return (
    <Card className="gap-0 rounded-2xl border-zinc-200 bg-white px-6 py-5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Billing</p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Plan management and payment history arrive with checkout (P4).
      </p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        Until then every account runs on the free tier —{' '}
        <Link to="/pricing" className="font-medium text-zinc-800 underline-offset-2 hover:underline">
          see what Pro includes
        </Link>
        .
      </p>
    </Card>
  )
}
