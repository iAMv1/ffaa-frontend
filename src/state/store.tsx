import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  Bank,
  Buildings,
  Copy,
  Envelope,
  FileText,
  GitMerge,
  SquaresFour,
} from '@phosphor-icons/react'
import { api, type BankRow, type Client, type DuplicateFlag, type EmailReminder, type Invoice, type Reconciliation, type ReminderPreview, type UploadFileResult } from '@/api'
import type { ConfirmState, MatchCandidate, Tab } from '@/state/types'

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.pdf']

export type TabItem = { id: Tab; label: string; icon: typeof SquaresFour }

export interface AppStore {
  tab: Tab
  setTab: (t: Tab) => void
  clients: Client[]
  setClients: Dispatch<SetStateAction<Client[]>>
  invoices: Invoice[]
  banks: BankRow[]
  clientId: number | null
  setClientId: Dispatch<SetStateAction<number | null>>
  scopeAll: boolean
  setScopeAll: Dispatch<SetStateAction<boolean>>
  busy: boolean
  setBusy: Dispatch<SetStateAction<boolean>>
  uploadBusy: boolean
  batchResults: UploadFileResult[]
  failedFiles: { files: File[]; type: 'sales' | 'purchase' } | null
  loading: boolean
  toasts: { id: number; msg: string; kind: 'ok' | 'err' }[]
  rowBusy: number | null
  setRowBusy: Dispatch<SetStateAction<number | null>>
  editingId: number | null
  setEditingId: Dispatch<SetStateAction<number | null>>
  draft: Record<string, string>
  setDraft: Dispatch<SetStateAction<Record<string, string>>>
  fieldErrors: Record<string, string>
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>
  preview: ReminderPreview[]
  previewDays: number
  setPreviewDays: Dispatch<SetStateAction<number>>
  previewLoading: boolean
  sendAllBusy: boolean
  matches: MatchCandidate[]
  setMatches: Dispatch<SetStateAction<MatchCandidate[]>>
  reconHistory: Reconciliation[]
  flags: DuplicateFlag[]
  reminders: EmailReminder[]
  folders: Record<string, Record<string, Record<string, string[]>>>
  err: string | null
  sidebarCollapsed: boolean
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>
  sidebarOpen: boolean
  setSidebarOpen: Dispatch<SetStateAction<boolean>>
  showCreateClient: boolean
  setShowCreateClient: Dispatch<SetStateAction<boolean>>
  newClientName: string
  setNewClientName: Dispatch<SetStateAction<string>>
  emailError: string
  setEmailError: Dispatch<SetStateAction<string>>
  confirm: ConfirmState | null
  setConfirm: Dispatch<SetStateAction<ConfirmState | null>>
  dragOverType: 'sales' | 'purchase' | null
  setDragOverType: Dispatch<SetStateAction<'sales' | 'purchase' | null>>
  bankDragOver: boolean
  setBankDragOver: Dispatch<SetStateAction<boolean>>
  clientPopoverOpen: boolean
  setClientPopoverOpen: Dispatch<SetStateAction<boolean>>
  bankPreviewRows: BankRow[]
  setBankPreviewRows: Dispatch<SetStateAction<BankRow[]>>
  bankPreviewFile: File | null
  setBankPreviewFile: Dispatch<SetStateAction<File | null>>
  flash: (msg: string, kind?: 'ok' | 'err') => void
  load: () => Promise<void>
  createClient: (e: FormEvent) => Promise<void>
  loadPreview: () => Promise<void>
  sendOneReminder: (client_id: number, name: string) => Promise<void>
  sendAllReminders: () => Promise<void>
  activeClient: Client | undefined
  stats: { total: number; pending: number; approved: number; unrec: number }
  clientData: { inv: Invoice[]; fl: DuplicateFlag[]; vol: number }
  chartData: { name: string; value: number }[]
  onUploadInvoices: (files: File[], type: 'sales' | 'purchase') => Promise<void>
  startEdit: (inv: Invoice) => void
  saveEdit: (inv: Invoice) => Promise<void>
  onUploadBank: (f: File | null) => Promise<void>
  commitBankPreview: () => Promise<void>
  tabs: TabItem[]
}

function useAppState(): AppStore {
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<ReminderPreview[]>([])
  const [previewDays, setPreviewDays] = useState(30)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sendAllBusy, setSendAllBusy] = useState(false)
  const [matches, setMatches] = useState<MatchCandidate[]>([])
  const [reconHistory, setReconHistory] = useState<Reconciliation[]>([])
  const [flags, setFlags] = useState<DuplicateFlag[]>([])
  const [reminders, setReminders] = useState<EmailReminder[]>([])
  const [folders, setFolders] = useState<Record<string, Record<string, Record<string, string[]>>>>({})
  const [err, setErr] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [emailError, setEmailError] = useState('')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [dragOverType, setDragOverType] = useState<'sales' | 'purchase' | null>(null)
  const [bankDragOver, setBankDragOver] = useState(false)
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false)

  const flash = (msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-3), { id, msg, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'err' ? 5000 : 3000)
  }

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [c, inv, b, f, h, rec] = await Promise.all([
        api.clients(),
        api.invoices(scopeAll ? undefined : clientId ?? undefined),
        api.bank(scopeAll ? undefined : clientId ?? undefined),
        api.duplicateFlags(),
        api.reminderHistory(),
        api.reconciliations(clientId ?? undefined),
      ])
      setClients(c)
      setInvoices(inv)
      setBanks(b)
      setFlags(f)
      setReminders(h)
      setReconHistory(rec)
      if (clientId == null && c[0]) setClientId(c[0].id)
      if (clientId) {
        try {
          const fd = await api.folders(clientId)
          setFolders(fd.folders)
        } catch {
          setFolders({})
        }
      } else {
        setFolders({})
      }
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
    setEmailError('')
    setBankDragOver(false)
  }, [clientId])

  // mobile drawer closes on tab pick
  useEffect(() => {
    setSidebarOpen(false)
  }, [tab])

  useEffect(() => {
    if (!showCreateClient) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCreateClient(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [showCreateClient])

  const createClient = async (e: FormEvent) => {
    e.preventDefault()
    const name = newClientName.trim()
    if (!name) return
    setBusy(true)
    try {
      const c = await api.createClient(name)
      setNewClientName('')
      setShowCreateClient(false)
      flash('Client added')
      await load()
      if (c?.id) setClientId(c.id)
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed', 'err')
    } finally {
      setBusy(false)
    }
  }

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
    const byCompany = new Map<string, number>()
    for (const i of invoices) {
      const k = i.company_name || 'Other'
      byCompany.set(k, (byCompany.get(k) || 0) + (i.total_amount || 0))
    }
    return [...byCompany.entries()]
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
    const filtered = files.filter(f => ALLOWED_EXT.some(e => f.name.toLowerCase().endsWith(e)))
    const rejected = files.length - filtered.length
    if (rejected > 0) flash(`${rejected} file(s) skipped (unsupported type)`, 'err')
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
      flash(`Saved ${draft.invoice_number || inv.id}`)
      setEditingId(null)
      setFieldErrors({})
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'err')
    } finally {
      setRowBusy(null)
    }
  }

  const [bankPreviewRows, setBankPreviewRows] = useState<BankRow[]>([])
  const [bankPreviewFile, setBankPreviewFile] = useState<File | null>(null)

  const onUploadBank = async (f: File | null) => {
    if (!f || clientId == null) {
      flash('Select a client first')
      return
    }
    setBusy(true)
    try {
      const r = await api.uploadBank(f, clientId, true)
      setBankPreviewRows(r.rows)
      setBankPreviewFile(f)
      flash(`${r.rows.length} rows parsed — review and import`)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Bank upload failed', 'err')
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
      flash(`Imported ${r.imported} rows`)
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Bank import failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: SquaresFour },
    ...(activeClient
      ? [{ id: 'client' as Tab, label: activeClient.name, icon: Buildings }]
      : []),
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'bank', label: 'Bank', icon: Bank },
    { id: 'reconcile', label: 'Reconcile', icon: GitMerge },
    { id: 'duplicates', label: 'Duplicates', icon: Copy },
    { id: 'reminders', label: 'Reminders', icon: Envelope },
  ]

  return {
    tab, setTab,
    clients, setClients,
    invoices,
    banks,
    clientId, setClientId,
    scopeAll, setScopeAll,
    busy, setBusy,
    uploadBusy,
    batchResults,
    failedFiles,
    loading,
    toasts,
    rowBusy, setRowBusy,
    editingId, setEditingId,
    draft, setDraft,
    fieldErrors, setFieldErrors,
    preview,
    previewDays, setPreviewDays,
    previewLoading,
    sendAllBusy,
    matches, setMatches,
    reconHistory,
    flags,
    reminders,
    folders,
    err,
    sidebarCollapsed, setSidebarCollapsed,
    sidebarOpen, setSidebarOpen,
    showCreateClient, setShowCreateClient,
    newClientName, setNewClientName,
    emailError, setEmailError,
    confirm, setConfirm,
    dragOverType, setDragOverType,
    bankDragOver, setBankDragOver,
    clientPopoverOpen, setClientPopoverOpen,
    bankPreviewRows, setBankPreviewRows,
    bankPreviewFile, setBankPreviewFile,
    flash,
    load,
    createClient,
    loadPreview,
    sendOneReminder,
    sendAllReminders,
    activeClient,
    stats,
    clientData,
    chartData,
    onUploadInvoices,
    startEdit,
    saveEdit,
    onUploadBank,
    commitBankPreview,
    tabs,
  }
}

const AppCtx = createContext<AppStore | null>(null)

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppState()
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
