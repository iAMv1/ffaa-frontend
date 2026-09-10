import { useEffect, useState } from 'react'
import { motion, type Variants } from 'motion/react'
import { ArrowClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { api } from '@/api'
import { useData } from '@/state/data'
import { useUi } from '@/state/ui'
import type { MatchCandidate } from '@/state/types'
import { EmptyHint, SkeletonRows, money } from '@/lib/ui-helpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const tableVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
}

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 20 },
  },
}

export function Reconcile() {
  // match candidates are reconcile-run output — surface-local (F-02 split);
  // reset when the client scope changes so stale pairs never render
  const [matches, setMatches] = useState<MatchCandidate[]>([])
  const { clientId, busy, setBusy, loading, reconHistory, rowBusy, setRowBusy, load } = useData()
  const { setConfirm } = useUi()

  useEffect(() => {
    setMatches([])
  }, [clientId])

  return (
    <>
      <div className="surface rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-zinc-900">Match run</h3>
        <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-zinc-500">
          Amount equality, date within three days, narration score via RapidFuzz.
          Preview first; confirm writes reconciliation rows.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={clientId == null || busy}
            onClick={async () => {
              if (clientId == null) return
              setBusy(true)
              try {
                const r = await api.reconcile(clientId, false)
                setMatches(r.matches)
                toast.success(`${r.matches.length} candidate${r.matches.length === 1 ? '' : 's'}`)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed')
              } finally {
                setBusy(false)
              }
            }}
            className="border-zinc-200 bg-white shadow-none hover:bg-zinc-50 active:scale-[0.98]"
          >
            Preview
          </Button>
          <Button
            type="button"
            disabled={clientId == null || busy || matches.length === 0}
            onClick={async () => {
              if (clientId == null) return
              setBusy(true)
              try {
                const r = await api.reconcile(clientId, true)
                setMatches(r.matches)
                toast.success('Confirmed')
                load()
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed')
              } finally {
                setBusy(false)
              }
            }}
            className="bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
          >
            Confirm matches{matches.length > 0 ? ` (${matches.length})` : ''}
          </Button>
        </div>
      </div>

      {busy && matches.length === 0 ? (
        <div className="surface overflow-hidden rounded-2xl">
          <SkeletonRows n={3} />
        </div>
      ) : matches.length === 0 ? (
        <div className="surface overflow-hidden rounded-2xl">
          <EmptyHint
            title="No candidates"
            body="Approve invoices and import open bank lines, then run preview."
          />
        </div>
      ) : (
        <motion.div
          variants={tableVariants}
          initial="hidden"
          animate="show"
          className="surface divide-y divide-zinc-100 overflow-hidden rounded-2xl"
        >
          {matches.map((m) => (
            <motion.div
              key={`${m.invoice_id}-${m.bank_statement_id}`}
              variants={rowVariants}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Invoice
                </p>
                <p className="num mt-1 truncate text-sm font-medium text-zinc-900">
                  {m.invoice_number ?? `#${m.invoice_id ?? '—'}`}
                </p>
                <p className="num mt-0.5 text-sm text-zinc-600">
                  {money(typeof m.amount === 'number' ? m.amount : 0)}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="num shrink-0 border border-zinc-200 bg-zinc-50 px-2 text-[11px] font-medium text-zinc-600"
              >
                {typeof m.match_score === 'number' ? m.match_score.toFixed(2) : '—'}
              </Badge>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Bank line
                </p>
                <p className="mt-1 max-w-md truncate text-sm text-zinc-800">
                  {m.narration ?? '—'}
                </p>
                <p className="num mt-0.5 text-xs text-zinc-500">
                  #{m.bank_statement_id ?? '—'}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="surface overflow-hidden rounded-2xl">
        <div className="border-b border-zinc-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            History{' '}
            <span className="num ml-1 text-xs font-normal text-zinc-500">
              {reconHistory.length} confirmed pair(s)
            </span>
          </h3>
        </div>
        {loading && reconHistory.length === 0 ? (
          <SkeletonRows n={3} />
        ) : reconHistory.length === 0 ? (
          <EmptyHint
            title="No reconciliations yet"
            body="Confirm a match run and past pairs appear here."
          />
        ) : (
          <Table className="min-w-[640px] text-left">
            <TableHeader>
              <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                <TableHead className="h-9 px-5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Invoice
                </TableHead>
                <TableHead className="h-9 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Narration
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Amount
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Matched
                </TableHead>
                <TableHead className="h-9 px-5" />
              </TableRow>
            </TableHeader>
            <motion.tbody
              variants={tableVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-zinc-100"
            >
              {reconHistory.slice(0, 30).map((r) => (
                <motion.tr
                  key={r.id}
                  variants={rowVariants}
                  className="transition-colors hover:bg-zinc-50/80"
                >
                  <td className="num whitespace-nowrap px-5 py-2.5 text-sm font-medium text-zinc-900">
                    {r.invoice_number ?? `#${r.invoice_id}`}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2.5 text-sm text-zinc-500">
                    {r.narration ?? '—'}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-sm font-medium text-zinc-900">
                    {money(r.amount ?? 0)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-xs text-zinc-500">
                    {r.matched_by} ·{' '}
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Undo reconciliation for ${r.invoice_number ?? `invoice ${r.invoice_id}`}`}
                          disabled={rowBusy === -r.id}
                          onClick={() =>
                            setConfirm({
                              title: 'Delete reconciliation',
                              message: `Remove the match between #${r.invoice_id} and bank row #${r.bank_statement_id}? The bank row is kept and becomes open again.`,
                              confirmLabel: 'Delete',
                              variant: 'danger',
                              onConfirm: async () => {
                                setRowBusy(-r.id)
                                setConfirm(null)
                                try {
                                  await api.deleteReconciliation(r.id)
                                  toast.success('Reconciliation removed')
                                  load()
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : 'Delete failed')
                                } finally {
                                  setRowBusy(null)
                                }
                              },
                            })
                          }
                          className="gap-1 text-zinc-500 hover:bg-zinc-100 hover:text-red-600"
                        >
                          <ArrowClockwise />
                          Undo
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove match — bank row reopens</TooltipContent>
                    </Tooltip>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </Table>
        )}
      </div>
    </>
  )
}
