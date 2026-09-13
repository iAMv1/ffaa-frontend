import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './boundary-test-double'

/**
 * Render-crash containment: the App.tsx ErrorBoundary (mirrored verbatim in
 * boundary-test-double.tsx so this suite never mounts the full app shell)
 * must isolate a crashing child behind the fallback UI instead of
 * white-screening.
 */

function Boom(): never {
  throw new Error('kaboom in surface')
}

describe('ErrorBoundary containment', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the fallback instead of crashing the tree', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByText('Something broke while rendering')).toBeTruthy()
    expect(screen.getByText(/kaboom in surface/)).toBeTruthy()
    expect(screen.getByText('Reload')).toBeTruthy()
    expect(spy).toHaveBeenCalled()
  })

  it('passes a healthy tree through untouched', () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeTruthy()
  })
})
