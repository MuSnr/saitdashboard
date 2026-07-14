import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loginUser, getMe } from '@/services/api'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Super admin can override their active region without changing their account
  const [activeRegion, setActiveRegion] = useState(null)

  // ── On mount: verify stored token ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('sait-token')
    if (!token) { setLoading(false); return }
    getMe()
      .then(({ data }) => {
        setUser(data.user)
        localStorage.setItem('sait-user', JSON.stringify(data.user))
        // Restore any saved region override for super_admin
        const saved = localStorage.getItem('sait-active-region')
        if (data.user.role === 'super_admin' && saved) setActiveRegion(saved)
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
    setActiveRegion(null) // reset any override on fresh login
    localStorage.setItem('sait-token', data.token)
    localStorage.setItem('sait-user', JSON.stringify(userData))
    localStorage.removeItem('sait-active-region')
    return userData
  }, [])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null)
    setActiveRegion(null)
    localStorage.removeItem('sait-token')
    localStorage.removeItem('sait-user')
    localStorage.removeItem('sait-active-region')
  }, [])

  // ── Super admin region switch ──────────────────────────────────────────────
  const switchRegion = useCallback((newRegion) => {
    setActiveRegion(newRegion)
    if (newRegion) {
      localStorage.setItem('sait-active-region', newRegion)
    } else {
      localStorage.removeItem('sait-active-region')
    }
  }, [])

  // ── Role helpers ───────────────────────────────────────────────────────────
  const isAdmin         = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin    = user?.role === 'super_admin'
  const isCampusManager = user?.role === 'campus_manager'
  const isViewer        = user?.role === 'viewer'
  const hasRole         = (...roles) => roles.includes(user?.role)

  // ── Region helpers — super_admin uses activeRegion override ───────────────
  const region         = (isSuperAdmin && activeRegion) ? activeRegion : (user?.region || 'South Africa')
  const isKenya        = region === 'Kenya'
  const isSouthAfrica  = region === 'South Africa'
  const currencySymbol = isKenya ? 'KES' : 'R'

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        switchRegion,
        activeRegion: region,   // the currently active region (may be overridden)
        isAdmin,
        isSuperAdmin,
        isCampusManager,
        isViewer,
        hasRole,
        region,
        isKenya,
        isSouthAfrica,
        currencySymbol,
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
