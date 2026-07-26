import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Buildings,
  FileText,
  Bank,
  GitMerge,
  DownloadSimple,
  UploadSimple,
  CheckCircle,
  ArrowsClockwise,
  SquaresFour,
  Plus,
  WarningCircle,
  CircleNotch,
  Copy,
  Envelope,
} from '@phosphor-icons/react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import { api, type BankRow, type Client, type DuplicateFlag, type EmailReminder, type Invoice, type ReminderPreview, type UploadFileResult } from './api'

type Tab = 'overview' | 'client' | 'invoices' | 'bank' | 'reconcile' | 'duplicates' | 'reminders'

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

function money(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)
}

function statusClass(s: string) {
  if (s === 'approved') return 'bg-emerald-50 text-emerald-800 ring-emerald-600/15'
  if (s === 'reviewed') return 'bg-zinc-100 text-zinc-700 ring-zinc-500/10'
  return 'bg-amber-50 text-amber-900 ring-amber-600/15'
}

function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton h-10 rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  )
}

function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-start gap-1 px-5 py-14">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <p className="max-w-[40ch] text-sm leading-relaxed text-zinc-500">{body}</p>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [banks, setBanks] = useState<BankRow[]>([])
  const [clientId, setClientId] = useState<number | null>(null)
  const [scopeAll, setScopeAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [batchResults, setBatchResults] = useState<UploadFileResult[]>([])
  const [failedFiles, setFailedFiles] = useState<{ files: File[]; type: 'sales' | 'purchase' } | null>(null)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: 'ok' | 'err' }[]>([])
  const [rowBusy, setRowBusy] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<ReminderPreview[]>([])
  const [previewDays, setPreviewDays] = useState(30)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sendAllBusy, setSendAllBusy] = useState(false)
  const [matches, setMatches] = useState<Array<Record<string, unknown>>>([])
  const [flags, setFlags] = useState<DuplicateFlag[]>([])
  const [reminders, setReminders] = useState<EmailReminder[]>([])
  const [err, setErr] = useState<string | null>(null)

  const flash = (msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-3), { id, msg, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'err' ? 5000 : 2600)
  }

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [c, inv, b, f, h] = await Promise.all([
        api.clients(),
        api.invoices(scopeAll ? undefined : clientId ?? undefined),
        api.bank(clientId ?? undefined),
        api.duplicateFlags(),
        api.reminderHistory(),
      ])
      setClients(c)
      setInvoices(inv)
      setBanks(b)
      setFlags(f)
      setReminders(h)
      if (clientId == null && c[0]) setClientId(c[0].id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [clientId, scopeAll])

  useEffect(() => {
    load()
  }, [load])

  // ponytail: drop per-client UI state on switch; stale matches/results lie
  useEffect(() => {
    setMatches([])
    setBatchResults([])
    setFailedFiles(null)
  }, [clientId])

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true)
    try {
      setPreview(await api.reminderPreview(previewDays))
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Preview failed', 'err')
    } finally {
      setPreviewLoading(false)
    }
  }, [previewDays])

  useEffect(() => {
    if (tab === 'reminders') loadPreview()
  }, [tab, loadPreview])

  const sendOneReminder = async (client_id: number, name: string) => {
    setRowBusy(client_id)
    try {
      await api.sendReminder(client_id)
      flash(`Sent to ${name}`)
      await Promise.all([load(), loadPreview()])
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Send failed', 'err')
    } finally {
      setRowBusy(null)
    }
  }

  const sendAllReminders = async () => {
    setSendAllBusy(true)
    let ok = 0
    let fail = 0
    for (const p of preview) {
      if (!p.email) continue
      try {
        await api.sendReminder(p.client_id)
        ok++
      } catch {
        fail++
      }
    }
    flash(`${ok} sent${fail ? `, ${fail} failed` : ''}`, fail ? 'err' : 'ok')
    setSendAllBusy(false)
    await Promise.all([load(), loadPreview()])
  }

  const activeClient = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId]
  )

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + (i.total_amount || 0), 0)
    const pending = invoices.filter((i) => !i.approved).length
    const approved = invoices.filter((i) => i.approved).length
    const unrec = banks.filter((b) => !b.reconciled).length
    return { total, pending, approved, unrec }
  }, [invoices, banks])

  const clientData = useMemo(() => {
    const inv = invoices.filter((i) => i.client_id === clientId)
    const ids = new Set(inv.map((i) => i.id))
    const fl = flags.filter((f) => ids.has(f.invoice_id) || ids.has(f.potential_duplicate_id))
    const vol = inv.reduce((s, i) => s + (i.total_amount || 0), 0)
    return { inv, fl, vol }
  }, [invoices, flags, clientId])

  const chartData = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of invoices) {
      const k = i.company_name || 'Other'
      map.set(k, (map.get(k) || 0) + (i.total_amount || 0))
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name: name.slice(0, 16), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [invoices])

  const onUploadInvoices = async (files: File[], type: 'sales' | 'purchase') => {
    if (files.length === 0) return
    if (clientId == null) {
      flash('Select a client first')
      return
    }
    setUploadBusy(true)
    setBatchResults([])
    setFailedFiles(null)
    try {
      const results = await api.uploadInvoices(files, type, clientId)
      setBatchResults(results)
      const failedNames = new Set(results.filter((r) => r.status !== 'ok').map((r) => r.filename))
      const retry = files.filter((f) => failedNames.has(f.name))
      if (retry.length > 0) setFailedFiles({ files: retry, type })
      const ok = results.length - retry.length
      flash(`${ok} extracted, ${retry.length} failed`)
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Upload failed', 'err')
    } finally {
      setUploadBusy(false)
    }
  }

  const startEdit = (inv: Invoice) => {
    setEditingId(inv.id)
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
      flash(`Saved ${draft.invoice_number || inv.id}`)
      setEditingId(null)
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setRowBusy(null)
    }
  }

  const onUploadBank = async (f: File | null) => {
    if (!f || clientId == null) {
      flash('Select a client first')
      return
    }
    setBusy(true)
    try {
      const r = await api.uploadBank(f, clientId)
      flash(`Imported ${r.imported} rows`)
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Bank upload failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof SquaresFour }[] = [
    { id: 'overview', label: 'Overview', icon: SquaresFour },
    ...(activeClient
      ? [{ id: 'client' as Tab, label: activeClient.name.split(' ')[0], icon: Buildings }]
      : []),
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'bank', label: 'Bank', icon: Bank },
    { id: 'reconcile', label: 'Reconcile', icon: GitMerge },
    { id: 'duplicates', label: 'Duplicates', icon: Copy },
    { id: 'reminders', label: 'Reminders', icon: Envelope },
  ]

  return (
    <div className="relative min-h-[100dvh] bg-zinc-100 text-zinc-900">
      <div className="grain-fixed" aria-hidden />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-[1400px] grid-cols-1 gap-0 md:grid-cols-[220px_1fr]">
        {/* side nav — left aligned, no glass neon */}
        <aside className="border-b border-zinc-200 bg-white md:sticky md:top-0 md:h-[100dvh] md:border-b-0 md:border-r">
          <div className="flex h-full flex-col px-4 py-5 md:px-5">
            <div className="mb-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                Workspace
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">FFAA</h1>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">Books · GST · Tally</p>
            </div>

            <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              {tabs.map((t) => {
                const Icon = t.icon
                const on = tab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition active:scale-[0.98] ${
                      on
                        ? 'bg-zinc-900 font-medium text-white'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <Icon weight={on ? 'fill' : 'regular'} className="h-[18px] w-[18px]" />
                    {t.label}
                  </button>
                )
              })}
            </nav>

            <div className="mt-6 space-y-2 border-t border-zinc-100 pt-5 md:mt-auto">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Client
              </label>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-sm text-zinc-800 outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                value={clientId ?? ''}
                onChange={(e) => setClientId(Number(e.target.value) || null)}
              >
                {clients.length === 0 && <option value="">None</option>}
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {activeClient && (
                <div className="space-y-2 pt-1">
                  <input
                    type="email"
                    placeholder="client@email.com"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-800 outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                    value={activeClient.email || ''}
                    onChange={async (e) => {
                      const email = e.target.value
                      setClients((prev) =>
                        prev.map((c) => (c.id === activeClient.id ? { ...c, email } : c))
                      )
                    }}
                    onBlur={async (e) => {
                      try {
                        await api.updateClient(activeClient.id, { email: e.target.value })
                      } catch (e) {
                        flash(e instanceof Error ? e.message : 'Save failed', 'err')
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy || !activeClient.email}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await api.sendReminder(activeClient.id)
                        flash('Reminder sent')
                        load()
                      } catch (e) {
                        flash(e instanceof Error ? e.message : 'Send failed', 'err')
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Envelope className="h-3.5 w-3.5" />
                    Send reminder
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setLoading(true)
                  load()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 active:scale-[0.98]"
              >
                <ArrowsClockwise className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-col gap-4 border-b border-zinc-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-medium text-emerald-700">Human review required</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 md:text-[1.75rem]">
                {tab === 'overview' && 'Practice overview'}
                {tab === 'client' && (activeClient?.name ?? 'Client')}
                {tab === 'invoices' && 'Invoice queue'}
                {tab === 'bank' && 'Bank lines'}
                {tab === 'reconcile' && 'Match ledger'}
                {tab === 'duplicates' && 'Duplicate review'}
                {tab === 'reminders' && 'Client reminders'}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                {tab === 'client'
                  ? [activeClient?.gst_number && `GSTIN ${activeClient.gst_number}`, activeClient?.address]
                      .filter(Boolean)
                      .join(' · ') || 'Client workspace — files, books, flags.'
                  : 'OCR extract, correct, approve, then export Tally XML. No paid APIs.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeClient && (
                <span className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600">
                  {activeClient.name}
                </span>
              )}
              <a
                href={api.tallyUrl(clientId ?? undefined)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98]"
              >
                <DownloadSimple className="h-4 w-4" />
                Tally XML
              </a>
            </div>
          </header>

          {err && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
              <span>
                Cannot reach API on port 8000.{' '}
                <span className="font-mono text-xs opacity-80">{err.slice(0, 100)}</span>
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {tab === 'overview' && (
              <motion.div
                key="ov"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="space-y-8"
              >
                <div className="flex items-center justify-end gap-2 text-xs">
                  <span className="text-zinc-500">{scopeAll ? 'All clients' : activeClient?.name ?? 'All clients'}</span>
                  <button
                    type="button"
                    onClick={() => setScopeAll((v) => !v)}
                    className={`relative h-5 w-9 rounded-full transition ${scopeAll ? 'bg-emerald-600' : 'bg-zinc-300'}`}
                    aria-pressed={scopeAll}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        scopeAll ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                {/* metrics — no 3 equal cards; 2+2 asymmetric via grid */}
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 lg:grid-cols-4">
                  {[
                    { label: 'Booked volume', value: money(stats.total), mono: true },
                    { label: 'Pending review', value: String(stats.pending), mono: true },
                    { label: 'Approved', value: String(stats.approved), mono: true },
                    { label: 'Open bank lines', value: String(stats.unrec), mono: true },
                  ].map((m) => (
                    <div key={m.label} className="bg-white px-5 py-5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        {m.label}
                      </p>
                      <p
                        className={`mt-2 text-2xl font-semibold tracking-tight text-zinc-900 ${m.mono ? 'num' : ''}`}
                      >
                        {loading ? '—' : m.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
                  <section>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold text-zinc-900">Volume by party</h3>
                      <span className="text-xs text-zinc-400">{invoices.length} invoices</span>
                    </div>
                    <div className="surface rounded-2xl p-5">
                      {loading ? (
                        <div className="skeleton h-56 rounded-xl" />
                      ) : chartData.length === 0 ? (
                        <EmptyHint
                          title="No volume yet"
                          body="Upload a sales or purchase invoice. Totals group by company name from OCR."
                        />
                      ) : (
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barCategoryGap="28%">
                              <XAxis
                                dataKey="name"
                                tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'Geist' }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'Geist Mono' }}
                                axisLine={false}
                                tickLine={false}
                                width={40}
                                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                              />
                              <Tooltip
                                cursor={{ fill: '#f4f4f5' }}
                                contentStyle={{
                                  background: '#fff',
                                  border: '1px solid #e4e4e7',
                                  borderRadius: 10,
                                  fontSize: 12,
                                  boxShadow: '0 8px 24px -12px rgba(0,0,0,0.12)',
                                }}
                                formatter={(v) => money(Number(v))}
                              />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                {chartData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={i === 0 ? '#059669' : '#d4d4d8'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold text-zinc-900">Clients</h3>
                      <Buildings className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div className="surface divide-y divide-zinc-100 rounded-2xl">
                      {loading ? (
                        <SkeletonRows n={3} />
                      ) : clients.length === 0 ? (
                        <EmptyHint
                          title="No clients"
                          body="Created automatically from invoice company name, or add one below."
                        />
                      ) : (
                        clients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setClientId(c.id)
                              setTab('client')
                            }}
                            className={`flex w-full items-center justify-between px-4 py-3.5 text-left text-sm transition hover:bg-zinc-50 active:scale-[0.995] ${
                              clientId === c.id ? 'bg-emerald-50/60' : ''
                            }`}
                          >
                            <span className="font-medium text-zinc-800">{c.name}</span>
                            {clientId === c.id && (
                              <span className="text-[11px] font-medium text-emerald-700">Active</span>
                            )}
                          </button>
                        ))
                      )}
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
                        onClick={async () => {
                          const name = window.prompt('Client name')
                          if (!name?.trim()) return
                          try {
                            await api.createClient(name.trim())
                            flash('Client added')
                            load()
                          } catch (e) {
                            flash(e instanceof Error ? e.message : 'Failed', 'err')
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Add client
                      </button>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {tab === 'client' && activeClient && (
              <motion.div
                key="cli"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="space-y-8"
              >
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 lg:grid-cols-4">
                  {[
                    { label: 'Volume', value: money(clientData.vol) },
                    { label: 'Invoices', value: String(clientData.inv.length) },
                    { label: 'Pending review', value: String(clientData.inv.filter((i) => !i.approved).length) },
                    { label: 'Open bank lines', value: String(banks.filter((b) => !b.reconciled).length) },
                  ].map((m) => (
                    <div key={m.label} className="bg-white px-5 py-5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{m.label}</p>
                      <p className="num mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
                        {loading ? '—' : m.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
                  <section className="surface rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-zinc-900">Details</h3>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-zinc-500">GSTIN</dt>
                        <dd className="num text-zinc-800">{activeClient.gst_number || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-zinc-500">Address</dt>
                        <dd className="text-right text-zinc-800">{activeClient.address || '—'}</dd>
                      </div>
                    </dl>
                    <label className="mt-4 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="client@email.com"
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-800 outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                      value={activeClient.email || ''}
                      onChange={(e) => {
                        const email = e.target.value
                        setClients((prev) =>
                          prev.map((c) => (c.id === activeClient.id ? { ...c, email } : c))
                        )
                      }}
                      onBlur={async (e) => {
                        try {
                          await api.updateClient(activeClient.id, { email: e.target.value })
                        } catch (e) {
                          flash(e instanceof Error ? e.message : 'Save failed', 'err')
                        }
                      }}
                    />
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !activeClient.email}
                        onClick={async () => {
                          setBusy(true)
                          try {
                            await api.sendReminder(activeClient.id)
                            flash('Reminder sent')
                            load()
                          } catch (e) {
                            flash(e instanceof Error ? e.message : 'Send failed', 'err')
                          } finally {
                            setBusy(false)
                          }
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
                      >
                        <Envelope className="h-3.5 w-3.5" />
                        Send reminder
                      </button>
                      <a
                        href={api.tallyUrl(activeClient.id)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 active:scale-[0.98]"
                      >
                        <DownloadSimple className="h-3.5 w-3.5" />
                        Tally XML
                      </a>
                    </div>
                  </section>

                  <section>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold text-zinc-900">Invoices</h3>
                      <button
                        type="button"
                        onClick={() => setTab('invoices')}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        Open queue
                      </button>
                    </div>
                    <div className="surface divide-y divide-zinc-100 rounded-2xl">
                      {loading ? (
                        <SkeletonRows n={3} />
                      ) : clientData.inv.length === 0 ? (
                        <EmptyHint title="No invoices" body="Upload sales or purchase files from the Invoices tab." />
                      ) : (
                        clientData.inv.slice(0, 6).map((i) => (
                          <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <div className="min-w-0">
                              <p className="num truncate text-xs text-zinc-700">{i.invoice_number || '—'}</p>
                              <p className="truncate text-xs text-zinc-500">{i.company_name}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="num font-medium text-zinc-900">{money(i.total_amount)}</span>
                              <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusClass(i.status)}`}>
                                {i.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <section>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h3 className="text-sm font-semibold text-zinc-900">Bank lines</h3>
                      <button
                        type="button"
                        onClick={() => setTab('bank')}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        Open bank
                      </button>
                    </div>
                    <div className="surface divide-y divide-zinc-100 rounded-2xl">
                      {loading ? (
                        <SkeletonRows n={3} />
                      ) : banks.length === 0 ? (
                        <EmptyHint title="No bank rows" body="Upload a statement from the Bank tab." />
                      ) : (
                        banks.slice(0, 5).map((b) => (
                          <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <div className="min-w-0">
                              <p className="num text-xs text-zinc-500">{b.date}</p>
                              <p className="truncate text-xs text-zinc-700">{b.narration}</p>
                            </div>
                            <span className={`num shrink-0 text-xs font-medium ${b.reconciled ? 'text-emerald-700' : 'text-zinc-900'}`}>
                              {b.credit ? money(b.credit) : b.debit ? `-${money(b.debit)}` : '—'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-3 text-sm font-semibold text-zinc-900">Flags &amp; reminders</h3>
                    <div className="surface divide-y divide-zinc-100 rounded-2xl">
                      {loading ? (
                        <SkeletonRows n={3} />
                      ) : clientData.fl.length === 0 && !reminders.some((r) => r.client_id === clientId) ? (
                        <EmptyHint title="Nothing pending" body="Duplicate flags and reminder history appear here." />
                      ) : (
                        <>
                          {clientData.fl.slice(0, 3).map((f) => (
                            <div key={`f${f.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                              <p className="text-xs text-zinc-700">
                                Duplicate: #{f.invoice_id} vs #{f.potential_duplicate_id}
                              </p>
                              <span className="num shrink-0 text-xs font-medium text-amber-700">
                                {f.similarity_score.toFixed(0)}%
                              </span>
                            </div>
                          ))}
                          {reminders.filter((r) => r.client_id === clientId).slice(0, 3).map((r) => (
                            <div key={`r${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                              <p className="truncate text-xs text-zinc-700">{String(r.subject)}</p>
                              <span className={`shrink-0 text-xs font-medium ${r.status === 'sent' ? 'text-emerald-700' : r.status === 'failed' ? 'text-red-700' : 'text-zinc-500'}`}>
                                {String(r.status)}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {tab === 'invoices' && (
              <motion.div
                key="inv"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="space-y-4"
              >
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
                  <div className="flex flex-wrap gap-2">
                    {(['sales', 'purchase'] as const).map((t) => (
                      <label key={t} className={clientId == null ? 'opacity-50' : 'cursor-pointer'}>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          multiple
                          className="hidden"
                          disabled={uploadBusy || clientId == null}
                          onChange={(e) => {
                            const fs = Array.from(e.target.files ?? [])
                            e.target.value = ''
                            onUploadInvoices(fs, t)
                          }}
                        />
                        <span
                          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium shadow-sm transition active:scale-[0.98] ${
                            t === 'sales'
                              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                              : 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
                          }`}
                        >
                          {uploadBusy ? (
                            <CircleNotch className="h-4 w-4 animate-spin" />
                          ) : (
                            <UploadSimple className="h-4 w-4" weight="bold" />
                          )}
                          Upload {t}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {batchResults.length > 0 && (
                  <div className="surface divide-y divide-zinc-100 rounded-2xl">
                    <div className="flex items-center justify-between px-4 py-3">
                      <p className="text-xs font-medium text-zinc-700">
                        Batch result — {batchResults.filter((r) => r.status === 'ok').length} ok,{' '}
                        {batchResults.filter((r) => r.status !== 'ok').length} failed
                      </p>
                      {failedFiles && (
                        <button
                          type="button"
                          disabled={uploadBusy}
                          onClick={() => onUploadInvoices(failedFiles.files, failedFiles.type)}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:border-amber-600/30 hover:text-amber-800 active:scale-[0.98] disabled:opacity-50"
                        >
                          <ArrowsClockwise className="h-3.5 w-3.5" />
                          Retry {failedFiles.files.length} failed
                        </button>
                      )}
                    </div>
                    {batchResults.map((r, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                        <span className="truncate text-zinc-700">{r.filename}</span>
                        {r.status === 'ok' ? (
                          <span className="shrink-0 font-medium text-emerald-700">
                            {r.invoice?.invoice_number ? `#${r.invoice.invoice_number} ` : ''}pending review
                          </span>
                        ) : (
                          <span className="shrink-0 text-red-700">{(r.error || 'failed').slice(0, 60)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="surface overflow-hidden rounded-2xl">
                  {loading ? (
                    <SkeletonRows n={5} />
                  ) : invoices.length === 0 ? (
                    <EmptyHint
                      title="Queue empty"
                      body="Use Upload invoice for a scan or PDF. Fields land here for review before approve."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-100 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                            <th className="px-5 py-3">Number</th>
                            <th className="px-3 py-3">Party</th>
                            <th className="px-3 py-3">Date</th>
                            <th className="px-3 py-3">Amount</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">OCR</th>
                            <th className="px-5 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {invoices.map((inv) => (
                            <Fragment key={inv.id}>
                            <tr className="hover:bg-zinc-50/80">
                              <td className="num px-5 py-3.5 text-xs text-zinc-700">
                                {inv.invoice_number || '—'}
                              </td>
                              <td className="px-3 py-3.5 font-medium text-zinc-900">
                                {inv.company_name}
                              </td>
                              <td className="num px-3 py-3.5 text-zinc-500">
                                {inv.invoice_date || '—'}
                              </td>
                              <td className="num px-3 py-3.5 font-medium">
                                {money(inv.total_amount)}
                              </td>
                              <td className="px-3 py-3.5">
                                <span
                                  className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusClass(inv.status)}`}
                                >
                                  {inv.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="num px-3 py-3.5">
                                {inv.ocr_confidence != null ? (
                                  <span
                                    className={`inline-flex items-center gap-1 ${
                                      inv.ocr_confidence < 0.75 ? 'font-medium text-amber-700' : 'text-zinc-500'
                                    }`}
                                    title={inv.ocr_confidence < 0.75 ? 'Low OCR confidence — verify fields' : undefined}
                                  >
                                    {inv.ocr_confidence < 0.75 && (
                                      <WarningCircle className="h-3.5 w-3.5" weight="fill" />
                                    )}
                                    {Math.round(inv.ocr_confidence * 100)}%
                                  </span>
                                ) : (
                                  <span className="text-zinc-500">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={rowBusy === inv.id}
                                    onClick={() => (editingId === inv.id ? setEditingId(null) : startEdit(inv))}
                                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:border-zinc-400 active:scale-[0.98] disabled:opacity-50"
                                  >
                                    {editingId === inv.id ? 'Close' : 'Edit'}
                                  </button>
                                  {!inv.approved && (
                                    <button
                                      type="button"
                                      disabled={rowBusy === inv.id}
                                      onClick={async () => {
                                        setRowBusy(inv.id)
                                        try {
                                          await api.approve(inv.id)
                                          flash(`Approved ${inv.invoice_number || inv.id}`)
                                          load()
                                        } catch (e) {
                                          flash(e instanceof Error ? e.message : 'Approve failed', 'err')
                                        } finally {
                                          setRowBusy(null)
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:border-emerald-600/30 hover:text-emerald-800 active:scale-[0.98] disabled:opacity-50"
                                    >
                                      {rowBusy === inv.id ? (
                                        <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-3.5 w-3.5" weight="bold" />
                                      )}
                                      Approve
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={rowBusy === inv.id}
                                    onClick={async () => {
                                      setRowBusy(inv.id)
                                      try {
                                        const r = await api.checkDuplicates(inv.id)
                                        flash(`${r.flags_created} duplicate flag(s)`)
                                        load()
                                      } catch (e) {
                                        flash(e instanceof Error ? e.message : 'Scan failed', 'err')
                                      } finally {
                                        setRowBusy(null)
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:border-amber-600/30 hover:text-amber-800 active:scale-[0.98] disabled:opacity-50"
                                  >
                                    {rowBusy === inv.id ? (
                                      <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                    Scan
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {editingId === inv.id && (
                              <tr className="bg-zinc-50/60">
                                <td colSpan={7} className="px-5 py-4">
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
                                      <label key={key} className="block">
                                        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                                          {label}
                                        </span>
                                        <input
                                          type={type}
                                          value={draft[key] ?? ''}
                                          onChange={(e) =>
                                            setDraft((d) => ({ ...d, [key]: e.target.value }))
                                          }
                                          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                                        />
                                      </label>
                                    ))}
                                    <label className="col-span-2 block md:col-span-4">
                                      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                                        Item description
                                      </span>
                                      <input
                                        type="text"
                                        value={draft.item_description ?? ''}
                                        onChange={(e) =>
                                          setDraft((d) => ({ ...d, item_description: e.target.value }))
                                        }
                                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-emerald-600/40 focus:ring-2 focus:ring-emerald-600/15"
                                      />
                                    </label>
                                  </div>
                                  <div className="mt-3 flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={rowBusy === inv.id}
                                      onClick={() => saveEdit(inv)}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
                                    >
                                      {rowBusy === inv.id && (
                                        <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                                      )}
                                      Save review
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === 'bank' && (
              <motion.div
                key="bank"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-zinc-500">
                    CSV, TXT, or PDF for the active client.
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".csv,.txt,.pdf"
                      className="hidden"
                      disabled={busy || clientId == null}
                      onChange={(e) => onUploadBank(e.target.files?.[0] ?? null)}
                    />
                    <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98]">
                      <UploadSimple className="h-4 w-4" />
                      Upload statement
                    </span>
                  </label>
                </div>
                <div className="surface overflow-hidden rounded-2xl">
                  {loading ? (
                    <SkeletonRows />
                  ) : banks.length === 0 ? (
                    <EmptyHint
                      title="No bank rows"
                      body="Upload a statement file. Debit, credit, and narration feed reconciliation."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-100 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                            <th className="px-5 py-3">Date</th>
                            <th className="px-3 py-3">Narration</th>
                            <th className="px-3 py-3">Debit</th>
                            <th className="px-3 py-3">Credit</th>
                            <th className="px-5 py-3">State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {banks.map((b) => (
                            <tr key={b.id} className="hover:bg-zinc-50/80">
                              <td className="num px-5 py-3.5 text-zinc-600">{b.date}</td>
                              <td className="max-w-xs truncate px-3 py-3.5 text-zinc-800">
                                {b.narration}
                              </td>
                              <td className="num px-3 py-3.5 text-zinc-600">
                                {b.debit ? money(b.debit) : '—'}
                              </td>
                              <td className="num px-3 py-3.5 text-zinc-900">
                                {b.credit ? money(b.credit) : '—'}
                              </td>
                              <td className="px-5 py-3.5 text-xs font-medium">
                                <span
                                  className={
                                    b.reconciled ? 'text-emerald-700' : 'text-zinc-400'
                                  }
                                >
                                  {b.reconciled ? 'Matched' : 'Open'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === 'duplicates' && (
              <motion.div
                key="dups"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="space-y-5"
              >
                <div className="surface rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-zinc-900">Duplicate flags</h3>
                  <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-zinc-500">
                    RapidFuzz scored on invoice number, company, amount, date. Accept marks invoice as duplicate; reject clears flag.
                  </p>
                </div>
                <div className="surface overflow-hidden rounded-2xl">
                  {loading ? (
                    <SkeletonRows />
                  ) : flags.length === 0 ? (
                    <EmptyHint
                      title="No flags"
                      body="Click Scan on an invoice row to compare it against existing invoices."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-100 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                            <th className="px-5 py-3">Invoice</th>
                            <th className="px-3 py-3">Potential duplicate</th>
                            <th className="px-3 py-3">Score</th>
                            <th className="px-3 py-3">Matched fields</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-5 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {flags.map((f) => (
                            <tr key={f.id} className="hover:bg-zinc-50/80">
                              <td className="px-5 py-3.5 text-xs text-zinc-700">
                                #{f.invoice_id}
                              </td>
                              <td className="px-3 py-3.5 text-xs text-zinc-700">
                                #{f.potential_duplicate_id}
                              </td>
                              <td className="px-3 py-3.5 font-medium text-zinc-900">
                                {f.similarity_score.toFixed(1)}%
                              </td>
                              <td className="px-3 py-3.5 text-xs text-zinc-500">
                                {f.matched_fields}
                              </td>
                              <td className="px-3 py-3.5">
                                <span
                                  className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusClass(f.status)}`}
                                >
                                  {f.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                {f.status === 'pending' && (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      disabled={rowBusy === f.id}
                                      onClick={async () => {
                                        setRowBusy(f.id)
                                        try {
                                          await api.resolveDuplicate(f.id, 'reject')
                                          flash('Flag rejected')
                                          load()
                                        } catch (e) {
                                          flash(e instanceof Error ? e.message : 'Failed', 'err')
                                        } finally {
                                          setRowBusy(null)
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:border-red-600/30 hover:text-red-800 active:scale-[0.98] disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      disabled={rowBusy === f.id}
                                      onClick={async () => {
                                        setRowBusy(f.id)
                                        try {
                                          await api.resolveDuplicate(f.id, 'accept')
                                          flash('Marked duplicate')
                                          load()
                                        } catch (e) {
                                          flash(e instanceof Error ? e.message : 'Failed', 'err')
                                        } finally {
                                          setRowBusy(null)
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:border-emerald-600/30 hover:text-emerald-800 active:scale-[0.98] disabled:opacity-50"
                                    >
                                      {rowBusy === f.id ? (
                                        <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                                      ) : null}
                                      Accept
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === 'reminders' && (
              <motion.div
                key="rem"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="space-y-5"
              >
                <div className="surface rounded-2xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">Overdue clients</h3>
                      <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-zinc-500">
                        Clients with no uploads in the window. Message lists their missing documents.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-lg border border-zinc-200 p-0.5">
                        {[7, 14, 30].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setPreviewDays(d)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                              previewDays === d ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={sendAllBusy || previewLoading || preview.filter((p) => p.email).length === 0}
                        onClick={sendAllReminders}
                        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-40"
                      >
                        {sendAllBusy ? (
                          <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Envelope className="h-3.5 w-3.5" />
                        )}
                        Send all ({preview.filter((p) => p.email).length})
                      </button>
                    </div>
                  </div>
                </div>

                <div className="surface divide-y divide-zinc-100 rounded-2xl">
                  {previewLoading ? (
                    <SkeletonRows n={3} />
                  ) : preview.length === 0 ? (
                    <EmptyHint
                      title="Nobody overdue"
                      body={`Every client uploaded something in the last ${previewDays} days. Widen the window to check further back.`}
                    />
                  ) : (
                    preview.map((p) => (
                      <div key={p.client_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-zinc-900">{p.name}</p>
                            {p.email ? (
                              <span className="text-[11px] text-zinc-400">{p.email}</span>
                            ) : (
                              <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/15">
                                no email
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {p.missing_docs.map((d) => (
                              <span
                                key={d}
                                className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/15"
                              >
                                {d}
                              </span>
                            ))}
                            <span className="text-[11px] text-zinc-400">
                              {p.days_since_upload != null
                                ? `last upload ${p.days_since_upload}d ago`
                                : 'no uploads yet'}
                            </span>
                          </div>
                          <p className="mt-1.5 truncate text-xs text-zinc-500">{p.subject}</p>
                        </div>
                        <button
                          type="button"
                          disabled={!p.email || rowBusy === p.client_id || sendAllBusy}
                          onClick={() => sendOneReminder(p.client_id, p.name)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-emerald-600/30 hover:text-emerald-800 active:scale-[0.98] disabled:opacity-40"
                        >
                          {rowBusy === p.client_id ? (
                            <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Envelope className="h-3.5 w-3.5" />
                          )}
                          Send
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="surface rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-zinc-900">Reminder history</h3>
                  <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-zinc-500">
                    All clients. Sent, failed, and pending attempts.
                  </p>
                </div>
                <div className="surface overflow-hidden rounded-2xl">
                  {loading ? (
                    <SkeletonRows />
                  ) : reminders.length === 0 ? (
                      <EmptyHint
                        title="No reminders"
                        body="Send from the overdue list above or from a client page."
                      />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-100 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                            <th className="px-5 py-3">Client</th>
                            <th className="px-3 py-3">Subject</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Sent</th>
                            <th className="px-5 py-3">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {reminders.map((r) => (
                            <tr key={r.id} className="hover:bg-zinc-50/80">
                              <td className="px-5 py-3.5 text-xs font-medium text-zinc-700">
                                {clients.find((c) => c.id === r.client_id)?.name ?? `#${r.client_id}`}
                              </td>
                              <td className="px-3 py-3.5 text-xs text-zinc-700">
                                {String(r.subject)}
                              </td>
                              <td className="px-3 py-3.5">
                                <span
                                  className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusClass(String(r.status))}`}
                                >
                                  {String(r.status)}
                                </span>
                              </td>
                              <td className="px-3 py-3.5 text-xs text-zinc-500">
                                {r.sent_at ? new Date(String(r.sent_at)).toLocaleString() : '—'}
                              </td>
                              <td className="px-5 py-3.5 text-xs text-red-700">
                                {r.error_message ? String(r.error_message).slice(0, 60) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === 'reconcile' && (
              <motion.div
                key="rec"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="space-y-5"
              >
                <div className="surface rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-zinc-900">Match run</h3>
                  <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-zinc-500">
                    Amount equality, date within three days, narration score via RapidFuzz.
                    Preview first; confirm writes reconciliation rows.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={clientId == null || busy}
                      onClick={async () => {
                        if (clientId == null) return
                        setBusy(true)
                        try {
                          const r = await api.reconcile(clientId, false)
                          setMatches(r.matches)
                          flash(`${r.matches.length} candidate${r.matches.length === 1 ? '' : 's'}`)
                        } catch (e) {
                          flash(e instanceof Error ? e.message : 'Failed', 'err')
                        } finally {
                          setBusy(false)
                        }
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-40"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      disabled={clientId == null || busy || matches.length === 0}
                      onClick={async () => {
                        if (clientId == null) return
                        setBusy(true)
                        try {
                          const r = await api.reconcile(clientId, true)
                          setMatches(r.matches)
                          flash('Confirmed')
                          load()
                        } catch (e) {
                          flash(e instanceof Error ? e.message : 'Failed', 'err')
                        } finally {
                          setBusy(false)
                        }
                      }}
                      className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-40"
                    >
                      Confirm matches
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  {matches.length === 0 ? (
                    <EmptyHint
                      title="No candidates"
                      body="Approve invoices and import open bank lines, then run preview."
                    />
                  ) : (
                    matches.map((m) => (
                      <div
                        key={`${m.invoice_id}-${m.bank_statement_id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="num text-sm font-medium text-zinc-900">
                            {String(m.invoice_number)}
                          </p>
                          <p className="mt-0.5 max-w-md truncate text-xs text-zinc-500">
                            {String(m.narration)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="num text-sm font-semibold">{money(Number(m.amount))}</p>
                          <p className="num mt-0.5 text-xs text-zinc-400">
                            {Number(m.match_score).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={spring}
              className={`pointer-events-auto flex w-auto max-w-full items-start gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-[0_12px_40px_-16px_rgba(0,0,0,0.2)] ${
                t.kind === 'err'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-zinc-200 bg-white text-zinc-800'
              }`}
            >
              {t.kind === 'err' && <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />}
              <span className="break-words">{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
