// P3 replaces — placeholder pricing so `/pricing` resolves. P3 pulls real plan
// data from GET /api/v1/billing/plans (P4); these numbers mirror the seed.
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

const plans = [
  {
    name: 'Free',
    price: '₹0',
    cadence: 'forever',
    points: ['10 invoices / month', '1 client', 'Duplicate detection & reconcile'],
  },
  {
    name: 'Pro',
    price: '₹499',
    cadence: 'per month',
    points: ['Unlimited invoices & clients', 'Bank reconciliation', 'Email reminders', 'Tally XML export'],
  },
]

export function Pricing() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-zinc-900">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-6">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          FFAA
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link to="/login" className="rounded-md px-3 py-2 font-medium text-zinc-700 hover:text-zinc-900">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[820px] flex-1 px-6 pb-24">
        <h1 className="text-center text-3xl font-semibold tracking-tight">Simple pricing</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-zinc-500">
          Start free. Upgrade when your practice does.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {plans.map((p) => (
            <div key={p.name} className="rounded-xl border border-zinc-200 bg-white p-6 elev-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{p.name}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {p.price}
                <span className="ml-1.5 text-xs font-normal text-zinc-400">{p.cadence}</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-zinc-600">
                {p.points.map((pt) => (
                  <li key={pt}>· {pt}</li>
                ))}
              </ul>
              <Button asChild size="sm" className="mt-6 w-full border-zinc-200 bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
                <Link to="/register">Get started</Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
