import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Plus, FileText, Users, Settings, Search,
  TrendingUp, Moon, Sun, LogOut, Shield, Bell, ChevronLeft,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

const navItems = [
  { label: 'Dashboard',          icon: BarChart3,  href: '/' },
  { label: 'Data Entry',         icon: Plus,        href: '/data-entry' },
  { label: 'Asset Inventory',    icon: Search,      href: '/inventory' },
  { label: 'Insurance Register', icon: Shield,      href: '/insurance-register' },
  { label: 'Claims Pipeline',    icon: TrendingUp,  href: '/claims' },
  { label: 'Reports',            icon: BarChart3,   href: '/reports' },
  { label: 'Policy Documents',   icon: FileText,    href: '/policies' },
  { label: 'User Management',    icon: Users,       href: '/users' },
]

const bottomItems = [
  { label: 'Settings', icon: Settings, href: '/settings' },
]

export function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  const handleLogout = () => { logout(); navigate('/login') }

  const displayName = user?.name || user?.display_name || 'User'
  const displayEmail = user?.email || ''
  const displayRole = user?.role || ''
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  const SidebarLink = ({ label, icon: Icon, href }) => {
    const active = isActive(href)
    return (
      <Link
        to={href}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? label : undefined}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
          ${active
            ? 'bg-nova-green text-nova-navy font-semibold shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
          }
        `}
      >
        <Icon size={18} className="flex-shrink-0" />
        {!collapsed && <span className="text-sm">{label}</span>}
        {collapsed && (
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
            {label}
          </div>
        )}
      </Link>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-40 flex flex-col
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[70px]' : 'w-60'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 pt-6 pb-5 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-9 h-9 bg-nova-navy rounded-xl flex items-center justify-center font-bold text-nova-green text-sm flex-shrink-0 shadow-sm">
            SA
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-nova-navy dark:text-white text-base leading-none">SAIT</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Nova Pioneer</p>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Main Menu</p>
          )}
          {navItems.map((item) => <SidebarLink key={item.href} {...item} />)}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-1 border-t border-gray-100 dark:border-gray-800 pt-3">
          {bottomItems.map((item) => <SidebarLink key={item.href} {...item} />)}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Log out' : undefined}
            className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all group"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm">Log out</span>}
            {collapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Log out
              </div>
            )}
          </button>

          {/* Theme + collapse */}
          <div className={`flex items-center gap-2 px-3 pt-1 ${collapsed ? 'justify-center' : ''}`}>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-yellow-400" />}
            </button>
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="ml-auto p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
              >
                <ChevronLeft size={16} className="rotate-180" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 md:px-8 py-4 flex items-center justify-between">
          {/* Left: page title area / mobile menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-5 h-3.5 flex flex-col justify-between">
                <span className="block h-0.5 bg-gray-600 dark:bg-gray-300 rounded" />
                <span className="block h-0.5 bg-gray-600 dark:bg-gray-300 rounded w-3" />
                <span className="block h-0.5 bg-gray-600 dark:bg-gray-300 rounded" />
              </div>
            </button>
            <div className="hidden md:block">
              <p className="text-xl font-bold text-nova-navy dark:text-white leading-none">
                Welcome back, {displayName.split(' ')[0]}!
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Asset Reconciliation Platform · Nova Pioneer</p>
            </div>
          </div>

          {/* Right: actions + avatar */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
              <Search size={18} />
            </button>
            <button className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-nova-orange rounded-full" />
            </button>

            {/* Avatar block */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200 dark:border-gray-700 ml-1">
              <div className="w-9 h-9 rounded-full bg-nova-green flex items-center justify-center text-nova-navy font-bold text-sm flex-shrink-0">
                {initials}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-nova-navy dark:text-white leading-none">{displayName}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[130px]">{displayEmail}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto">
          <div className="p-5 md:p-8 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
