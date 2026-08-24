import { DownloadSimple, List } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/api'
import { useUi } from '@/state/ui'
import { useData } from '@/state/data'

export function TopBar() {
  const { tab, setSidebarOpen } = useUi()
  const { stats, scopeAll, activeClient, clientId } = useData()

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
              {tab === 'overview' && 'Practice overview'}
              {tab === 'client' && (activeClient?.name ?? 'Client')}
              {tab === 'invoices' && 'Invoice queue'}
              {tab === 'bank' && 'Bank lines'}
              {tab === 'reconcile' && 'Match ledger'}
              {tab === 'duplicates' && 'Duplicate review'}
              {tab === 'reminders' && 'Client reminders'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              {tab === 'overview' && (scopeAll ? 'All clients — volume, stats, and recent activity.' : activeClient ? `${activeClient.name} — stats and quick links.` : 'Select a client to view their workspace.')}
              {tab === 'client' && (activeClient
                ? [activeClient?.gst_number && `GSTIN ${activeClient.gst_number}`, activeClient?.address]
                    .filter(Boolean)
                    .join(' · ') || 'Client workspace — files, books, flags.'
                : 'Client workspace — files, books, flags.')}
              {tab === 'invoices' && 'Upload, review, correct, and approve. Then export Tally XML.'}
              {tab === 'bank' && 'Upload and match bank statements. CSV, TXT, or PDF.'}
              {tab === 'reconcile' && (clientId ? `Auto-match invoices to bank lines for ${activeClient?.name ?? 'selected client'}.` : 'Select a client to run reconciliation.')}
              {tab === 'duplicates' && 'Auto-detected by RapidFuzz on number, company, amount, date.'}
              {tab === 'reminders' && 'Clients with no uploads in the selected window. One-click reminder sends.'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {activeClient && (
            <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600">
              {activeClient.name}
            </span>
          )}
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
