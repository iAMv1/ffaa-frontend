import { describe, expect, it } from 'vitest'
import { ApiError, apiErrorFrom } from '@/lib/api-error'

describe('ApiError', () => {
  it('carries status and defaults upgrade to false', () => {
    const e = new ApiError(404, 'Not found')
    expect(e.status).toBe(404)
    expect(e.upgrade).toBe(false)
    expect(e.plan).toBeUndefined()
    expect(e.name).toBe('ApiError')
    expect(e.message).toBe('Not found')
  })

  it('is an Error so existing instanceof checks keep working', () => {
    expect(new ApiError(500, 'x')).toBeInstanceOf(Error)
  })
})

describe('apiErrorFrom — the three pinned detail shapes', () => {
  it('string detail (fastapi-users)', () => {
    const e = apiErrorFrom(400, 'Bad Request', JSON.stringify({ detail: 'LOGIN_BAD_CREDENTIALS' }))
    expect(e.message).toBe('LOGIN_BAD_CREDENTIALS')
    expect(e.status).toBe(400)
  })

  it('validation array detail (422) → "loc: msg" joined', () => {
    const e = apiErrorFrom(
      422,
      'Unprocessable',
      JSON.stringify({
        detail: [
          { loc: ['body', 'gst_rate'], msg: 'Input should be less than 100' },
          { loc: ['body', 'name'], msg: 'String should have at least 1 character' },
        ],
      }),
    )
    expect(e.message).toBe('body.gst_rate: Input should be less than 100; body.name: String should have at least 1 character')
  })

  it('nested entitlement gate (402) → upgrade + plan + inner detail', () => {
    const e = apiErrorFrom(
      402,
      'Payment Required',
      JSON.stringify({
        detail: { detail: 'Free plan limit reached', upgrade: true, plan: 'pro' },
      }),
    )
    expect(e.upgrade).toBe(true)
    expect(e.plan).toBe('pro')
    expect(e.message).toBe('Free plan limit reached')
  })

  it('double-nested billing 503 shape', () => {
    const e = apiErrorFrom(
      503,
      'Service Unavailable',
      JSON.stringify({ detail: { detail: 'payments not configured' } }),
    )
    expect(e.message).toBe('payments not configured')
    expect(e.upgrade).toBe(false)
  })

  it('non-JSON body falls back to statusText', () => {
    const e = apiErrorFrom(502, 'Bad Gateway', '<html>oops</html>')
    expect(e.message).toBe('Bad Gateway')
  })

  it('empty statusText falls back to Request failed', () => {
    const e = apiErrorFrom(500, '', 'not json')
    expect(e.message).toBe('Request failed')
  })
})
