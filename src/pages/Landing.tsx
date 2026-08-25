// P3 replaces — placeholder landing so `/` resolves while the public site is
// designed. Deliberately minimal: tokens only, no motion gold-plating.
import { Link } from 'react-router'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export function Landing() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-zinc-900">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-6">
        <p className="text-lg font-semibold tracking-tight">FFAA</p>
        <nav className="flex items-center gap-2">
          <Link to="/pricing" className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900">
            Pricing
          </Link>
          <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900">
            Sign in
          </Link>
          <Button asChild size="sm" className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
            <Link to="/register">
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
          Books · GST · Tally
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Invoice to Tally, without the busywork.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-500">
          Upload invoices and bank statements; FFAA extracts the lines, matches
          them, flags duplicates, and exports a clean Tally XML.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button asChild className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
            <Link to="/register">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-zinc-200 text-xs font-medium text-zinc-700">
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>
      </main>

      <footer className="border-t border-zinc-200/80 py-6 text-center text-xs text-zinc-400">
        FFAA — practice bookkeeping, minus the data entry.
      </footer>
    </div>
  )
}
