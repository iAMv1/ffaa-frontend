import { Component, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useOutlet } from 'react-router'
import { Toaster, toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataProvider, useData } from '@/state/data'
import { UiProvider, useUi } from '@/state/ui'
import { AuthProvider, ProtectedRoute } from '@/state/auth'
import { onUpgrade } from '@/api'
import type { ApiError } from '@/lib/api-error'
import { UpgradeModal } from '@/components/UpgradeModal'
import { Sidebar } from '@/shell/Sidebar'
import { TopBar } from '@/shell/TopBar'
import { Overview } from '@/surfaces/Overview'
import { Client } from '@/surfaces/Client'
import { Invoices } from '@/surfaces/Invoices'
import { Bank } from '@/surfaces/Bank'
import { Reconcile } from '@/surfaces/Reconcile'
import { Duplicates } from '@/surfaces/Duplicates'
import { Reminders } from '@/surfaces/Reminders'
import { Landing } from '@/pages/Landing'
import { Pricing } from '@/pages/Pricing'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { Settings } from '@/pages/Settings'
import { Billing } from '@/pages/Billing'

// crossfade between routes — explains the surface change, nothing bounces
const TAB_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]
const tabMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: TAB_EASE },
}

// Audit M: a render crash in any surface must not white-screen the shell —
// isolate it, explain it, and offer reload. React-only, no deps.
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

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      {/* AuthProvider needs the router context (401 interceptor navigates) */}
        <ErrorBoundary>
          <BrowserRouter>
            <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* protected shell — server data + shell chrome live only here so
                public pages never trigger unauthenticated API fetches */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <UiProvider>
                      <AppShell />
                    </UiProvider>
                  </DataProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="clients/:id" element={<Client />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="bank" element={<Bank />} />
              <Route path="reconcile" element={<Reconcile />} />
              <Route path="duplicates" element={<Duplicates />} />
              <Route path="reminders" element={<Reminders />} />
              <Route path="settings" element={<Settings />} />
              <Route path="billing" element={<Billing />} />
            </Route>

            {/* everything else lands inside the app */}
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>

          <Toaster
            position="bottom-center"
            theme="light"
            toastOptions={{
              style: {
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                background: 'var(--color-surface)',
                color: 'var(--color-ink)',
                border: '1px solid var(--color-line)',
                borderRadius: '10px',
                boxShadow: '0 12px 40px -16px rgba(24, 24, 27, 0.25)',
              },
            }}
          />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
    </MotionConfig>
  )
}


function AppShell() {
  const location = useLocation()
  const outlet = useOutlet()
  const {
    sidebarCollapsed,
    confirm, setConfirm,
    showCreateClient, setShowCreateClient,
  } = useUi()
  const {
    err,
    busy,
    newClientName, setNewClientName,
    createClient,
  } = useData()

  // Global 402 handler: the entitlement gate's `upgrade` payload opens the
  // UpgradeModal from anywhere (journey G5).
  const [upgradeError, setUpgradeError] = useState<ApiError | null>(null)
  useEffect(() => onUpgrade(setUpgradeError), [])

  const handleCreateClient = async (e: React.FormEvent) => {
    try {
      const c = await createClient(e)
      if (c) {
        toast.success('Client added')
        setNewClientName('')
        setShowCreateClient(false)
      }
    } catch (err2) {
      toast.error(err2 instanceof Error ? err2.message : 'Failed')
    }
  }

  return (
    <div className="relative min-h-[100dvh] bg-canvas text-zinc-900">
      <div
        className={`relative mx-auto grid min-h-[100dvh] max-w-[1400px] grid-cols-1 gap-0 transition-[grid-template-columns] duration-200 ${
          sidebarCollapsed ? 'md:grid-cols-[64px_1fr]' : 'md:grid-cols-[220px_1fr]'
        }`}
      >
        <Sidebar />

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <TopBar />

          {err && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
              <span>
                Cannot reach the API — check your connection.{' '}
                <span className="num text-xs opacity-80">{err.slice(0, 100)}</span>
              </span>
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} {...tabMotion}>
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* confirm — driven by ui context */}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent className="max-w-sm gap-5 rounded-xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-zinc-900">
              {confirm?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-zinc-500">
              {confirm?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setConfirm(null)}
              className="border-zinc-200 text-xs font-medium text-zinc-700"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirm?.onConfirm()}
              className={`text-xs font-medium text-white ${
                confirm?.variant === 'danger'
                  ? 'bg-red-700 hover:bg-red-800'
                  : 'bg-zinc-900 hover:bg-zinc-800'
              }`}
            >
              {confirm?.confirmLabel || 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* upgrade — global 402 interstitial, fired from api.ts's onUpgrade hook */}
      {upgradeError && (
        <UpgradeModal error={upgradeError} onClose={() => setUpgradeError(null)} />
      )}

      {/* create client — dialog chrome in ui, action in data */}
      <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
        <DialogContent className="max-w-sm gap-5 rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-zinc-900">
              Add client
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-zinc-500">
              Name as it appears on invoices. You can add GSTIN and email later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClient}>
            <div className="space-y-1.5">
              <Label
                htmlFor="new-client-name"
                className="text-[11px] font-medium uppercase tracking-wide text-zinc-400"
              >
                Client name
              </Label>
              <Input
                id="new-client-name"
                autoFocus
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Agarwal Textiles"
              />
            </div>
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateClient(false)}
                className="border-zinc-200 text-xs font-medium text-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newClientName.trim() || busy}
                className="bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800"
              >
                {busy && <CircleNotch className="h-3.5 w-3.5 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
