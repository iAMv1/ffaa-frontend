const BASE = '/api/v1'

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, init)
  if (!r.ok) {
    const t = await r.text()
    throw new Error(t || r.statusText)
  }
  if (r.headers.get('content-type')?.includes('xml')) {
    return (await r.text()) as T
  }
  return r.json()
}

export type Client = { id: number; name: string; email?: string | null; gst_number?: string | null; address?: string | null }
export type Invoice = {
  id: number
  client_id: number
  invoice_number: string
  invoice_date: string | null
  company_name: string
  gst_rate: number
  taxable_value: number
  total_amount: number
  cgst: number
  sgst: number
  igst: number
  hsn_code?: string | null
  quantity?: number | null
  item_description?: string | null
  invoice_type: string
  status: string
  approved: boolean
  ocr_confidence?: number | null
}
export type BankRow = {
  id: number
  client_id: number
  date: string
  narration: string
  debit: number
  credit: number
  balance: number
  reconciled: boolean
}

export type EmailReminder = {
  id: number
  client_id: number
  subject: string
  body: string
  status: string
  error_message?: string | null
  sent_at?: string | null
  created_at?: string
}

export type UploadFileResult = {
  filename: string
  status: string
  invoice?: Invoice | null
  error?: string | null
}

export type ReminderPreview = {
  client_id: number
  name: string
  email?: string | null
  missing_docs: string[]
  last_upload?: string | null
  days_since_upload?: number | null
  subject: string
  body: string
}

export type DuplicateFlag = {
  id: number
  invoice_id: number
  potential_duplicate_id: number
  similarity_score: number
  matched_fields: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  reviewed_at: string | null
}

export const api = {
  health: () => fetch('/health').then((r) => r.json()),
  clients: () => j<Client[]>('/clients'),
  createClient: (name: string) =>
    j<Client>('/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  updateClient: (id: number, client: Partial<Client>) =>
    j<Client>(`/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    }),
  sendReminder: (client_id: number, template_name?: string) =>
    j<{ id: number; status: string; sent_at: string | null }>(
      `/clients/${client_id}/send-reminder`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_name }),
      },
    ),
  reminderHistory: (client_id?: number) =>
    j<EmailReminder[]>(
      `/reminders/history${client_id != null ? `?client_id=${client_id}` : ''}`,
    ),
  reminderPreview: (days = 30) => j<ReminderPreview[]>(`/reminders/preview?days=${days}`),
  invoices: (client_id?: number) =>
    j<Invoice[]>(`/invoices${client_id != null ? `?client_id=${client_id}` : ''}`),
  uploadInvoice: (file: File, invoice_type = 'sales', client_id?: number) => {
    const fd = new FormData()
    fd.append('file', file)
    if (client_id != null) fd.append('client_id', String(client_id))
    return j<Invoice>(`/upload-invoice?invoice_type=${invoice_type}`, { method: 'POST', body: fd })
  },
  uploadInvoices: (files: File[], invoice_type: 'sales' | 'purchase', client_id: number) => {
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    fd.append('client_id', String(client_id))
    fd.append('invoice_type', invoice_type)
    return j<UploadFileResult[]>('/upload-invoices', { method: 'POST', body: fd })
  },
  approve: (id: number) => j<Invoice>(`/invoices/${id}/approve`, { method: 'PUT' }),
  review: (id: number, body: Record<string, unknown>) =>
    j<Invoice>(`/invoices/${id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  bank: (client_id?: number) =>
    j<BankRow[]>(`/bank-statements${client_id != null ? `?client_id=${client_id}` : ''}`),
  uploadBank: (file: File, client_id: number) => {
    const fd = new FormData()
    fd.append('file', file)
    return j<{ imported: number; rows: BankRow[] }>(
      `/bank-statements/upload?client_id=${client_id}`,
      { method: 'POST', body: fd },
    )
  },
  reconcile: (client_id: number, confirm = false) =>
    j<{ matches: Array<Record<string, unknown>>; confirmed: boolean }>(
      `/reconcile?client_id=${client_id}&confirm=${confirm}`,
      { method: 'POST' },
    ),
  duplicateFlags: (status?: string) =>
    j<DuplicateFlag[]>(`/duplicates/flags${status ? `?status=${status}` : ''}`),
  checkDuplicates: (invoice_id: number) =>
    j<{ invoice_id: number; flags_created: number; matches: DuplicateFlag[] }>(
      `/invoices/${invoice_id}/duplicates/check`,
      { method: 'POST' },
    ),
  resolveDuplicate: (flag_id: number, action: 'accept' | 'reject') =>
    j<DuplicateFlag>(`/duplicates/flags/${flag_id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }),
  tallyUrl: (client_id?: number) =>
    `${BASE}/export-tally${client_id != null ? `?client_id=${client_id}` : ''}`,
}
