/**
 * Server-data context: the cache of everything fetched from the API plus the
 * refresh action and cross-surface busy flags. One refresh re-renders exactly
 * the data consumers (F-02). Derived memos moved verbatim from store.tsx.
 */
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, type BankRow, type Client, type DuplicateFlag, type EmailReminder, type Invoice, type Reconciliation } from '@/api'

interface DataStore {
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
  loading: boolean
  rowBusy: number | null
  setRowBusy: Dispatch<SetStateAction<number | null>>
  reconHistory: Reconciliation[]
  flags: DuplicateFlag[]
  reminders: EmailReminder[]
  folders: Record<string, Record<string, Record<string, string[]>>>
  err: string | null
  newClientName: string
  setNewClientName: Dispatch<SetStateAction<string>>
  load: () => Promise<void>
  createClient: (e: FormEvent) => Promise<Client | undefined>
  activeClient: Client | undefined
  stats: { total: number; pending: number; approved: number; unrec: number }
  clientData: { inv: Invoice[]; fl: DuplicateFlag[]; vol: number }
  chartData: { name: string; value: number }[]
}

const DataCtx = createContext<DataStore | null>(null)

export function useData() {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [banks, setBanks] = useState<BankRow[]>([])
  const [clientId, setClientId] = useState<number | null>(null)
  const [scopeAll, setScopeAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rowBusy, setRowBusy] = useState<number | null>(null)
  const [reconHistory, setReconHistory] = useState<Reconciliation[]>([])
  const [flags, setFlags] = useState<DuplicateFlag[]>([])
  const [reminders, setReminders] = useState<EmailReminder[]>([])
  const [folders, setFolders] = useState<Record<string, Record<string, Record<string, string[]>>>>({})
  const [err, setErr] = useState<string | null>(null)
  // create-client dialog field value lives here because the action consumes it;
  // dialog open/close + toasts stay in the UI layer.
  const [newClientName, setNewClientName] = useState('')

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
      // named (manually created) clients first; OCR-minted ones trail (ticket 03/15)
      setClients([...c].sort((a, b) => Number(a.auto_created ?? false) - Number(b.auto_created ?? false)))
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

  // Throws on failure — the caller (create-client dialog) owns toasts and
  // dialog dismissal; this action only mutates server data.
  const createClient = async (e: FormEvent) => {
    e.preventDefault()
    const name = newClientName.trim()
    if (!name) return
    setBusy(true)
    try {
      const c = await api.createClient(name)
      await load()
      if (c?.id) setClientId(c.id)
      return c
    } finally {
      setBusy(false)
    }
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

  return (
    <DataCtx.Provider
      value={{
        clients, setClients,
        invoices,
        banks,
        clientId, setClientId,
        scopeAll, setScopeAll,
        busy, setBusy,
        loading,
        rowBusy, setRowBusy,
        reconHistory,
        flags,
        reminders,
        folders,
        err,
        newClientName, setNewClientName,
        load,
        createClient,
        activeClient,
        stats,
        clientData,
        chartData,
      }}
    >
      {children}
    </DataCtx.Provider>
  )
}

export type { DataStore }
