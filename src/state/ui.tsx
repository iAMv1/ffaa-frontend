/**
 * Session context: shell chrome that changes rarely. Navigation lives in the
 * URL (react-router) since P2. Server data lives in DataProvider
 * (state/data.tsx); per-surface ephemeral state lives inside its only
 * consuming surface. Split rationale: F-02/F-21.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ConfirmState } from '@/state/types'

interface UiStore {
  sidebarCollapsed: boolean
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  showCreateClient: boolean
  setShowCreateClient: React.Dispatch<React.SetStateAction<boolean>>
  newClientName: string
  setNewClientName: React.Dispatch<React.SetStateAction<string>>
  confirm: ConfirmState | null
  setConfirm: React.Dispatch<React.SetStateAction<ConfirmState | null>>
}

const UiCtx = createContext<UiStore | null>(null)

export function useUi() {
  const ctx = useContext(UiCtx)
  if (!ctx) throw new Error('useUi must be used within UiProvider')
  return ctx
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  // Esc dismisses the create-client dialog
  useEffect(() => {
    if (!showCreateClient) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCreateClient(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [showCreateClient])

  return (
    <UiCtx.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        sidebarOpen,
        setSidebarOpen,
        showCreateClient,
        setShowCreateClient,
        newClientName,
        setNewClientName,
        confirm,
        setConfirm,
      }}
    >
      {children}
    </UiCtx.Provider>
  )
}
