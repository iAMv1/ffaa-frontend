import { useLocation, useNavigate } from 'react-router'
import { CreditCard, DownloadSimple, Gear, List } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/api'
import { useUi } from '@/state/ui'
import { useData } from '@/state/data'

/** Route → header copy. The client surface carries the client's name. */
function section(pathname: string): {
  key: string
  title: string
  subtitle: string
} {
  const rest = pathname.replace(/^\/app\/?/, '')
  if (rest === '') {
    return { key: 'overview', title: '', subtitle: '' } // filled by caller (scope-aware)
  }
  if (rest.startsWith('clients/')) return { key: 'client', title: '', subtitle: '' }
  if (rest === 'invoices')
    return { key: 'invoices', title: 'Invoice queue', subtitle: 'Upload, review, correct, and approve. Then export Tally XML.' }
  if (rest === 'bank')
    return { key: 'bank', title: 'Bank lines', subtitle: 'Upload and match bank statements. CSV, TXT, or PDF.' }
  if (rest === 'reconcile')
    return { key: 'reconcile', title: 'Match ledger', subtitle: '' } // scope-aware
  if (rest === 'duplicates')
    return { key: 'duplicates', title: 'Duplicate review', subtitle: 'Auto-detected by RapidFuzz on number, company, amount, date.' }
  if (rest === 'reminders')
    return { key: 'reminders', title: 'Client reminders', subtitle: 'Clients with no uploads in the selected window. One-click reminder sends.' }
  if (rest === 'settings')
    return { key: 'settings', title: 'Settings', subtitle: 'Your account — profile and password.' }
  if (rest === 'billing')
    return { key: 'billing', title: 'Billing', subtitle: 'Plan status, checkout, and payment history.' }
  return { key: rest, title: 'Workspace', subtitle: '' }
}

export function TopBar() {
  const { setSidebarOpen } = useUi()
  const navigate = useNavigate()
  const location = useLocation()
  const sec = section(location.pathname)
  const { stats, scopeAll, activeClient, clientId } = useData()

  const title =
    sec.key === 'overview'
      ? 'Practice overview'
      : sec.key === 'client'
        ? (activeClient?.name ?? 'Client')
        : sec.title
  const subtitle =
    sec.key === 'overview'
      ? scopeAll
        ? 'All clients — volume, stats, and recent activity.'
        : activeClient
          ? `${activeClient.name} — stats and quick links.`
          : 'Select a client to view their workspace.'
      : sec.key === 'client'
        ? (activeClient
          ? [activeClient?.gst_number && `GSTIN ${activeClient.gst_number}`, activeClient?.address]
              .filter(Boolean)
              .join(' · ') || 'Client workspace — files, books, flags.'
          : 'Client workspace — files, books, flags.')
        : sec.key === 'reconcile'
          ? (clientId
            ? `Auto-match invoices to bank lines for ${activeClient?.name ?? 'selected client'}.`
            : 'Select a client to run reconciliation.')
          : sec.subtitle

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-8 border-b border-zinc-200/80 bg-canvas/85 px-4 py-5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:-mt-8 lg:px-10 lg:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="mt-1 shrink-0 border-zinc-200 text-zinc-600 md:hidden"
          >
            <List className="h-4 w-4" />
          </Button>
          <div className="max-w-xl">
            <p className="num text-xs font-medium text-amber-700">
              {stats.pending > 0 ? `${stats.pending} pending review` : 'All caught up'}
            </p>
            <h2 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-tight text-zinc-900">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {activeClient && (
            <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600">
              {activeClient.name}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={() => navigate('/app/settings')}
            aria-label="Settings"
            className="text-zinc-500 hover:text-zinc-900"
          >
            <Gear className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={() => navigate('/app/billing')}
            aria-label="Billing"
            className="text-zinc-500 hover:text-zinc-900"
          >
            <CreditCard className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={async () => {
              try {
                await api.downloadTally(clientId ?? undefined)
                toast.success('Tally XML downloaded')
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Tally export failed')
              }
            }}
            className="border-zinc-200 text-zinc-700"
          >
            <DownloadSimple className="h-4 w-4" />
            Tally XML
          </Button>
        </div>
      </div>
    </header>
  )
}
