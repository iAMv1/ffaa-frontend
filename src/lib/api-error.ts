/**
 * Typed transport error for every non-2xx API response (journey gap G2).
 *
 * `message` is always the human-readable detail text, so existing
 * `err instanceof Error ? err.message : …` catch blocks keep working.
 * Structured fields ride alongside:
 *  - `status`  — HTTP status, for callers that branch on it (e.g. banner truthing)
 *  - `upgrade` / `plan` — unwrapped from the entitlement gate's nested
 *    `{detail: {detail, upgrade: true, plan}}` payload (402) so the global
 *    UpgradeModal can fire without re-parsing JSON.
 */
export class ApiError extends Error {
  readonly status: number
  readonly upgrade: boolean
  readonly plan?: string

  constructor(
    status: number,
    detail: string,
    opts?: { upgrade?: boolean; plan?: string },
  ) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.upgrade = opts?.upgrade ?? false
    this.plan = opts?.plan
  }
}

/** FastAPI validation detail: `[{loc, msg, type, input?}, ...]` → "loc: msg". */
function validationText(items: unknown[]): string {
  return items
    .map((v) => {
      if (typeof v !== 'object' || v === null || !('msg' in v)) return String(v)
      const loc = 'loc' in v ? v.loc : undefined
      const path = Array.isArray(loc) ? loc.join('.') : String(loc ?? '')
      return `${path}: ${String(v.msg)}`.replace(/^:\s*/, '')
    })
    .join('; ')
}

/**
 * Parse a non-2xx body into an ApiError. Handles the pinned contract's three
 * detail shapes:
 *  - fastapi-users string detail (`{detail: "LOGIN_BAD_CREDENTIALS"}`)
 *  - FastAPI validation arrays (`422`)
 *  - nested objects — the entitlement gate's `{detail, upgrade, plan}` (402)
 *    and billing's `{detail: {detail: "payments not configured"}}` (503).
 * Non-JSON bodies fall back to the status text.
 */
export function apiErrorFrom(status: number, statusText: string, raw: string): ApiError {
  let detail = statusText || 'Request failed'
  let upgrade = false
  let plan: string | undefined
  try {
    const body: unknown = JSON.parse(raw)
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      const d: unknown = body.detail
      if (typeof d === 'string') {
        detail = d
      } else if (Array.isArray(d)) {
        detail = validationText(d)
      } else if (typeof d === 'object' && d !== null && 'detail' in d) {
        const inner: unknown = d.detail
        if (typeof inner === 'string') {
          detail = inner
        } else if (
          // double-nested — billing 503 shape `{detail: {detail: "…"}}`
          typeof inner === 'object' &&
          inner !== null &&
          'detail' in inner &&
          typeof inner.detail === 'string'
        ) {
          detail = inner.detail
        }
        if ('upgrade' in d && d.upgrade === true) upgrade = true
        if ('plan' in d && typeof d.plan === 'string') plan = d.plan
      }
    }
  } catch {
    /* non-JSON body — keep statusText */
  }
  return new ApiError(status, detail, { upgrade, plan })
}
