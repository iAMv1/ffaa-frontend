import { useEffect, useState, type FormEvent } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/state/auth'
import { AuthShell } from '@/pages/AuthShell'

const fieldLabel =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-500'

export function Login() {
  const { user, booting, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [socialProviders, setSocialProviders] = useState<string[]>([])
  // Providers whose env keys the backend has configured (empty list otherwise).
  useEffect(() => {
    fetch('/api/v1/auth/providers')
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((d) => setSocialProviders(d.providers ?? []))
      .catch((e) => { console.debug('social providers unavailable', e) })
  }, [])

  // Already signed in — the login page has nothing to offer.
  if (!booting && user) return <Navigate to="/app" replace />

  const from =
    (location.state as { from?: string } | null)?.from ?? '/app'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
      toast.success('Welcome back')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Your books, bank lines, and reminders — one place."
      error={error}
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-zinc-800 underline-offset-2 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
        {socialProviders.length > 0 && (
          <div className="space-y-2">
            {socialProviders.map((p) => (
              <a
                key={p}
                onClick={(e) => {
                  e.preventDefault();
                  // /authorize returns JSON {authorization_url} + sets the CSRF
                  // cookie needed by /callback — navigate after fetching it.
                  fetch(`/api/v1/auth/${p}/authorize`)
                    .then((r) => r.json())
                    .then((d) => { window.location.href = d.authorization_url; });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Continue with {p.charAt(0).toUpperCase() + p.slice(1)}
              </a>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-px flex-1 bg-zinc-100" />
              <span className="text-[11px] uppercase tracking-wide text-zinc-500">or email</span>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>
          </div>
        )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className={fieldLabel}>
            Email
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@practice.in"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="login-password" className={fieldLabel}>
              Password
            </Label>
            <Link
              to="/forgot-password"
              className="text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
          {busy && <CircleNotch aria-hidden className="h-3.5 w-3.5 animate-spin" />}
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}
