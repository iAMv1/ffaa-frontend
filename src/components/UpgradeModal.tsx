/**
 * Global 402 upgrade interstitial (journey G5). Fired from api.ts's
 * `onUpgrade` hook whenever any API call returns the entitlement gate's
 * `upgrade: true` payload. Plan checkout itself is W4 — for now the CTA
 * routes to /app/billing.
 */
import { useNavigate } from 'react-router'
import { ArrowRight } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ApiError } from '@/lib/api-error'

export function UpgradeModal({
  error,
  onClose,
}: {
  error: ApiError
  onClose: () => void
}) {
  const navigate = useNavigate()
  const plan = error.plan
    ? error.plan.charAt(0).toUpperCase() + error.plan.slice(1)
    : 'Pro'

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-sm gap-5 rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-zinc-900">
            {plan} plan required
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-zinc-500">
            {error.message}
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs leading-relaxed text-zinc-500">
          Upgrading lifts your client and invoice caps and unlocks the full
          workflow. Plan management lives in Billing.
        </p>
        <DialogFooter className="mt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-zinc-200 text-xs font-medium text-zinc-700"
          >
            Not now
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onClose()
              navigate('/app/billing')
            }}
            className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Go to Billing
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
