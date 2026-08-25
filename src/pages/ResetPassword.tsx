import { useState, type FormEvent } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/state/auth'
import { AuthShell } from '@/pages/AuthShell'

const fieldLabel =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-400'

export function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // fastapi-users emails the token as a `?token=` query param.
  if (!token) return <Navigate to="/forgot-password" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetPassword(token, password)
      toast.success('Password updated — sign in with your new password')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose something you don't use anywhere else."
      error={error}
      footer={
        <Link to="/login" className="font-medium text-zinc-800 underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reset-password" className={fieldLabel}>
            New password
          </Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm" className={fieldLabel}>
            Confirm password
          </Label>
          <Input
            id="reset-confirm"
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
          Update password
        </Button>
      </form>
    </AuthShell>
  )
}
