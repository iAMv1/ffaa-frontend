import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowsClockwise,
  Bank,
  Buildings,
  Check,
  Copy,
  Envelope,
  FileText,
  GitMerge,
  Plus,
  SquaresFour,
  Sidebar as SidebarIcon,
  SidebarSimple,
  X,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUi } from '@/state/ui'
import { useData } from '@/state/data'
import type { TabItem } from '@/state/types'
import { cn } from '@/lib/utils'

const pillSpring = { type: 'spring' as const, stiffness: 100, damping: 20 }

function NavItem({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: TabItem
  active: boolean
  collapsed: boolean
  onSelect: () => void
}) {
  const Icon = item.icon
  const button = (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex w-full shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400',
        active
          ? 'font-medium text-white'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
        collapsed && 'md:justify-center md:px-2',
      )}
    >
      {active && (
        <motion.span
          layoutId="ffaa-nav-pill"
          transition={pillSpring}
          className="absolute inset-0 rounded-lg bg-zinc-900 elev-1"
        />
      )}
      <Icon
        weight={active ? 'fill' : 'regular'}
        className="relative z-10 h-[18px] w-[18px] shrink-0"
      />
      <span className={cn('relative z-10 truncate', collapsed && 'md:hidden')}>
        {item.label}
      </span>
    </button>
  )

  if (!collapsed) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

export function Sidebar() {
  const {
    tab, setTab,
    sidebarCollapsed, setSidebarCollapsed,
    sidebarOpen, setSidebarOpen,
    setShowCreateClient,
  } = useUi()
  const {
    clients,
    clientId, setClientId,
    activeClient,
    load,
  } = useData()
  // collapsed-rail client popover is sidebar-only chrome
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false)

  const tabs: TabItem[] = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: SquaresFour },
      ...(activeClient
        ? [{ id: 'client' as const, label: activeClient.name, icon: Buildings }]
        : []),
      { id: 'invoices', label: 'Invoices', icon: FileText },
      { id: 'bank', label: 'Bank', icon: Bank },
      { id: 'reconcile', label: 'Reconcile', icon: GitMerge },
      { id: 'duplicates', label: 'Duplicates', icon: Copy },
      { id: 'reminders', label: 'Reminders', icon: Envelope },
    ],
    [activeClient],
  )

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-zinc-900/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* side nav — drawer on mobile, sticky rail on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 overflow-y-auto border-r border-zinc-200 bg-white transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-[100dvh] md:w-auto md:translate-x-0 md:transition-none ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col px-4 py-5 md:px-3">
          {/* wordmark + controls */}
          <div className="mb-6 flex items-start justify-between gap-2">
            <div className={sidebarCollapsed ? 'md:hidden' : ''}>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                Workspace
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">
                FFAA
              </h1>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                Books · GST · Tally
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
              className="mt-1 text-zinc-500 md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'mt-1 hidden text-zinc-500 md:inline-flex',
                sidebarCollapsed && 'mx-auto',
              )}
            >
              {sidebarCollapsed ? (
                <SidebarIcon className="h-4 w-4" />
              ) : (
                <SidebarSimple className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* nav — sliding ledger tab */}
          <nav className="flex flex-col gap-1">
            {tabs.map((t) => (
              <NavItem
                key={t.id}
                item={t}
                active={tab === t.id}
                collapsed={sidebarCollapsed}
                onSelect={() => setTab(t.id)}
              />
            ))}
          </nav>

          {sidebarCollapsed && clients.length > 0 && (
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setClientPopoverOpen((v) => !v)}
                    aria-label="Select client"
                    aria-expanded={clientPopoverOpen}
                    className="flex w-full items-center justify-center rounded-lg p-2 text-sm text-zinc-500 outline-none transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400"
                  >
                    <Buildings className="h-5 w-5 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Select client</TooltipContent>
              </Tooltip>
              {clientPopoverOpen && (
                <div className="absolute left-full top-0 z-50 ml-2 w-56 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white elev-3">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Select client
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClientId(c.id)
                          setClientPopoverOpen(false)
                        }}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 px-3 py-2 text-sm outline-none transition hover:bg-zinc-50 focus-visible:bg-zinc-50',
                          clientId === c.id && 'bg-emerald-50/60',
                        )}
                      >
                        <span className="truncate font-medium text-zinc-800">
                          {c.name}
                          {c.auto_created && (
                            <span className="ml-1.5 rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-normal text-zinc-500">
                              auto
                            </span>
                          )}
                        </span>
                        {clientId === c.id && (
                          <Check
                            weight="bold"
                            className="h-3.5 w-3.5 shrink-0 text-emerald-700"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateClient(true)
                      setClientPopoverOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-zinc-500 outline-none transition hover:bg-zinc-50 hover:text-zinc-800 focus-visible:bg-zinc-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add client
                  </button>
                </div>
              )}
            </div>
          )}

          {/* expanded footer — scope + refresh */}
          <div
            className={cn(
              'mt-6 pt-5 md:mt-auto',
              sidebarCollapsed ? 'md:hidden' : '',
              'border-t border-zinc-100',
            )}
          >
            <label
              htmlFor="client-select"
              className="block text-[11px] font-medium uppercase tracking-wide text-zinc-400"
            >
              Client
            </label>
            <select
              id="client-select"
              className="mt-1.5 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-zinc-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%20256%20256%22%3E%3Cpath%20fill%3D%22%2371717a%22%20d%3D%22M213.7%2C101.7l-80%2C80a8.2%2C8.2%2C0%2C0%2C1-11.4%2C0l-80-80a8.1%2C8.1%2C0%2C0%2C1%2C11.4-11.4L128%2C164.7l74.3-74.4a8.1%2C8.1%2C0%2C0%2C1%2C11.4%2C11.4Z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_0.6rem_center] bg-no-repeat py-2 pl-2.5 pr-7 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/25"
              value={clientId ?? ''}
              onChange={(e) => setClientId(Number(e.target.value) || null)}
            >
              {clients.length === 0 && <option value="">None</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.auto_created ? `${c.name} · auto` : c.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={load}
              className="mt-2 w-full border-zinc-200 text-xs text-zinc-600"
            >
              <ArrowsClockwise className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
