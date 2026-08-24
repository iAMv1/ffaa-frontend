import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowsClockwise,
  Bank,
  CaretRight,
  Check,
  Copy,
  DownloadSimple,
  Envelope,
  FileText,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react'
import { api } from '@/api'
import { toast } from 'sonner'
import { useData } from '@/state/data'
import { useUi } from '@/state/ui'
import { EmptyHint, SkeletonRows, money, statusClass } from '@/lib/ui-helpers'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function rowEntrance(idx: number) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.18, delay: idx * 0.04 },
  }
}

export function Client() {
  // email-edit error banner is client-surface-local (F-02 split)
  const [emailError, setEmailError] = useState('')
  const {
    loading,
    busy, setBusy,
    activeClient,
    clientId, setClientId,
    clientData,
    banks,
    reminders,
    folders,
    setClients,
    load,
  } = useData()
  const { setTab, setConfirm } = useUi()

  const [emailSaved, setEmailSaved] = useState(false)
  const savedTimer = useRef<number | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 lg:grid-cols-4">
        {([
          { label: 'Volume', value: money(clientData.vol), icon: FileText },
          { label: 'Invoices', value: String(clientData.inv.length), icon: Copy },
          { label: 'Pending review', value: String(clientData.inv.filter((i) => !i.approved).length), icon: WarningCircle },
          { label: 'Open bank lines', value: String(banks.filter((b) => !b.reconciled).length), icon: Bank },
        ] as const).map((m) => {
          const Icon = m.icon
          return (
          <div key={m.label} className="bg-white px-5 py-5">
            <Icon className="h-4 w-4 text-zinc-300" weight="bold" />
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">{m.label}</p>
            <p className="num mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900">
              {loading ? '—' : m.value}
            </p>
          </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="gap-0 rounded-2xl border-zinc-200 bg-white px-5 py-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Details</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-xs text-zinc-400">GSTIN</dt>
              <dd className="num text-right text-zinc-800">{activeClient?.gst_number || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-xs text-zinc-400">Address</dt>
              <dd className="text-right leading-snug text-zinc-800">{activeClient?.address || '—'}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-center justify-between">
            <label
              htmlFor="client-email"
              className="text-[11px] font-medium uppercase tracking-wide text-zinc-400"
            >
              Email
            </label>
            <AnimatePresence>
              {emailSaved && !emailError ? (
                <motion.span
                  key="saved-tick"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-700"
                >
                  <Check weight="bold" className="size-3" />
                  Saved
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
          <input
            id="client-email"
            type="email"
            placeholder="client@email.com"
            className={`mt-1.5 w-full rounded-lg border bg-white px-2.5 py-2 text-sm text-zinc-800 outline-none focus:ring-2 ${
              emailError
                ? 'border-red-400 focus:border-red-500 focus:ring-red-600/15'
                : 'border-zinc-200 focus:border-emerald-600/40 focus:ring-emerald-600/15'
            }`}
            value={activeClient?.email || ''}
            onChange={(e) => {
              const email = e.target.value
              setEmailError('')
              setEmailSaved(false)
              setClients((prev) =>
                prev.map((c) => (c.id === activeClient?.id ? { ...c, email } : c))
              )
            }}
            onBlur={async (e) => {
              if (!activeClient) return
              const v = e.target.value.trim()
              if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
                setEmailError('Enter a valid email address')
                return
              }
              setEmailError('')
              try {
                await api.updateClient(activeClient.id, { email: v })
                setEmailSaved(true)
                if (savedTimer.current) window.clearTimeout(savedTimer.current)
                savedTimer.current = window.setTimeout(() => setEmailSaved(false), 2200)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Save failed')
              }
            }}
          />
          {emailError && <p className="mt-1 text-[11px] font-medium text-red-600">{emailError}</p>}
          <div className="mt-5 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || !activeClient?.email}
              onClick={async () => {
                if (!activeClient) return
                setBusy(true)
                try {
                  await api.sendReminder(activeClient.id)
                  toast.success('Reminder sent')
                  load()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Send failed')
                } finally {
                  setBusy(false)
                }
              }}
              className="h-8 flex-1 gap-2 bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800"
            >
              <Envelope className="size-3.5" />
              Send reminder
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!activeClient) return
                try {
                  await api.downloadTally(activeClient.id)
                  toast.success('Tally XML downloaded')
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Tally export failed')
                }
              }}
              className="h-8 flex-1 gap-2 border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 hover:text-zinc-900"
            >
              <DownloadSimple className="size-3.5" />
              Tally XML
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                activeClient &&
                setConfirm({
                  title: 'Delete client',
                  message: `Delete ${activeClient.name}? All its invoices, items, bank rows, flags, and reminders are removed.`,
                  confirmLabel: 'Delete client',
                  variant: 'danger',
                  onConfirm: async () => {
                    setBusy(true)
                    setConfirm(null)
                    try {
                      await api.deleteClient(activeClient.id)
                      toast.success(`Deleted ${activeClient.name}`)
                      setClientId(null)
                      await load()
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Delete failed')
                    } finally {
                      setBusy(false)
                    }
                  },
                })
              }
              className="h-8 gap-2 px-3 text-xs font-medium text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              <Trash className="size-3.5" />
              Delete client
            </Button>
          </div>
        </Card>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Invoices</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTab('invoices')}
              className="h-7 gap-1.5 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <ArrowsClockwise className="size-3" />
              Open queue
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {loading ? (
              <SkeletonRows n={3} />
            ) : clientData.inv.length === 0 ? (
              <EmptyHint title="No invoices" body="Upload sales or purchase files from the Invoices tab." />
            ) : (
              <Table className="min-w-0">
                <TableHeader>
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="h-9 px-4 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Invoice</TableHead>
                    <TableHead className="h-9 px-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Company</TableHead>
                    <TableHead className="h-9 px-2 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-400">Amount</TableHead>
                    <TableHead className="h-9 px-4 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientData.inv.slice(0, 6).map((i, idx) => (
                    <motion.tr
                      key={i.id}
                      {...rowEntrance(idx)}
                      className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/80"
                    >
                      <TableCell className="px-4 py-2.5">
                        <span className="num text-xs text-zinc-700">{i.invoice_number || '—'}</span>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate px-2 py-2.5 text-xs text-zinc-500">
                        {i.company_name}
                      </TableCell>
                      <TableCell className="px-2 py-2.5 text-right">
                        <span className="num text-xs font-medium text-zinc-900">{money(i.total_amount)}</span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {i.is_duplicate && (
                            <Badge className="border-transparent bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15">
                              <Copy className="size-3" />
                              Dup
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`border-transparent ring-1 ring-inset ${statusClass(i.status)}`}
                          >
                            {i.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Bank lines</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTab('bank')}
              className="h-7 gap-1.5 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <ArrowsClockwise className="size-3" />
              Open bank
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {loading ? (
              <SkeletonRows n={3} />
            ) : banks.length === 0 ? (
              <EmptyHint title="No bank rows" body="Upload a statement from the Bank tab." />
            ) : (
              <Table className="min-w-0">
                <TableHeader>
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="h-9 px-4 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Date</TableHead>
                    <TableHead className="h-9 px-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Narration</TableHead>
                    <TableHead className="h-9 px-4 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-400">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banks.slice(0, 5).map((b, idx) => (
                    <motion.tr
                      key={b.id}
                      {...rowEntrance(idx)}
                      className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/80"
                    >
                      <TableCell className="num whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500">
                        {b.date}
                      </TableCell>
                      <TableCell className="max-w-[220px] px-2 py-2.5">
                        <span className="flex items-center gap-1.5 truncate text-xs text-zinc-700">
                          {b.narration}
                          {b.reconciled && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-transparent bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/15"
                            >
                              reconciled
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-right">
                        <span className={`num text-xs font-medium ${b.reconciled ? 'text-emerald-700' : 'text-zinc-900'}`}>
                          {b.credit ? money(b.credit) : b.debit ? `-${money(b.debit)}` : '—'}
                        </span>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Flags &amp; reminders</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTab('duplicates')}
              className="h-7 gap-1.5 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <ArrowsClockwise className="size-3" />
              Open flags
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {loading ? (
              <SkeletonRows n={3} />
            ) : clientData.fl.length === 0 && !reminders.some((r) => r.client_id === clientId) ? (
              <EmptyHint title="Nothing pending" body="Duplicate flags and reminder history appear here." />
            ) : (
              <Table className="min-w-0">
                <TableHeader>
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="h-9 px-4 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Item</TableHead>
                    <TableHead className="h-9 px-4 text-right text-[11px] font-medium uppercase tracking-wide text-zinc-400">State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientData.fl.slice(0, 3).map((f, idx) => (
                    <motion.tr
                      key={`f${f.id}`}
                      {...rowEntrance(idx)}
                      className="border-b border-zinc-100 transition-colors hover:bg-zinc-50/80"
                    >
                      <TableCell className="px-4 py-2.5">
                        <span className="mr-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">Flag</span>
                        <span className="num text-xs text-zinc-700">#{f.invoice_id} vs #{f.potential_duplicate_id}</span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-right">
                        <Badge
                          variant="outline"
                          className="num border-transparent bg-amber-50 font-medium text-amber-800 ring-1 ring-inset ring-amber-600/15"
                        >
                          {f.similarity_score.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                  {reminders.filter((r) => r.client_id === clientId).slice(0, 3).map((r, idx) => (
                    <motion.tr
                      key={`r${r.id}`}
                      {...rowEntrance(clientData.fl.slice(0, 3).length + idx)}
                      className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/80"
                    >
                      <TableCell className="max-w-0 px-4 py-2.5">
                        <span className="mr-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">Mail</span>
                        <span className="truncate text-xs text-zinc-700">{String(r.subject)}</span>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-right">
                        <Badge
                          variant="outline"
                          className={`border-transparent capitalize ring-1 ring-inset ${statusClass(String(r.status))}`}
                        >
                          {String(r.status)}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>

      {/* Files section */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Files</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => load()}
            className="h-7 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            Refresh
          </Button>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white px-2 py-2 shadow-sm">
          {Object.keys(folders).length === 0 ? (
            <EmptyHint title="No archived files yet" body="Upload invoices or bank statements. They appear here organized by year, month, and category." />
          ) : (
            Object.entries(folders).map(([year, months]) => (
              <TreeBranch
                key={year}
                label={<span className="num text-sm font-medium text-zinc-800">{year}</span>}
                headerClassName="px-3 py-2.5"
              >
                {Object.entries(months).map(([month, cats]) => (
                  <TreeBranch
                    key={month}
                    label={<span className="text-xs font-medium text-zinc-700">{month}</span>}
                    headerClassName="px-3 py-2"
                  >
                    {Object.entries(cats).map(([cat, files]) => (
                      <TreeBranch
                        key={cat}
                        label={<span className="text-xs uppercase tracking-wider text-zinc-600">{cat}</span>}
                        count={
                          <span className="num text-xs text-zinc-400">{files.length}</span>
                        }
                        headerClassName="px-3 py-1.5"
                      >
                        {files.map((file) => (
                          <div
                            key={file}
                            className="group/file flex items-center justify-between gap-3 rounded-md py-1 pl-4 pr-2 hover:bg-zinc-50"
                          >
                            <span className="truncate font-mono text-xs text-zinc-800">{file}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    clientId &&
                                    window.open(
                                      `/api/v1/clients/${clientId}/files/${year}/${month}/${cat}/${encodeURIComponent(file)}`,
                                      '_blank',
                                    )
                                  }
                                  className="h-7 shrink-0 gap-1 px-2 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-emerald-700"
                                >
                                  <DownloadSimple className="size-3.5" />
                                  Open
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open file</TooltipContent>
                            </Tooltip>
                          </div>
                        ))}
                      </TreeBranch>
                    ))}
                  </TreeBranch>
                ))}
              </TreeBranch>
            ))
          )}
        </div>
      </section>
    </>
  )
}

function TreeBranch({
  label,
  count,
  headerClassName,
  children,
}: {
  label: ReactNode
  count?: ReactNode
  headerClassName?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full cursor-pointer list-none select-none items-center justify-between rounded-md text-left transition-colors hover:bg-zinc-50 ${headerClassName ?? ''}`}
      >
        <span className="flex items-center gap-1.5">
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <CaretRight className="size-3.5 shrink-0 text-zinc-400" />
          </motion.span>
          {label}
        </span>
        {count}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="branch-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-5 border-l border-zinc-100 pb-1 pl-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
