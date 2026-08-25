import { useState, type FormEvent } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/state/auth'
import { AuthShell } from '@/pages/AuthShell'

const fieldLabel =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-400'

export function Login() {
  const { user, booting, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          {busy && <CircleNotch className="h-3.5 w-3.5 animate-spin" />}
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}
