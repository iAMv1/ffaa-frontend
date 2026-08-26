import { ApiError, apiErrorFrom } from './lib/api-error'

const BASE = '/api/v1'

// Public auth endpoints whose 4xx belong in the login/register form — they are
// exempt from the global 401 interceptor (journey G4).
const PUBLIC_AUTH_PATH: Record<string, true> = {
  '/auth/login': true,
  '/auth/register': true,
  '/auth/forgot-password': true,
  '/auth/reset-password': true,
}

/**
 * Session-expiry plumbing (G4): AuthProvider registers one handler; every
 * non-exempt 401 fires it. Returns an unsubscribe function.
 */
let unauthorizedCb: (() => void) | null = null
export function onUnauthorized(cb: () => void): () => void {
  unauthorizedCb = cb
  return () => {
    if (unauthorizedCb === cb) unauthorizedCb = null
  }
}

/**
 * Upgrade-modal plumbing (G5): AppShell registers one handler; any response
 * carrying the entitlement gate's `upgrade` flag fires it with the parsed
 * ApiError. Returns an unsubscribe function.
 */
let upgradeCb: ((e: ApiError) => void) | null = null
export function onUpgrade(cb: (e: ApiError) => void): () => void {
  upgradeCb = cb
  return () => {
    if (upgradeCb === cb) upgradeCb = null
  }
}

/** Shared non-2xx path: parse into ApiError, fire the 401/402 hooks, throw. */
async function fail(path: string, r: Response): Promise<never> {
  const raw = await r.text()
  const err = apiErrorFrom(r.status, r.statusText, raw)
  if (r.status === 401 && !PUBLIC_AUTH_PATH[path]) unauthorizedCb?.()
  if (err.upgrade) upgradeCb?.(err)
  throw err
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, init)
  if (!r.ok) await fail(path, r)
  if (r.headers.get('content-type')?.includes('xml')) {
    return (await r.text()) as T
  }
  return r.json()
}

// Payload shapes are GENERATED from the backend OpenAPI spec:
//   npm run gen:api   (regenerate after any Pydantic schema change)
// Hand-editing payload types here is forbidden — extend schemas.py instead.
import type { components } from './api/schema.gen'

type S = components['schemas']
export type Client = S['ClientOut']
export type Invoice = S['InvoiceOut']
export type InvoiceItem = S['InvoiceItemOut']
export type BankRow = S['BankStatementOut']
export type EmailReminder = S['EmailReminderOut']
export type UploadFileResult = S['UploadFileResult']
export type DuplicateFlag = S['DuplicateFlagOut']
export type Reconciliation = S['ReconciliationOut']

/** UI-only narrowing of the backend's free-text flag status (deliberate FE contract). */
export type FlagStatus = 'pending' | 'accepted' | 'rejected'

/** Freeform preview dict from GET /reminders/preview — not a Pydantic model yet. */
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
    fd.append('invoice_type', invoice_type)
    if (client_id != null) fd.append('client_id', String(client_id))
    return j<Invoice>('/upload-invoice', { method: 'POST', body: fd })
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
  uploadBank: (file: File, client_id: number, preview = false) => {
    const fd = new FormData()
    fd.append('file', file)
    return j<{ imported: number; rows: BankRow[]; preview?: boolean }>(
      `/bank-statements/upload?client_id=${client_id}&preview=${preview}`,
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
  deleteInvoice: (id: number) => j<{ deleted: number }>(`/invoices/${id}`, { method: 'DELETE' }),
  deleteBank: (id: number) =>
    j<{ deleted: number }>(`/bank-statements/${id}`, { method: 'DELETE' }),
  deleteClient: (id: number) => j<{ deleted: number }>(`/clients/${id}`, { method: 'DELETE' }),
  deleteReminder: (id: number) =>
    j<{ deleted: number }>(`/reminders/${id}`, { method: 'DELETE' }),
  reconciliations: (client_id?: number) =>
    j<Reconciliation[]>(
      `/reconciliations${client_id != null ? `?client_id=${client_id}` : ''}`,
    ),
  deleteReconciliation: (id: number) =>
    j<{ deleted: number }>(`/reconciliations/${id}`, { method: 'DELETE' }),
  folders: (client_id: number) =>
    j<{ client: string; folders: Record<string, Record<string, Record<string, string[]>>> }>(
      `/clients/${client_id}/folders`,
    ),
  downloadTally: async (client_id?: number) => {
    const url = `${BASE}/export-tally${client_id != null ? `?client_id=${client_id}` : ''}`
    const r = await fetch(url)
    if (!r.ok) await fail('/export-tally', r)
    const blob = await r.blob()
    const filename = r.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1] || 'tally_import.xml'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  },
}

// ── Billing (W4) ─────────────────────────────────────────────────────────
// Hand-added types: these endpoints are not in schema.gen.ts yet (gen:api
// mirrors the live backend; regenerate once the subscription cutover ships).
// Shapes pinned by .scratch/ffaa-saas/design/api-contract.md + §6 of
// billing-state-machine.md.

export type BillingPlan = {
  code: string
  name: string
  price_rupees: number
  invoice_cap: number | null
  client_cap: number | null
  features: string[]
}

export type BillingPayment = {
  id: number | string
  order_id?: string | null
  razorpay_payment_id?: string | null
  amount_rupees?: number | null
  status?: string | null
  created_at?: string | null
}

export type BillingMe = {
  plan_code: string
  /** Post-cutover truth; pre-cutover backends answer with `status`. */
  rzp_status?: string | null
  status?: string | null
  current_period_end?: string | null
  grace_ends_at?: string | null
  payments?: BillingPayment[]
}

/** POST /billing/subscribe → checkout params; keyless deployments answer 503. */
export type SubscribeResult = {
  subscription_id: string
  key_id: string
  short_url?: string | null
}

export const billing = {
  plans: () => j<BillingPlan[]>('/billing/plans'),
  me: () => j<BillingMe>('/billing/me'),
  subscribe: (plan_code: string) =>
    j<SubscribeResult>('/billing/subscribe', authJson('POST', { plan_code })),
  /** HMAC-check-only reporting endpoint (§5) — never grants entitlement;
   *  called from the Checkout success handler for UI responsiveness. */
  verify: (body: {
    razorpay_payment_id: string
    razorpay_subscription_id: string
    razorpay_signature: string
  }) => j<unknown>('/billing/verify', authJson('POST', body)),
  history: (limit = 50) => j<BillingPayment[]>(`/billing/history?limit=${limit}`),
}

// ── Auth (fastapi-users cookie transport) ────────────────────────────────
// Session lives in an httpOnly cookie (`ffaaauth`); same-origin fetch carries
// it with default credentials — nothing token-shaped is ever stored in JS.

export type AuthUser = {
  id: number | string
  email: string
  is_active?: boolean
  is_superuser?: boolean
  /**
   * Hand-added (M7): GET /me returns UserRead with `is_verified`, but
   * schema.gen.ts has no UserRead component yet, so `gen:api` cannot source
   * this field. Drop this line in favour of the generated alias when the
   * backend's openapi export includes it.
   */
  is_verified?: boolean
}

/** Non-2xx → ApiError; detail duality (string vs validation array) handled by apiErrorFrom. */
async function authReq<T>(path: string, init: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { credentials: 'same-origin', ...init })
  if (!r.ok) await fail(path, r)
  // login/logout answer 202/204 with no body; don't force-parse empties
  if (r.status === 204 || r.status === 202) return undefined as T
  return r.json()
}

const authJson = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const auth = {
  register: (email: string, password: string) =>
    authReq<AuthUser>('/auth/register', authJson('POST', { email, password })),
  // fastapi-users cookie login is FORM-encoded `username` + `password`
  login: async (email: string, password: string) => {
    await authReq<undefined>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }).toString(),
    })
  },
  logout: () => authReq<undefined>('/auth/logout', { method: 'POST' }),
  // session status lives at /me (P1 explicit route), not /auth/me
  me: () => authReq<AuthUser>('/me', {}),
  forgotPassword: (email: string) =>
    authReq<undefined>('/auth/forgot-password', authJson('POST', { email })),
  resetPassword: (token: string, password: string) =>
    authReq<undefined>('/auth/reset-password', authJson('POST', { token, password })),
  /** Account self-service: email and/or password change; the backend requires
   *  current_password for either (account-takeover guard). */
  updateAccount: (patch: {
    email?: string
    new_password?: string
    current_password?: string
  }) => authReq<AuthUser>('/auth/account', authJson('PATCH', patch)),
}
