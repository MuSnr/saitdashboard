import { createContext, useContext, useState, useCallback } from 'react'
import { loginUser } from '@/services/api'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  // TODO: remove dummy user once real auth is in place
  const DUMMY_USER = { id: 'dev', name: 'Dev User', email: 'dev@sait.co.za', role: 'Admin' }

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sait-user')
      return stored ? JSON.parse(stored) : DUMMY_USER
    } catch {
      return DUMMY_USER
    }
  })
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const { data } = await loginUser({ email, password })
      const userData = data.user || data
      setUser(userData)
      if (data.token) localStorage.setItem('sait-token', data.token)
      localStorage.setItem('sait-user', JSON.stringify(userData))
      return userData
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('sait-token')
    localStorage.removeItem('sait-user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
