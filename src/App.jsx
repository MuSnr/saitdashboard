import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'
import { Component } from 'react'

import ProtectedRoute from '@/components/ProtectedRoute'

// ── Error boundary — catches runtime crashes and shows message instead of blank ──
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
          <div className="max-w-lg text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="text-gray-600 text-sm font-mono bg-red-50 p-3 rounded-lg border border-red-200 text-left break-all">
              {this.state.error?.message || String(this.state.error)}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
              className="px-4 py-2 bg-nova-navy text-white rounded-lg text-sm font-semibold hover:bg-nova-navy/90"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

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
import Incidents from '@/pages/Incidents'
import ClaimTemplates from '@/pages/ClaimTemplates'
import ReportIncident from '@/pages/ReportIncident'

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
    <ErrorBoundary>
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
          <ProtectedRoute roles={['admin', 'super_admin']}>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations"
        element={
          <ProtectedRoute roles={['admin', 'super_admin']}>
            <Locations />
          </ProtectedRoute>
        }
      />
      <Route path="/reconciliation" element={<ProtectedRoute><Reconciliation /></ProtectedRoute>} />
      {/* Incidents — admin/super_admin only (confidential) */}
      <Route
        path="/incidents"
        element={
          <ProtectedRoute roles={['admin', 'super_admin']}>
            <Incidents />
          </ProtectedRoute>
        }
      />
      {/* Public incident report form — no login required */}
      {/* /report-incident/ke → Kenya only, /report-incident/za → SA only */}
      <Route path="/report-incident" element={<ReportIncident />} />
      <Route path="/report-incident/:region" element={<ReportIncident />} />
      <Route
        path="/claim-templates"
        element={<ProtectedRoute roles={['admin', 'super_admin']}><ClaimTemplates /></ProtectedRoute>}
      />

      {/* ── Fallback ──────────────────────────────────────────── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </ErrorBoundary>
  )
}
