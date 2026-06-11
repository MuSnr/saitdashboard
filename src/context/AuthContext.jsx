import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loginUser, getMe } from '@/services/api'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while we verify token on mount

  // ── On mount: verify stored token ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('sait-token')
    if (!token) {
      setLoading(false)
      return
    }
    // Verify token is still valid by fetching the current user
    getMe()
      .then(({ data }) => {
        setUser(data.user)
        localStorage.setItem('sait-user', JSON.stringify(data.user))
      })
      .catch(() => {
        localStorage.removeItem('sait-token')
        localStorage.removeItem('sait-user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await loginUser({ email, password })
    if (!data.success) throw new Error(data.message)
    const userData = data.user
    setUser(userData)
    localStorage.setItem('sait-token', data.token)
    localStorage.setItem('sait-user', JSON.stringify(userData))
    return userData
  }, [])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('sait-token')
    localStorage.removeItem('sait-user')
  }, [])

  // ── Role helpers ───────────────────────────────────────────────────────────
  const isAdmin = user?.role === 'admin'
  const isCampusManager = user?.role === 'campus_manager'
  const isViewer = user?.role === 'viewer'
  const hasRole = (...roles) => roles.includes(user?.role)

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        isAdmin,
        isCampusManager,
        isViewer,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
