import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, auth, billing, onUnauthorized, onUpgrade } from '@/api'
import { ApiError } from '@/lib/api-error'

/**
 * Graceful-error contract of the transport layer, with fetch stubbed.
 * Mirrors the REAL wiring in src/api.ts:
 *   - non-exempt 401 fires the onUnauthorized hook (session-expiry, G4)
 *   - 401/400 on PUBLIC_AUTH_PATH (/auth/login etc.) must NOT fire it —
 *     the login form owns those errors
 *   - 402 with the entitlement payload fires onUpgrade with ApiError.plan (G5)
 *   - non-2xx always rejects with ApiError (message = parsed detail)
 *   - network-level failures reject raw (callers do instanceof Error)
 */

function jsonResponse(status: number, body: unknown, statusText = ''): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.unstubAllGlobals()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('401 session-expiry plumbing (G4)', () => {
  it('fires the unauthorized hook for protected paths', async () => {
    const cb = vi.fn()
    const off = onUnauthorized(cb)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'Unauthorized' })))
    await expect(api.clients()).rejects.toBeInstanceOf(ApiError)
    expect(cb).toHaveBeenCalledTimes(1)
    off()
  })

  it('does NOT fire the hook for public auth paths — the login form owns its errors', async () => {
    const cb = vi.fn()
    const off = onUnauthorized(cb)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(400, { detail: 'LOGIN_BAD_CREDENTIALS' })),
    )
    await expect(auth.login('e@x.com', 'wrong')).rejects.toBeInstanceOf(ApiError)
    expect(cb).not.toHaveBeenCalled()
    off()
  })

  it('unsubscribing stops the hook', async () => {
    const cb = vi.fn()
    const off = onUnauthorized(cb)
    off()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'Unauthorized' })))
    await expect(api.clients()).rejects.toBeInstanceOf(ApiError)
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('402 upgrade plumbing (G5)', () => {
  it('fires the upgrade hook with the parsed ApiError', async () => {
    const cb = vi.fn()
    const off = onUpgrade(cb)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(402, { detail: { detail: 'Free plan limit reached', upgrade: true, plan: 'pro' } }),
      ),
    )
    const err: unknown = await api.createClient('New Co').catch((e: unknown) => e)
    expect(cb).toHaveBeenCalledTimes(1)
    const fired: ApiError = cb.mock.calls[0][0]
    expect(fired.upgrade).toBe(true)
    expect(fired.plan).toBe('pro')
    expect(fired.message).toBe('Free plan limit reached')
    expect(err).toBe(fired)
    off()
  })

  it('non-402 errors never fire the upgrade hook', async () => {
    const cb = vi.fn()
    const off = onUpgrade(cb)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { detail: 'Not Found' })))
    await expect(billing.me()).rejects.toBeInstanceOf(ApiError)
    expect(cb).not.toHaveBeenCalled()
    off()
  })
})

describe('non-2xx and transport failures', () => {
  it('500 with non-JSON body falls back to statusText', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(' exploded ', { status: 500, statusText: 'Server Error' })),
    )
    const err: unknown = await api.clients().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).message).toBe('Server Error')
    expect((err as ApiError).status).toBe(500)
  })

  it('network-level failure rejects raw (callers do instanceof Error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(api.clients()).rejects.toBeInstanceOf(TypeError)
  })
})
