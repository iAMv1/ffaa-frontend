// P5 expands this page (profile editing, full account surface). P2 ships the
// scoped essentials: identity display + password change via fastapi-users.
import { useState, type FormEvent } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { auth } from '@/api'
import { useAuth } from '@/state/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const fieldLabel =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-400'

export function Settings() {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // NOTE(P2): hits PATCH /api/v1/auth/users/me (fastapi-users current-user
      // update). If the backend mounts the users router elsewhere, adjust
      // `auth.updateMe` in src/api.ts — the route is not yet confirmed.
      await auth.updateMe({ password })
      setPassword('')
      setConfirmPassword('')
      toast.success('Password updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="gap-0 rounded-2xl border-zinc-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Profile</p>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="settings-email" className={fieldLabel}>
            Email
          </Label>
          <Input id="settings-email" type="email" value={user?.email ?? ''} disabled />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Email changes arrive with the full settings pass in P5.
        </p>
      </Card>

      <Card className="gap-0 rounded-2xl border-zinc-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Password</p>
        <form onSubmit={onSubmit} className="mt-4 max-w-sm space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-password" className={fieldLabel}>
              New password
            </Label>
            <Input
              id="settings-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-confirm" className={fieldLabel}>
              Confirm password
            </Label>
            <Input
              id="settings-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-xs leading-relaxed text-red-700">{error}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={busy || !password || !confirmPassword}
            className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800"
          >
            {busy && <CircleNotch className="h-3.5 w-3.5 animate-spin" />}
            Update password
          </Button>
        </form>
      </Card>
    </div>
  )
}
