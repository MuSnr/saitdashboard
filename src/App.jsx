import { Routes, Route } from 'react-router-dom'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import DataEntry from '@/pages/DataEntry'
import Inventory from '@/pages/Inventory'
import InsuranceRegister from '@/pages/InsuranceRegister'
import Claims from '@/pages/Claims'
import Reports from '@/pages/Reports'
import PolicyDocuments from '@/pages/PolicyDocuments'
import Users from '@/pages/Users'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'

// TODO: re-enable Protected routing once backend auth is wired up
export default function App() {
  return (
    <Routes>
      <Route path="/login"              element={<Login />} />
      <Route path="/"                   element={<Dashboard />} />
      <Route path="/data-entry"         element={<DataEntry />} />
      <Route path="/inventory"          element={<Inventory />} />
      <Route path="/insurance-register" element={<InsuranceRegister />} />
      <Route path="/claims"             element={<Claims />} />
      <Route path="/reports"            element={<Reports />} />
      <Route path="/policies"           element={<PolicyDocuments />} />
      <Route path="/users"              element={<Users />} />
      <Route path="/settings"           element={<Settings />} />
      <Route path="*"                   element={<NotFound />} />
    </Routes>
  )
}
