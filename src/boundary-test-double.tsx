// Verbatim structural copy of the ErrorBoundary in src/App.tsx so the
// containment suite exercises the same logic without mounting the full app
// shell. If App.tsx's boundary changes, update this mirror.
import { Component, type ReactNode } from 'react'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) { console.error('FFAA shell render crash:', error) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 460, border: '1px solid var(--color-line)', borderRadius: 12, padding: 20, background: 'var(--color-surface)' }}>
            <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>Something broke while rendering</h2>
            <p style={{ fontSize: 13, color: '#52525b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {String(this.state.error.message || this.state.error)}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: 12, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-line)', background: 'transparent', cursor: 'pointer' }}
            >Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export { ErrorBoundary }
