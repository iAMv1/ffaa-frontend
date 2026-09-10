import { useState, type FormEvent } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/state/auth'
import { AuthShell } from '@/pages/AuthShell'

const fieldLabel =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-500'

export function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Always report success — never reveal whether the email exists.
      await forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        sent
          ? 'If that address has an account, a reset link is on its way. Check your inbox.'
          : 'We will email you a link to set a new password.'
      }
      error={sent ? null : error}
      footer={
        <Link to="/login" className="font-medium text-zinc-800 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm leading-relaxed text-zinc-500">
          Didn't get it? Check spam, or try again in a few minutes.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email" className={fieldLabel}>
              Email
            </Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@practice.in"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800">
            {busy && <CircleNotch aria-hidden className="h-3.5 w-3.5 animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
