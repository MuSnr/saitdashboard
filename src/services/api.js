import axios from 'axios'

// Axios instance — swap baseURL when backend is ready
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sait-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sait-token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginUser = (credentials) => api.post('/users/login', credentials)

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const fetchDashboardAnalytics = () =>
  api.get('/dashboard/analytics').then((r) => r.data).catch(() => null)

// ── Assets ────────────────────────────────────────────────────────────────────
export const fetchAssets = () => api.get('/assets').then((r) => r.data).catch(() => [])
export const createAsset = (data) => api.post('/assets', data).then((r) => r.data)
export const deleteAsset = (id) => api.delete(`/assets/${id}`).then((r) => r.data)

// ── Insurance Register ────────────────────────────────────────────────────────
export const fetchInsuranceRecords = () => api.get('/insurance-register').then((r) => r.data).catch(() => [])
export const createInsuranceRecord = (data) => api.post('/insurance-register', data).then((r) => r.data)
export const deleteInsuranceRecord = (id) => api.delete(`/insurance-register/${id}`).then((r) => r.data)

// ── Claims ────────────────────────────────────────────────────────────────────
export const fetchClaims = () => api.get('/claims').then((r) => r.data).catch(() => [])
export const createClaim = (data) => api.post('/claims', data).then((r) => r.data)
export const updateClaim = (id, data) => api.put(`/claims/${id}`, data).then((r) => r.data)
export const deleteClaim = (id) => api.delete(`/claims/${id}`).then((r) => r.data)

// ── Reports ───────────────────────────────────────────────────────────────────
export const fetchReportData = (type, filters) =>
  api.get('/reports', { params: { type, ...filters } }).then((r) => r.data).catch(() => [])

// ── Policies ──────────────────────────────────────────────────────────────────
export const fetchPolicies = () => api.get('/policies').then((r) => r.data).catch(() => [])
export const createPolicy = (data) => api.post('/policies', data).then((r) => r.data)
export const deletePolicy = (id) => api.delete(`/policies/${id}`).then((r) => r.data)

// ── Users ─────────────────────────────────────────────────────────────────────
export const fetchUsers = () => api.get('/users').then((r) => r.data).catch(() => [])
export const createUser = (data) => api.post('/users', data).then((r) => r.data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data)
export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data)
