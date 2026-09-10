import { CircleNotch } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { api } from '@/api'
import { useData } from '@/state/data'
import { useUi } from '@/state/ui'
import { EmptyHint, SkeletonRows, statusClass } from '@/lib/ui-helpers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function Duplicates() {
  const {
    loading,
    flags,
    rowBusy, setRowBusy,
    load,
  } = useData()
  const { setConfirm } = useUi()
  return (
    <>
      <Card className="gap-0 rounded-2xl border-zinc-200 bg-white px-6 py-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Duplicate flags</h3>
        <p className="mt-1 text-sm text-zinc-500">
          RapidFuzz scored on number, company, amount, and date. Accept marks the invoice duplicate; reject clears the flag.
        </p>
      </Card>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <SkeletonRows />
        ) : flags.length === 0 ? (
          <EmptyHint
            title="No flags"
            body="Click Scan on an invoice row to compare it against existing invoices."
          />
        ) : (
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="border-zinc-100 hover:bg-transparent">
                <TableHead className="h-10 px-5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Invoice</TableHead>
                <TableHead className="h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Potential duplicate</TableHead>
                <TableHead className="h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Score</TableHead>
                <TableHead className="h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Matched fields</TableHead>
                <TableHead className="h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Status</TableHead>
                <TableHead className="h-10 px-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((f, idx) => {
                const resolved = f.status !== 'pending'
                return (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18, delay: idx * 0.04 }}
                    className={`border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/80 ${resolved ? 'opacity-55' : ''}`}
                  >
                    <TableCell className="px-5 py-3.5">
                      <span className="num text-xs text-zinc-700">#{f.invoice_id}</span>
                    </TableCell>
                    <TableCell className="px-3 py-3.5">
                      <span className="num text-xs text-zinc-700">#{f.potential_duplicate_id}</span>
                    </TableCell>
                    <TableCell className="px-3 py-3.5">
                      <Badge variant="outline" className="num border-zinc-200 bg-white font-medium text-zinc-900">
                        {f.similarity_score.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal px-3 py-3.5">
                      <span className="flex flex-wrap items-center gap-1">
                        {(f.matched_fields ?? '')
                          .split(',')
                          .map((field) => field.trim())
                          .filter(Boolean)
                          .map((field) => (
                            <Badge key={field} variant="outline" className="border-transparent bg-zinc-100 text-[11px] font-normal text-zinc-600">
                              {field}
                            </Badge>
                          ))}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3.5">
                      <Badge
                        variant="outline"
                        className={`border-transparent ring-1 ring-inset ${statusClass(f.status)}`}
                      >
                        {f.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right">
                      {!resolved && (
                        <div className="inline-flex items-stretch overflow-hidden rounded-md border border-zinc-200 shadow-xs">
                          <Button
                            type="button"
                            size="sm"
                            disabled={rowBusy === f.id}
                            onClick={() =>
                              setConfirm({
                                title: 'Mark as duplicate',
                                message: `Accept that invoice #${f.invoice_id} duplicates #${f.potential_duplicate_id}? This groups them for review.`,
                                confirmLabel: 'Accept duplicate',
                                variant: 'default',
                                onConfirm: async () => {
                                  setRowBusy(f.id)
                                  setConfirm(null)
                                  try {
                                    await api.resolveDuplicate(f.id, 'accept')
                                    toast.success('Marked duplicate')
                                    load()
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : 'Failed')
                                  } finally {
                                    setRowBusy(null)
                                  }
                                },
                              })
                            }
                            className="h-7 gap-1 rounded-none border-0 px-2.5 text-xs font-medium text-emerald-700 shadow-none hover:bg-emerald-50 hover:text-emerald-800 focus-visible:ring-inset"
                          >
                            {rowBusy === f.id ? (
                              <CircleNotch className="size-3.5 animate-spin" />
                            ) : null}
                            Accept
                          </Button>
                          <span aria-hidden className="my-1.5 w-px bg-zinc-200" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={rowBusy === f.id}
                            onClick={() =>
                              setConfirm({
                                title: 'Reject duplicate flag',
                                message: `Clear flag for invoice #${f.invoice_id} vs #${f.potential_duplicate_id}? They will not be grouped as duplicates.`,
                                confirmLabel: 'Reject',
                                variant: 'danger',
                                onConfirm: async () => {
                                  setRowBusy(f.id)
                                  setConfirm(null)
                                  try {
                                    await api.resolveDuplicate(f.id, 'reject')
                                    toast.success('Flag rejected')
                                    load()
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : 'Failed')
                                  } finally {
                                    setRowBusy(null)
                                  }
                                },
                              })
                            }
                            className="h-7 gap-1 rounded-none border-0 px-2.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-red-700 focus-visible:ring-inset"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </motion.tr>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  )
}
