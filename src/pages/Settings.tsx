// Account settings: email + password changes via PATCH /api/v1/auth/account.
// The backend requires current_password for either change (account-takeover
// guard), so both forms ask for it. JWT sessions stay valid after a password
// change — no forced re-login.
import { useState, type FormEvent } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { auth } from '@/api'
import { useAuth } from '@/state/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const fieldLabel =
  'text-[11px] font-medium uppercase tracking-wide text-zinc-500'

export function Settings() {
  const { user, refresh } = useAuth()

  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  const newEmail = email.trim()
  const onEmailSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!emailPassword) {
      toast.error('Current password is required to change your email')
      return
    }
    setEmailBusy(true)
    try {
      await auth.updateAccount({
        email: newEmail,
        current_password: emailPassword,
      })
      await refresh()
      setEmail('')
      setEmailPassword('')
      toast.success('Email updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setEmailBusy(false)
    }
  }

  const onPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setPwError('Passwords do not match')
      return
    }
    setPwBusy(true)
    setPwError(null)
    try {
      await auth.updateAccount({
        new_password: password,
        current_password: currentPassword,
      })
      setPassword('')
      setConfirmPassword('')
      setCurrentPassword('')
      toast.success('Password updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="gap-0 rounded-2xl border-zinc-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Profile
          </p>
          {user?.is_verified === false && (
            <Badge
              variant="outline"
              className="border-transparent bg-amber-50 px-2 py-0 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
            >
              Email unverified
            </Badge>
          )}
        </div>
        <form onSubmit={onEmailSubmit} className="mt-4 max-w-sm space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-email" className={fieldLabel}>
              Email
            </Label>
            <Input
              id="settings-email"
              type="email"
              placeholder={user?.email ?? ''}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-email-password" className={fieldLabel}>
              Current password
            </Label>
            <Input
              id="settings-email-password"
              type="password"
              autoComplete="current-password"
              required
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={emailBusy || !newEmail || !emailPassword}
            className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800"
          >
            {emailBusy && <CircleNotch aria-hidden className="h-3.5 w-3.5 animate-spin" />}
            Update email
          </Button>
        </form>
      </Card>

      <Card className="gap-0 rounded-2xl border-zinc-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Password
        </p>
        <form onSubmit={onPasswordSubmit} className="mt-4 max-w-sm space-y-4">
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
          <div className="space-y-1.5">
            <Label htmlFor="settings-current" className={fieldLabel}>
              Current password
            </Label>
            <Input
              id="settings-current"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          {pwError && <p className="text-xs leading-relaxed text-red-700">{pwError}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={
              pwBusy || !password || !confirmPassword || !currentPassword
            }
            className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800"
          >
            {pwBusy && <CircleNotch aria-hidden className="h-3.5 w-3.5 animate-spin" />}
            Update password
          </Button>
        </form>
      </Card>
    </div>
  )
}
