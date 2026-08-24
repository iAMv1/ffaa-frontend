import { Fragment, useEffect, useState } from 'react'
import {
  ArrowsClockwise,
  CheckCircle,
  CircleNotch,
  Copy,
  PencilSimple,
  Trash,
  UploadSimple,
  WarningCircle,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { api, type Invoice, type UploadFileResult } from '@/api'
import { toast } from 'sonner'
import { useData } from '@/state/data'
import { useUi } from '@/state/ui'
import { EmptyHint, money } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const FILE_TYPES = '.jpg .jpeg .png .bmp .tif .tiff .pdf'

const HEAD_CLS = 'h-10 px-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400'

// Explicit pins while shadcn @theme tokens are pending (ShellAgent patching
// index.css); twMerge keeps these winning over variant defaults either way.
const GHOST_ICON_CLS = 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
const GHOST_SM_CLS = 'hover:bg-zinc-100 hover:text-zinc-900'
const INPUT_CLS = 'h-8 border-zinc-300 bg-white text-[13px]'
const TOOLTIP_CLS = 'bg-zinc-900 text-zinc-50'

// Badge tone mapped from statusClass states: approved=emerald, reviewed=zinc,
// pending=amber, failed=danger.
function statusTone(s: string) {
  if (s === 'approved' || s === 'sent')
    return 'border-transparent bg-emerald-50 text-emerald-800 ring-emerald-600/15'
  if (s === 'failed') return 'border-transparent bg-red-50 text-red-800 ring-red-600/15'
  if (s === 'reviewed') return 'border-transparent bg-zinc-100 text-zinc-700 ring-zinc-500/10'
  return 'border-transparent bg-amber-50 text-amber-900 ring-amber-600/15'
}

const MotionTableRow = motion.create(TableRow)

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.pdf']

export function Invoices() {
  // upload queue + edit draft live only here — keystrokes re-render this form,
  // not the other surfaces' tables (F-02 split)
  const [dragOverType, setDragOverType] = useState<'sales' | 'purchase' | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [batchResults, setBatchResults] = useState<UploadFileResult[]>([])
  const [failedFiles, setFailedFiles] = useState<{ files: File[]; type: 'sales' | 'purchase' } | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const { loading, activeClient, clientId, invoices, rowBusy, setRowBusy, load } = useData()
  const { setConfirm } = useUi()

  // Reset per-client ephemeral state when the scope switches.
  useEffect(() => {
    setBatchResults([])
    setFailedFiles(null)
    setDragOverType(null)
  }, [clientId])

  const onUploadInvoices = async (files: File[], type: 'sales' | 'purchase') => {
    if (files.length === 0) return
    if (clientId == null) {
      toast.error('Select a client first')
      return
    }
    const filtered = files.filter((f) =>
      ALLOWED_EXT.some((e) => f.name.toLowerCase().endsWith(e)),
    )
    const rejected = files.length - filtered.length
    if (rejected > 0) toast.error(`${rejected} file(s) skipped (unsupported type)`)
    if (filtered.length === 0) return
    setUploadBusy(true)
    setBatchResults([])
    setFailedFiles(null)
    try {
      const results = await api.uploadInvoices(filtered, type, clientId)
      setBatchResults(results)
      const failedNames = new Set(results.filter((r) => r.status !== 'ok').map((r) => r.filename))
      const retry = files.filter((f) => failedNames.has(f.name))
      if (retry.length > 0) setFailedFiles({ files: retry, type })
      const okCount = results.length - retry.length
      toast.success(`${okCount} extracted, ${retry.length} failed`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadBusy(false)
    }
  }

  const startEdit = (inv: Invoice) => {
    setEditingId(inv.id)
    setFieldErrors({})
    setDraft({
      invoice_number: inv.invoice_number ?? '',
      invoice_date: inv.invoice_date ?? '',
      company_name: inv.company_name ?? '',
      taxable_value: String(inv.taxable_value ?? ''),
      gst_rate: String(inv.gst_rate ?? ''),
      total_amount: String(inv.total_amount ?? ''),
      cgst: String(inv.cgst ?? ''),
      sgst: String(inv.sgst ?? ''),
      igst: String(inv.igst ?? ''),
      hsn_code: inv.hsn_code ?? '',
      quantity: inv.quantity != null ? String(inv.quantity) : '',
      item_description: inv.item_description ?? '',
    })
  }

  const saveEdit = async (inv: Invoice) => {
    const errs: Record<string, string> = {}
    if (!draft.company_name?.trim()) errs.company_name = 'Party name required'
    if (!draft.total_amount?.trim() || isNaN(Number(draft.total_amount)))
      errs.total_amount = 'Valid amount required'
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setRowBusy(inv.id)
    const num = (k: string) => (draft[k] === '' ? 0 : Number(draft[k]))
    try {
      await api.review(inv.id, {
        client_id: inv.client_id,
        invoice_type: inv.invoice_type,
        invoice_number: draft.invoice_number || null,
        invoice_date: draft.invoice_date || null,
        company_name: draft.company_name || null,
        taxable_value: num('taxable_value'),
        gst_rate: num('gst_rate'),
        total_amount: num('total_amount'),
        cgst: num('cgst'),
        sgst: num('sgst'),
        igst: num('igst'),
        hsn_code: draft.hsn_code || null,
        quantity: draft.quantity === '' ? null : Number(draft.quantity),
        item_description: draft.item_description || null,
      })
      toast.success(`Saved ${draft.invoice_number || inv.id}`)
      setEditingId(null)
      setFieldErrors({})
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setRowBusy(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {activeClient ? (
            <>
              Filing into <span className="font-medium text-zinc-800">{activeClient.name}</span>
            </>
          ) : (
            'Select a client in the sidebar to upload.'
          )}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['sales', 'purchase'] as const).map((t) => {
          const over = dragOverType === t
          const disabled = uploadBusy || clientId == null
          return (
            <motion.div
              key={t}
              onDragOver={(e) => {
                e.preventDefault()
                if (!disabled) setDragOverType(t)
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                if (!disabled) setDragOverType(t)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setDragOverType(null)
              }}
              onDrop={async (e) => {
                e.preventDefault()
                setDragOverType(null)
                if (disabled) return
                const fs = Array.from(e.dataTransfer.files)
                if (fs.length) onUploadInvoices(fs, t)
              }}
              animate={{ scale: over ? 1.015 : 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
                disabled
                  ? 'border-zinc-200 bg-zinc-50/50 text-zinc-400'
                  : over
                    ? 'border-emerald-600/40 bg-emerald-50 text-emerald-900'
                    : 'border-zinc-300/80 bg-white text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50',
              )}
            >
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.bmp,.tif,.tiff,.pdf"
                multiple
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={disabled}
                title={disabled ? 'Select a client first' : `Upload ${t} invoices`}
                onChange={(e) => {
                  const fs = Array.from(e.target.files ?? [])
                  e.target.value = ''
                  onUploadInvoices(fs, t)
                }}
              />
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full',
                  disabled
                    ? 'bg-zinc-100 text-zinc-400'
                    : over
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-zinc-100 text-zinc-500',
                )}
              >
                {uploadBusy ? (
                  <CircleNotch className="h-5 w-5 animate-spin" />
                ) : (
                  <UploadSimple className="h-5 w-5" weight="bold" />
                )}
              </span>
              <span className="text-sm font-medium capitalize">{t} invoices</span>
              <span className="text-xs text-zinc-500">
                {uploadBusy
                  ? 'Uploading…'
                  : disabled
                    ? 'Select a client first'
                    : 'Drop files or click to browse'}
              </span>
              <span className="num text-[10px] tracking-tight text-zinc-400">{FILE_TYPES}</span>
            </motion.div>
          )
        })}
      </div>

      {batchResults.length > 0 && (
        <div className="surface overflow-hidden rounded-xl">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-2.5">
            <p className="text-xs font-medium text-zinc-700">
              Batch result —{' '}
              <span className="text-emerald-700">
                {batchResults.filter((r) => r.status === 'ok').length} ok
              </span>
              <span className="mx-1.5 text-zinc-300">·</span>
              <span className="text-red-700">
                {batchResults.filter((r) => r.status !== 'ok').length} failed
              </span>
            </p>
            {failedFiles && (
              <Button
                variant="ghost"
                size="sm"
                disabled={uploadBusy}
                onClick={() => onUploadInvoices(failedFiles.files, failedFiles.type)}
                className={cn(
                  'h-7 gap-1.5 px-2 text-xs text-amber-800 hover:bg-amber-50 hover:text-amber-900',
                )}
              >
                <ArrowsClockwise className="h-3.5 w-3.5" />
                Retry {failedFiles.files.length} failed
              </Button>
            )}
          </div>
          <div className="divide-y divide-zinc-50">
            {batchResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                <span className="truncate text-zinc-700">{r.filename}</span>
                {r.status === 'ok' ? (
                  <span className="num shrink-0 font-medium text-emerald-700">
                    {r.invoice?.invoice_number ? `#${r.invoice.invoice_number} ` : ''}pending review
                  </span>
                ) : (
                  <span className="shrink-0 text-red-700">{(r.error || 'failed').slice(0, 60)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="surface overflow-hidden rounded-2xl">
        {loading ? (
          <div className="space-y-2.5 p-5" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-9 rounded-lg bg-zinc-200"
                style={{ opacity: 1 - i * 0.12 }}
              />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyHint
            title="Queue empty"
            body="Use Upload invoice for a scan or PDF. Fields land here for review before approve."
          />
        ) : (
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="border-zinc-100 hover:bg-transparent">
                <TableHead className={cn(HEAD_CLS, 'px-5')}>Number</TableHead>
                <TableHead className={HEAD_CLS}>Party</TableHead>
                <TableHead className={HEAD_CLS}>Date</TableHead>
                <TableHead className={HEAD_CLS}>Amount</TableHead>
                <TableHead className={HEAD_CLS}>Status</TableHead>
                <TableHead className={HEAD_CLS}>OCR</TableHead>
                <TableHead className={cn(HEAD_CLS, 'px-5')} />
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:border-zinc-100">
              {invoices.map((inv, i) => (
                <Fragment key={inv.id}>
                <MotionTableRow
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: 'easeOut', delay: Math.min(i * 0.04, 0.32) }}
                  className="hover:bg-zinc-50/80"
                >
                  <TableCell className="num px-5 py-3.5 text-xs text-zinc-700">
                    {inv.invoice_number || '—'}
                  </TableCell>
                  <TableCell className="px-3 py-3.5 font-medium text-zinc-900">
                    {inv.company_name}
                  </TableCell>
                  <TableCell className="num px-3 py-3.5 text-zinc-500">
                    {inv.invoice_date || '—'}
                  </TableCell>
                  <TableCell className="num px-3 py-3.5 font-medium">
                    {money(inv.total_amount)}
                  </TableCell>
                  <TableCell className="px-3 py-3.5">
                    <Badge
                      className={cn('rounded-md text-[11px] ring-1 ring-inset', statusTone(inv.status))}
                    >
                      {inv.status.replace('_', ' ')}
                    </Badge>
                    {inv.is_duplicate && (
                      <Badge className="ml-1.5 border-transparent bg-amber-50 px-1.5 text-[10px] text-amber-800 ring-1 ring-inset ring-amber-200">
                        <WarningCircle weight="fill" />
                        Duplicate
                      </Badge>
                    )}
                    {inv.duplicate_of && !inv.is_duplicate && (
                      <Badge className="ml-1.5 border-transparent bg-emerald-50 px-1.5 text-[10px] text-emerald-800 ring-1 ring-inset ring-emerald-200">
                        <Copy />
                        Original
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="num px-3 py-3.5">
                    {inv.ocr_confidence != null ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1',
                          inv.ocr_confidence < 0.75
                            ? 'font-medium text-amber-700'
                            : 'text-zinc-500',
                        )}
                        title={
                          inv.ocr_confidence < 0.75 ? 'Low OCR confidence — verify fields' : undefined
                        }
                      >
                        {inv.ocr_confidence < 0.75 && (
                          <WarningCircle
                            className="h-3.5 w-3.5"
                            weight="fill"
                            role="img"
                            aria-label="Low OCR confidence — verify fields"
                          />
                        )}
                        {Math.round(inv.ocr_confidence * 100)}%
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                    {inv.audit && (
                      <span
                        className={cn(
                          'ml-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                          inv.audit.math_ok
                            ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/15'
                            : 'bg-red-50 text-red-800 ring-red-600/15',
                        )}
                        title={
                          inv.audit.math_ok
                            ? 'Math check passed'
                            : `Math check failed: ${inv.audit.message || ''}`
                        }
                      >
                        {inv.audit.math_ok ? 'Math ✓' : 'Math ✗'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!inv.approved && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={editingId === inv.id ? 'Close editor' : 'Edit invoice'}
                              disabled={rowBusy === inv.id}
                              onClick={() =>
                                editingId === inv.id
                                  ? (setEditingId(null), setFieldErrors({}))
                                  : startEdit(inv)
                              }
                              className={GHOST_ICON_CLS}
                            >
                              <PencilSimple className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className={TOOLTIP_CLS}>
                            {editingId === inv.id ? 'Close' : 'Edit'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {!inv.approved && (
                        <Button
                          size="sm"
                          disabled={rowBusy === inv.id}
                          onClick={() =>
                            setConfirm({
                              title: 'Approve invoice',
                              message: `Lock #${inv.invoice_number || inv.id} as approved? Data won't be editable after.`,
                              confirmLabel: 'Approve',
                              variant: 'default',
                              onConfirm: async () => {
                                setRowBusy(inv.id)
                                setConfirm(null)
                                try {
                                  await api.approve(inv.id)
                                  toast.success(`Approved ${inv.invoice_number || inv.id}`)
                                  load()
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : 'Approve failed')
                                } finally {
                                  setRowBusy(null)
                                }
                              },
                            })
                          }
                          className="gap-1.5 bg-emerald-700 px-2.5 text-xs text-white hover:bg-emerald-800"
                        >
                          {rowBusy === inv.id ? (
                            <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" weight="bold" />
                          )}
                          Approve
                        </Button>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Scan for duplicates"
                            disabled={rowBusy === inv.id}
                            onClick={async () => {
                              setRowBusy(inv.id)
                              try {
                                const r = await api.checkDuplicates(inv.id)
                                toast.success(`${r.flags_created} duplicate flag(s)`)
                                load()
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : 'Scan failed')
                              } finally {
                                setRowBusy(null)
                              }
                            }}
                            className={GHOST_ICON_CLS}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className={TOOLTIP_CLS}>Scan duplicates</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete invoice"
                            disabled={rowBusy === inv.id}
                            onClick={() =>
                              setConfirm({
                                title: 'Delete invoice',
                                message: `Delete #${inv.invoice_number || inv.id} (${inv.company_name || '—'}, ${money(inv.total_amount)})? Items, duplicate flags, and reconciliation links are removed too.`,
                                confirmLabel: 'Delete',
                                variant: 'danger',
                                onConfirm: async () => {
                                  setRowBusy(inv.id)
                                  setConfirm(null)
                                  try {
                                    await api.deleteInvoice(inv.id)
                                    toast.success(`Deleted ${inv.invoice_number || inv.id}`)
                                    load()
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : 'Delete failed')
                                  } finally {
                                    setRowBusy(null)
                                  }
                                },
                              })
                            }
                            className={cn(GHOST_ICON_CLS, 'text-red-600 hover:bg-red-50 hover:text-red-700')}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className={TOOLTIP_CLS}>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </MotionTableRow>
                <TableRow className={cn(editingId !== inv.id && 'border-b-0 hover:bg-transparent')}>
                  <TableCell colSpan={7} className="p-0">
                    <AnimatePresence initial={false}>
                      {editingId === inv.id && (
                        <motion.div
                          key={`edit-${inv.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="bg-zinc-50/60 px-5 py-4">
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                              {(
                                [
                                  ['invoice_number', 'Number', 'text'],
                                  ['invoice_date', 'Date', 'date'],
                                  ['company_name', 'Party', 'text'],
                                  ['hsn_code', 'HSN', 'text'],
                                  ['taxable_value', 'Taxable', 'number'],
                                  ['gst_rate', 'GST %', 'number'],
                                  ['total_amount', 'Total', 'number'],
                                  ['quantity', 'Qty', 'number'],
                                  ['cgst', 'CGST', 'number'],
                                  ['sgst', 'SGST', 'number'],
                                  ['igst', 'IGST', 'number'],
                                ] as const
                              ).map(([key, label, type]) => (
                                <Label key={key} className="flex-col items-start gap-1.5">
                                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                                    {label}
                                  </span>
                                  <Input
                                    type={type}
                                    value={draft[key] ?? ''}
                                    aria-invalid={fieldErrors[key] ? true : undefined}
                                    onChange={(e) =>
                                      setDraft((d) => ({ ...d, [key]: e.target.value }))
                                    }
                                    className={cn(
                                      INPUT_CLS,
                                      fieldErrors[key] &&
                                        'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-600/15',
                                    )}
                                  />
                                  {fieldErrors[key] && (
                                    <p className="text-[11px] font-medium text-danger">
                                      {fieldErrors[key]}
                                    </p>
                                  )}
                                </Label>
                              ))}
                              <Label className="col-span-2 flex-col items-start gap-1.5 md:col-span-4">
                                <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                                  Item description
                                </span>
                                <Input
                                  type="text"
                                  value={draft.item_description ?? ''}
                                  onChange={(e) =>
                                    setDraft((d) => ({ ...d, item_description: e.target.value }))
                                  }
                                  className={INPUT_CLS}
                                />
                              </Label>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingId(null)
                                  setFieldErrors({})
                                }}
                                className={GHOST_SM_CLS}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                disabled={rowBusy === inv.id}
                                onClick={() => saveEdit(inv)}
                                className="gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800"
                              >
                                {rowBusy === inv.id && (
                                  <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                                )}
                                Save review
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TableCell>
                </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  )
}
