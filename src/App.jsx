import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

import ProtectedRoute from '@/components/ProtectedRoute'

import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import DataEntry from '@/pages/DataEntry'
import Inventory from '@/pages/Inventory'
import InsuranceRegister from '@/pages/InsuranceRegister'
import Claims from '@/pages/Claims'
import Reports from '@/pages/Reports'
import PolicyDocuments from '@/pages/PolicyDocuments'
import Users from '@/pages/Users'
import Settings from '@/pages/Settings'
import Locations from '@/pages/Locations'
import NotFound from '@/pages/NotFound'
import Reconciliation from '@/pages/Reconciliation'

export default function App() {
  const { loading } = useAuth()

  // Wait for auth to initialise before rendering routes
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-nova-green" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* ── Public ───────────────────────────────────────────── */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* ── Protected — all authenticated users ──────────────── */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/data-entry" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/insurance-register" element={<ProtectedRoute><InsuranceRegister /></ProtectedRoute>} />
      <Route path="/claims" element={<ProtectedRoute><Claims /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/policies" element={<ProtectedRoute><PolicyDocuments /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* ── Protected — admin only ────────────────────────────── */}
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations"
        element={
          <ProtectedRoute roles={['admin']}>
            <Locations />
          </ProtectedRoute>
        }
      />
      <Route path="/reconciliation" element={<ProtectedRoute><Reconciliation /></ProtectedRoute>} />

      {/* ── Fallback ──────────────────────────────────────────── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
