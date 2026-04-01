/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { setUnauthorizedHandler } from '@/lib/api'

const AUTH_STORAGE_KEY = 'eds.auth.token'

type AuthContextValue = {
  token: string | null
  isAuthenticated: boolean
  setToken: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readPersistedToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const persisted = window.localStorage.getItem(AUTH_STORAGE_KEY)
  return persisted && persisted.length > 0 ? persisted : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => readPersistedToken())

  const setToken = useCallback((nextToken: string) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, nextToken)
    setTokenState(nextToken)
  }, [])

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setTokenState(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      setToken,
      logout,
    }),
    [logout, setToken, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
