/**
 * Shared chrome for the four auth pages: centered card on the canvas, FFAA
 * wordmark. Keeps Login/Register/Forgot/Reset visually identical.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { WarningCircle } from '@phosphor-icons/react'

export function AuthShell({
  title,
  subtitle,
  error,
  children,
  footer,
}: {
  title: string
  subtitle: string
  error?: string | null
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-4 py-10">
      <Link to="/" className="mb-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">FFAA</h1>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
          Books · GST · Tally
        </p>
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 elev-1 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">{subtitle}</p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-800">
            <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5">{children}</div>
      </div>

      {footer && <div className="mt-5 text-xs text-zinc-500">{footer}</div>}
    </div>
  )
}
