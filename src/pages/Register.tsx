import { useEffect, useState, type FormEvent } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { Link, Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/state/auth'
import { AuthShell } from '@/pages/AuthShell'

const fieldLabel =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-400'

export function Register() {

  // Social buttons mirror Login — only providers configured in backend env.
  const [socialProviders, setSocialProviders] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/v1/auth/providers')
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((d) => setSocialProviders(d.providers ?? []))
      .catch(() => {})
  }, [])
  const { user, booting, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!booting && user) return <Navigate to="/app" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await register(email.trim(), password)
      toast.success('Account created')
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Each account is its own private workspace."
      error={error}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-zinc-800 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
              <span className="text-[11px] uppercase tracking-wide text-zinc-400">or email</span>
              <div className="h-px flex-1 bg-zinc-100" />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="register-email" className={fieldLabel}>
            Email
          </Label>
          <Input
            id="register-email"
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
          <Label htmlFor="register-password" className={fieldLabel}>
            Password
          </Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="register-confirm" className={fieldLabel}>
            Confirm password
          </Label>
          <Input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
          {busy && <CircleNotch className="h-3.5 w-3.5 animate-spin" />}
          Create account
        </Button>
      </form>
    </AuthShell>
  )
}
