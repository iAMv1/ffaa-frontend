import { useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { CheckCircle, CircleNotch, Trash, UploadSimple } from '@phosphor-icons/react'
import { api, type BankRow } from '@/api'
import { toast } from 'sonner'
import { useData } from '@/state/data'
import { useUi } from '@/state/ui'
import { EmptyHint, SkeletonRows, money } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

export function Bank() {
  // upload dropzone + parse-preview state is bank-surface only (F-02 split)
  const [bankDragOver, setBankDragOver] = useState(false)
  const [bankPreviewRows, setBankPreviewRows] = useState<BankRow[]>([])
  const [bankPreviewFile, setBankPreviewFile] = useState<File | null>(null)
  const {
    loading,
    busy, setBusy,
    clientId,
    banks,
    rowBusy,
    setRowBusy,
    load,
  } = useData()
  const { setConfirm } = useUi()

  // Throws through to the caller's catch for toasts; preview commit shares it.
  const onUploadBank = async (f: File | null) => {
    if (!f || clientId == null) {
      toast.error('Select a client first')
      return
    }
    setBusy(true)
    try {
      const r = await api.uploadBank(f, clientId, true)
      setBankPreviewRows(r.rows)
      setBankPreviewFile(f)
      toast.success(`${r.rows.length} rows parsed — review and import`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bank upload failed')
    } finally {
      setBusy(false)
    }
  }

  const commitBankPreview = async () => {
    if (!bankPreviewFile || clientId == null) return
    setBusy(true)
    try {
      const r = await api.uploadBank(bankPreviewFile, clientId, false)
      setBankPreviewRows([])
      setBankPreviewFile(null)
      toast.success(`Imported ${r.imported} rows`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bank import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className="text-sm text-zinc-500">CSV, TXT, or PDF for the active client.</p>

      <AnimatePresence mode="wait" initial={false}>
        {bankPreviewRows.length === 0 ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <div
              onDragOver={(e) => {
                e.preventDefault()
                if (clientId != null && !busy) setBankDragOver(true)
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                if (clientId != null && !busy) setBankDragOver(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setBankDragOver(false)
              }}
              onDrop={async (e) => {
                e.preventDefault()
                setBankDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f && clientId != null) onUploadBank(f)
              }}
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors has-[input:focus-visible]:border-emerald-500 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-emerald-500/40 ${
                busy || clientId == null
                  ? 'border-zinc-200 bg-zinc-50/50 text-zinc-400'
                  : bankDragOver
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50/60'
              }`}
            >
              <input
                type="file"
                accept=".csv,.txt,.pdf"
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={busy || clientId == null}
                aria-label="Upload bank statement"
                title={clientId == null ? 'Select a client first' : 'Upload bank statement'}
                onChange={(e) => onUploadBank(e.target.files?.[0] ?? null)}
              />
              {busy ? (
                <CircleNotch aria-hidden className="h-6 w-6 animate-spin" />
              ) : (
                <UploadSimple aria-hidden className="h-6 w-6" weight="bold" />
              )}
              <span className="text-sm font-medium">Bank statement</span>
              <span className="text-xs opacity-60">
                {clientId == null ? 'Select a client first' : 'Drop CSV, TXT, or PDF'}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <Card className="gap-0 overflow-hidden py-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3">
                <p className="text-xs font-medium text-zinc-700">
                  Preview · <span className="num">{bankPreviewRows.length}</span> parsed rows —
                  import to save.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setBankPreviewRows([])
                      setBankPreviewFile(null)
                    }}
                    className="text-zinc-600 hover:bg-zinc-100"
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={commitBankPreview}
                    className="bg-emerald-700 text-white hover:bg-emerald-800 active:scale-[0.98]"
                  >
                    {busy ? 'Importing…' : `Import ${bankPreviewRows.length} rows`}
                  </Button>
                </div>
              </div>
              <CardContent className="max-h-64 overflow-y-auto px-0">
                <div className="divide-y divide-zinc-100">
                  {bankPreviewRows.slice(0, 50).map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-5 py-2 text-xs">
                      <span className="num shrink-0 text-zinc-500">{r.date}</span>
                      <span className="min-w-0 flex-1 truncate text-zinc-800">{r.narration}</span>
                      <span className="num shrink-0 text-right text-zinc-600">
                        {r.debit ? `-${money(r.debit)}` : r.credit ? money(r.credit) : '—'}
                      </span>
                    </div>
                  ))}
                  {bankPreviewRows.length > 50 && (
                    <p className="px-5 py-2 text-[11px] text-zinc-500">
                      …and {bankPreviewRows.length - 50} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="surface overflow-hidden rounded-2xl">
        {loading ? (
          <SkeletonRows />
        ) : banks.length === 0 ? (
          <EmptyHint
            title="No bank rows"
            body="Upload a statement file. Debit, credit, and narration feed reconciliation."
          />
        ) : (
          <Table className="min-w-[640px] text-left">
            <TableHeader>
              <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                <TableHead className="h-10 px-5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Date
                </TableHead>
                <TableHead className="h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Narration
                </TableHead>
                <TableHead className="h-10 px-3 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Debit
                </TableHead>
                <TableHead className="h-10 px-3 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Credit
                </TableHead>
                <TableHead className="h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Invoice
                </TableHead>
                <TableHead className="h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  State
                </TableHead>
                <TableHead className="h-10 px-5" />
              </TableRow>
            </TableHeader>
            <motion.tbody
              variants={tableVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-zinc-100"
            >
              {banks.map((b) => (
                <motion.tr
                  key={b.id}
                  variants={rowVariants}
                  className={cn(
                    'transition-colors hover:bg-zinc-50/80',
                    b.reconciled && 'bg-zinc-50/40',
                  )}
                >
                  <td
                    className={cn(
                      'num px-5 py-3.5',
                      b.reconciled ? 'text-zinc-500' : 'text-zinc-600',
                    )}
                  >
                    {b.date}
                  </td>
                  <td
                    className={cn(
                      'max-w-xs truncate px-3 py-3.5',
                      b.reconciled ? 'text-zinc-500' : 'text-zinc-800',
                    )}
                  >
                    {b.narration}
                  </td>
                  <td className="num px-3 py-3.5 text-right">
                    {b.debit ? (
                      <span className={b.reconciled ? 'text-zinc-500' : 'text-zinc-900'}>
                        {money(b.debit)}
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="num px-3 py-3.5 text-right">
                    {b.credit ? (
                      <span className="text-emerald-700">{money(b.credit)}</span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="num px-3 py-3.5">
                    {b.invoice_id ? (
                      <Badge
                        variant="outline"
                        className="border-zinc-200 px-1.5 font-normal text-zinc-500"
                      >
                        #{b.invoice_id}
                      </Badge>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    {b.reconciled ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-600/20 bg-emerald-50/80 px-1.5 text-emerald-800"
                      >
                        <CheckCircle weight="fill" /> Matched
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-200 px-1.5 text-zinc-500">
                        Open
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete bank row ${b.date}`}
                          disabled={rowBusy === -b.id}
                          onClick={() =>
                            setConfirm({
                              title: 'Delete bank row',
                              message: `Delete ${b.date} — ${b.narration.slice(0, 60)}? Reconciliation links are removed too.`,
                              confirmLabel: 'Delete',
                              variant: 'danger',
                              onConfirm: async () => {
                                setRowBusy(-b.id)
                                setConfirm(null)
                                try {
                                  await api.deleteBank(b.id)
                                  toast.success('Bank row deleted')
                                  load()
                                } catch (e) {
                                  toast.error(
                                    e instanceof Error ? e.message : 'Delete failed',
                                  )
                                } finally {
                                  setRowBusy(null)
                                }
                              },
                            })
                          }
                          className="text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                        >
                          <Trash />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete bank row</TooltipContent>
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
