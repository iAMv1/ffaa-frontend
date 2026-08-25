/**
 * Session context: the current user resolved from the httpOnly cookie session.
 * Boot fetches /auth/me once; login/register/logout mutate that single source
 * of truth. Route guarding lives here too (ProtectedRoute) so pages never
 * hand-roll redirects. Server data stays in DataProvider (state/data.tsx).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { Navigate, useLocation } from 'react-router'
import { auth, type AuthUser } from '@/api'

interface AuthStore {
  user: AuthUser | null
  /** true while the boot /auth/me round-trip is in flight */
  booting: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
}

const AuthCtx = createContext<AuthStore | null>(null)

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [booting, setBooting] = useState(true)

  // One boot probe; a 401 just means "signed out", not an error worth surfacing.
  useEffect(() => {
    let alive = true
    auth
      .me()
      .then((u) => {
        if (alive) setUser(u)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setBooting(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await auth.login(email, password)
    setUser(await auth.me())
  }, [])

  // fastapi-users register does not mint a session — log in immediately after.
  const register = useCallback(
    async (email: string, password: string) => {
      await auth.register(email, password)
      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await auth.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthStore>(
    () => ({
      user,
      booting,
      login,
      register,
      logout,
      forgotPassword: auth.forgotPassword,
      resetPassword: auth.resetPassword,
    }),
    [user, booting, login, register, logout],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

/** Gate for the /app shell: boots to a spinner, bounces signed-out users to
 *  /login remembering where they came from (state.from). */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas text-zinc-400">
        <CircleNotch className="h-6 w-6 animate-spin" aria-label="Loading session" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
