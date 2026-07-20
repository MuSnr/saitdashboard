import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

// ── Request interceptor — attach token + region override ─────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sait-token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // For super_admin profile switching — append active region to all GET requests
  // so backend scopes data to the currently viewed profile
  const activeRegion = localStorage.getItem('sait-active-region')
  if (activeRegion && config.method === 'get') {
    config.params = { ...config.params, region: activeRegion }
  }

  return config
})

// ── Response interceptor — handle 401 globally ───────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sait-token')
      localStorage.removeItem('sait-user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ── Helper ────────────────────────────────────────────────────────────────────
export const getApiError = (err) =>
  err?.response?.data?.message || err?.message || 'An unexpected error occurred.'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginUser        = (credentials)         => api.post('/users/login', credentials)
export const registerUser     = (data)                => api.post('/users/register', data)
export const forgotPassword   = (email)               => api.post('/users/forgot-password', { email })
export const resetPassword    = (token, password)     => api.post(`/users/reset-password/${token}`, { password })
export const changePassword   = (data)                => api.put('/users/change-password', data)
export const getMe            = ()                    => api.get('/users/me')

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const fetchDashboardAnalytics = (params) =>
  api.get('/dashboard/analytics', { params }).then((r) => r.data).catch(() => null)

// ── Assets ────────────────────────────────────────────────────────────────────
export const fetchAssets  = (params) =>
  api.get('/assets', { params }).then((r) => r.data?.assets || []).catch(() => [])
export const createAsset  = (data)        => api.post('/assets', data).then((r) => r.data)
export const updateAsset  = (id, data)    => api.put(`/assets/${id}`, data).then((r) => r.data)
export const deleteAsset  = (id)          => api.delete(`/assets/${id}`).then((r) => r.data)
export const uploadAssetDocument = (formData) =>
  api.post('/assets/upload-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }).then((r) => r.data)
export const bulkImportAssets = (formData) =>
  api.post('/assets/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  }).then((r) => r.data)
export const downloadAssetTemplate = () =>
  api.get('/assets/template', { responseType: 'blob' }).then((r) => r.data)

// ── Insurance Register ────────────────────────────────────────────────────────
export const fetchInsuranceRecords  = () =>
  api.get('/insurance-register').then((r) => r.data?.records || []).catch(() => [])
export const createInsuranceRecord  = (data)     => api.post('/insurance-register', data).then((r) => r.data)
export const updateInsuranceRecord  = (id, data) => api.put(`/insurance-register/${id}`, data).then((r) => r.data)
export const deleteInsuranceRecord  = (id)       => api.delete(`/insurance-register/${id}`).then((r) => r.data)
export const bulkImportInsurance    = (formData) =>
  api.post('/insurance-register/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,   // 5 minutes for large files (2400+ rows)
  }).then((r) => r.data)
export const downloadInsuranceTemplate = () =>
  api.get('/insurance-register/template', { responseType: 'blob' }).then((r) => r.data)

// ── Claims ────────────────────────────────────────────────────────────────────
export const fetchClaims  = () =>
  api.get('/claims').then((r) => r.data?.claims || []).catch(() => [])
export const createClaim  = (data)     => api.post('/claims', data).then((r) => r.data)
export const updateClaim  = (id, data) => api.put(`/claims/${id}`, data).then((r) => r.data)
export const deleteClaim  = (id)       => api.delete(`/claims/${id}`).then((r) => r.data)
export const bulkImportClaims = (formData) =>
  api.post('/claims/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }).then((r) => r.data)
export const downloadClaimsTemplate = () =>
  api.get('/claims/template', { responseType: 'blob' }).then((r) => r.data)

// ── Reports ───────────────────────────────────────────────────────────────────
export const fetchVarianceReport = (params) =>
  api.get('/reports/variance', { params }).then((r) => r.data?.report || [])
export const fetchClaimsReport   = (params) =>
  api.get('/reports/claims',   { params }).then((r) => r.data?.report || [])
export const fetchAssetsReport   = (params) =>
  api.get('/reports/assets',   { params }).then((r) => r.data?.report || [])

// ── Policies ──────────────────────────────────────────────────────────────────
export const fetchPolicies  = () =>
  api.get('/policies').then((r) => r.data?.policies || []).catch(() => [])
export const createPolicy   = (data)     => api.post('/policies', data).then((r) => r.data)
export const updatePolicy   = (id, data) => api.put(`/policies/${id}`, data).then((r) => r.data)
export const deletePolicy   = (id)       => api.delete(`/policies/${id}`).then((r) => r.data)
export const bulkImportPolicies = (formData) =>
  api.post('/policies/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }).then((r) => r.data)
export const downloadPoliciesTemplate = () =>
  api.get('/policies/template', { responseType: 'blob' }).then((r) => r.data)

// ── Users (admin) ─────────────────────────────────────────────────────────────
export const fetchUsers   = () =>
  api.get('/users').then((r) => r.data?.users || []).catch(() => [])
export const createUser   = (data)     => api.post('/users', data).then((r) => r.data)
export const inviteUser   = (data)     => api.post('/users/invite', data, { timeout: 15000 }).then((r) => r.data)
export const updateUser   = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data)
export const deleteUser   = (id)       => api.delete(`/users/${id}`).then((r) => r.data)
export const approveUser  = (id, action) => api.put(`/users/${id}/approve`, { action }).then((r) => r.data)

// ── Campuses ──────────────────────────────────────────────────────────────────
export const fetchCampuses  = (params) =>
  api.get('/campuses', { params }).then((r) => r.data?.campuses || []).catch(() => [])
export const createCampus   = (data)     => api.post('/campuses', data).then((r) => r.data)
export const updateCampus   = (id, data) => api.put(`/campuses/${id}`, data).then((r) => r.data)
export const deleteCampus   = (id)       => api.delete(`/campuses/${id}`).then((r) => r.data)

// ── Sub-Campuses ──────────────────────────────────────────────────────────────
export const fetchSubCampuses = (campusId) =>
  api.get('/sub-campuses', { params: campusId ? { campus: campusId } : {} })
    .then((r) => r.data?.subCampuses || []).catch(() => [])
export const createSubCampus  = (data)     => api.post('/sub-campuses', data).then((r) => r.data)
export const updateSubCampus  = (id, data) => api.put(`/sub-campuses/${id}`, data).then((r) => r.data)
export const deleteSubCampus  = (id)       => api.delete(`/sub-campuses/${id}`).then((r) => r.data)

// ── Incidents ─────────────────────────────────────────────────────────────────
export const fetchIncidents     = (params) =>
  api.get('/incidents', { params }).then((r) => r.data?.incidents || []).catch(() => [])
export const fetchIncidentById  = (id) =>
  api.get(`/incidents/${id}`).then((r) => r.data?.incident)
export const createIncident     = (data) =>
  api.post('/incidents', data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }).then((r) => r.data)
export const updateIncident     = (id, data) =>
  api.put(`/incidents/${id}`, data).then((r) => r.data)
export const deleteIncident     = (id) =>
  api.delete(`/incidents/${id}`).then((r) => r.data)
export const convertIncidentToClaim = (id) =>
  api.post(`/incidents/${id}/convert`).then((r) => r.data)
export const markNotificationsRead  = () =>
  api.put('/users/notifications/read').then((r) => r.data)

// ── Reconciliation ─────────────────────────────────────────────────────────────
export const fetchReconciliation  = (params) =>
  api.get('/reconciliation', { params }).then((r) => r.data)
export const linkRecords          = (assetId, insuranceRecordId) =>
  api.post('/reconciliation/link', { assetId, insuranceRecordId }).then((r) => r.data)
export const unlinkRecord         = (assetId) =>
  api.delete(`/reconciliation/link/${assetId}`).then((r) => r.data)
export const fetchLinkSuggestions = (assetId) =>
  api.get(`/reconciliation/suggestions/${assetId}`).then((r) => r.data?.suggestions || [])
export const runAutoLink          = () =>
  api.post('/reconciliation/auto-link').then((r) => r.data)
