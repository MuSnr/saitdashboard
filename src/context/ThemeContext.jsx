import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(undefined)

// Apply theme to <html> immediately — prevents flash on load
function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// Resolve initial theme synchronously from storage or system preference
function getInitialTheme() {
  try {
    const stored = localStorage.getItem('sait-theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage blocked (private mode edge cases)
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const initial = getInitialTheme()
    // Apply immediately so there's no flash before React hydrates
    applyTheme(initial)
    return initial
  })

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem('sait-theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
