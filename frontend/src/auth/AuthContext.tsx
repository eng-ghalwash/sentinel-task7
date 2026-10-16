import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, apiFetch, getToken, setToken } from '../api/client'
import type { Role, User } from '../types'

interface LoginResult {
  access_token: string | null
  user: User | null
  requires_totp: boolean
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (
    username: string,
    password: string,
    totpCode?: string,
  ) => Promise<{ requires_totp: boolean }>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const me = await apiFetch<User>('/api/auth/me')
    setUser(me)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    apiFetch<User>('/api/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(
    async (username: string, password: string, totpCode?: string) => {
      try {
        const result = await apiFetch<LoginResult>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username,
            password,
            totp_code: totpCode || null,
          }),
        })
        if (result.requires_totp) {
          return { requires_totp: true }
        }
        if (!result.access_token || !result.user) {
          throw new Error('Login failed')
        }
        setToken(result.access_token)
        setUser(result.user)
        return { requires_totp: false }
      } catch (err) {
        if (err instanceof ApiError) throw err
        throw err
      }
    },
    [],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  )

  const value = useMemo(
    () => ({ user, loading, login, logout, hasRole, refreshUser }),
    [user, loading, login, logout, hasRole, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
