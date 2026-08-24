import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { CircleNotch, WarningCircle } from '@phosphor-icons/react'
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
import { Sidebar } from '@/shell/Sidebar'
import { TopBar } from '@/shell/TopBar'
import { Overview } from '@/surfaces/Overview'
import { Client } from '@/surfaces/Client'
import { Invoices } from '@/surfaces/Invoices'
import { Bank } from '@/surfaces/Bank'
import { Reconcile } from '@/surfaces/Reconcile'
import { Duplicates } from '@/surfaces/Duplicates'
import { Reminders } from '@/surfaces/Reminders'

// crossfade between tabs — explains state change, nothing bounces
const TAB_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]
const tabMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: TAB_EASE },
}
const API_PORT = 8000

export default function App() {
  return (
    <DataProvider>
      <UiProvider>
        <Shell />
      </UiProvider>
    </DataProvider>
  )
}

function Shell() {
  const {
    tab,
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
    <MotionConfig reducedMotion="user">
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
                Cannot reach API on port {API_PORT}.{' '}
                <span className="num text-xs opacity-80">{err.slice(0, 100)}</span>
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {tab === 'overview' && (
              <motion.div key="overview" {...tabMotion}>
                <Overview />
              </motion.div>
            )}
            {tab === 'client' && (
              <motion.div key="client" {...tabMotion}>
                <Client />
              </motion.div>
            )}
            {tab === 'invoices' && (
              <motion.div key="invoices" {...tabMotion}>
                <Invoices />
              </motion.div>
            )}
            {tab === 'bank' && (
              <motion.div key="bank" {...tabMotion}>
                <Bank />
              </motion.div>
            )}
            {tab === 'reconcile' && (
              <motion.div key="reconcile" {...tabMotion}>
                <Reconcile />
              </motion.div>
            )}
            {tab === 'duplicates' && (
              <motion.div key="duplicates" {...tabMotion}>
                <Duplicates />
              </motion.div>
            )}
            {tab === 'reminders' && (
              <motion.div key="reminders" {...tabMotion}>
                <Reminders />
              </motion.div>
            )}
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
    </div>
    </MotionConfig>
  )
}
