import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Plus, Trash2, Upload, File, X, Shield, Edit2, Loader2, RefreshCw, Link2, Unlink, Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  fetchInsuranceRecords, createInsuranceRecord, updateInsuranceRecord,
  deleteInsuranceRecord, bulkImportInsurance, downloadInsuranceTemplate, getApiError,
} from '@/services/api'
import { useCampuses } from '@/context/CampusContext'
import { useAuth } from '@/context/AuthContext'
import { Link } from 'react-router-dom'
import DocumentLinkInput from '@/components/DocumentLinkInput'

const insuranceClasses = [
  'Fire', 'Buildings Combined', 'Business All Risk', 'Electronic Equipment',
  'Theft Section', 'Business Interruption', 'Public Liability', 'Umbrella Liability',
  'Employers Liability', 'Sasria', 'Broker Fees', 'TWK Assist / Bystand',
]
const statuses = ['Active', 'Request Removal', 'Request Addition', 'Request Update', 'Removed', 'Insured', 'Pending Review']
const categories = ['Asset Based', 'Risk Based', 'Fees']

const KE_ASSET_CLASSES = [
  'Buildings',
  'Equipment - Computers',
  'Equipment - Electronic',
  'Equipment - General',
  'Equipment - Infirmary',
  'Equipment - Kitchen',
  'Equipment - Laboratory',
  'Equipment - Leased',
  'Equipment - Sports',
  'Equipment - Tech Installations',
  'Equipment - Tech Other',
  'Expensed',
  'Fire Fighting Equipment',
  'Fixtures',
  'Furniture',
  'Property Equipment & Fixtures',
  'Signage',
]

const statusColour = {
  Active:             'bg-green-100 text-green-700',
  Insured:            'bg-green-100 text-green-700',
  'Request Removal':  'bg-red-100 text-red-700',
  'Request Addition': 'bg-blue-100 text-blue-700',
  'Request Update':   'bg-amber-100 text-amber-700',
  Removed:            'bg-gray-100 text-gray-500',
  'Pending Review':   'bg-amber-100 text-amber-700',
}

const blank = {
  subsidiary: '', status: 'Active', monthYrAcquisition: '', classOfInsurance: '',
  assetOrInsurableRisk: '', descriptionDetails: '', brandModel: '', serialNumber: '',
  quantity: '1', unitCost: '', monthlyPremium: '', sumInsured: '', rate: '',
  december2025Premium: '', premiumYear: String(new Date().getFullYear()),
  interestNoted: '', vendor: '', notes: '',
  category: 'Asset Based', policyReference: '',
  // Kenya admin fields
  physical_location: '', procuring_department: '', year_of_purchase: '',
  years_of_service: '', age_bracket: '', asset_class: '',
  insurance_priority: '', asset_usage_status: '', quantity_insured: '',
  quantity_retired: '', retired_asset_value: '', insurable_value: '',
  retire_write_off_date: '', ownership: '',
  document_link: '', pr_ref: '',
  is_insured: false, uninsured_flag: false,
  status_detail: '', comments: '',
}

export default function InsuranceRegister() {
  const { campuses, loading: campusLoading } = useCampuses()
  const { isAdmin, isKenya, currencySymbol } = useAuth()
  const [searchParams] = useSearchParams()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form, setForm] = useState(blank)
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all')

  // ── Bulk upload state ──────────────────────────────────────────────────────
  const [bulkFile,     setBulkFile]     = useState(null)
  const [bulkUploading,setBulkUploading]= useState(false)
  const [bulkResult,   setBulkResult]   = useState(null)

  const set = (k, v) => setForm((p) => {
    const updated = { ...p, [k]: v }
    // Auto-calculate years of service when year of purchase changes
    if (k === 'year_of_purchase' && v) {
      const yos = new Date().getFullYear() - Number(v)
      if (yos >= 0) updated.years_of_service = String(yos)
    }
    return updated
  })
  const setF = (k) => (e) => set(k, e.target.value)
  const currentYear = new Date().getFullYear()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchInsuranceRecords()
      setRecords(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Campus list scoped to user's region — comes pre-filtered from the backend
  const campusOptions = campuses.map((c) => c.name).sort()

  const openCreate = () => { setEditRecord(null); setForm(blank); setFiles([]); setDialogOpen(true) }
  const openEdit = (r) => {
    setEditRecord(r)
    setForm({
      subsidiary: r.subsidiary, status: r.status, monthYrAcquisition: r.monthYrAcquisition || '',
      classOfInsurance: r.classOfInsurance, assetOrInsurableRisk: r.assetOrInsurableRisk || '',
      descriptionDetails: r.descriptionDetails || '', brandModel: r.brandModel || '',
      serialNumber: r.serialNumber || '', quantity: String(r.quantity || 1),
      unitCost: String(r.unitCost || ''), monthlyPremium: String(r.monthlyPremium || ''),
      sumInsured: String(r.sumInsured || ''), rate: String(r.rate || ''),
      december2025Premium: String(r.annualPremium ?? r.december2025Premium ?? ''),
      premiumYear: String(r.premiumYear || new Date().getFullYear()),
      interestNoted: r.interestNoted || '',
      vendor: r.vendor || '', notes: r.notes || '', category: r.category || 'Asset Based',
      policyReference: r.policyReference || '',
      // Kenya admin fields
      physical_location:    r.physical_location    || '',
      procuring_department: r.procuring_department || '',
      year_of_purchase:     r.year_of_purchase     ? String(r.year_of_purchase) : '',
      years_of_service:     r.years_of_service     ? String(r.years_of_service) : '',
      age_bracket:          r.age_bracket          || '',
      asset_class:          r.asset_class          || '',
      insurance_priority:   r.insurance_priority   || '',
      asset_usage_status:   r.asset_usage_status   || '',
      quantity_insured:     r.quantity_insured      ? String(r.quantity_insured) : '',
      quantity_retired:     r.quantity_retired      ? String(r.quantity_retired) : '',
      retired_asset_value:  r.retired_asset_value   ? String(r.retired_asset_value) : '',
      insurable_value:      r.insurable_value        ? String(r.insurable_value) : '',
      retire_write_off_date: r.retire_write_off_date ? new Date(r.retire_write_off_date).toISOString().slice(0,10) : '',
      ownership:            r.ownership            || '',
      document_link:        r.document_link        || '',
      pr_ref:               r.pr_ref               || '',
      is_insured:           r.is_insured           ?? false,
      uninsured_flag:       r.uninsured_flag       ?? false,
      status_detail:        r.status_detail        || '',
      comments:             r.comments             || '',
    })
    setFiles([])
    setDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Kenya: only subsidiary + sumInsured required (no classOfInsurance in KE form)
    // SA: subsidiary + classOfInsurance + sumInsured all required
    if (!form.subsidiary) {
      toast.error('Campus is required'); return
    }
    if (!isKenya && !form.classOfInsurance) {
      toast.error('Class of Insurance is required'); return
    }
    if (!form.sumInsured) {
      toast.error('Sum Insured is required'); return
    }
    setSubmitting(true)
    const payload = {
      ...form,
      quantity: Number(form.quantity) || 1,
      unitCost: Number(form.unitCost) || 0,
      monthlyPremium: Number(form.monthlyPremium) || 0,
      sumInsured: Number(form.sumInsured),
      rate: Number(form.rate) || 0,
      annualPremium: Number(form.december2025Premium) || 0,
      premiumYear: Number(form.premiumYear) || currentYear,
      december2025Premium: Number(form.december2025Premium) || 0,
      // Kenya numeric fields
      year_of_purchase:    form.year_of_purchase    ? Number(form.year_of_purchase) : null,
      years_of_service:    form.years_of_service    ? Number(form.years_of_service) : null,
      quantity_insured:    form.quantity_insured     ? Number(form.quantity_insured) : 0,
      quantity_retired:    form.quantity_retired     ? Number(form.quantity_retired) : 0,
      retired_asset_value: form.retired_asset_value  ? Number(form.retired_asset_value) : 0,
      insurable_value:     form.insurable_value       ? Number(form.insurable_value) : 0,
    }
    try {
      if (editRecord) {
        const data = await updateInsuranceRecord(editRecord._id, payload)
        setRecords((p) => p.map((r) => (r._id === editRecord._id ? data.record : r)))
        toast.success('Record updated')
      } else {
        const data = await createInsuranceRecord(payload)
        setRecords((p) => [data.record, ...p])
        toast.success('Insurance record added')
      }
      setDialogOpen(false)
      setForm(blank)
      setFiles([])
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this insurance record?')) return
    try {
      await deleteInsuranceRecord(id)
      setRecords((p) => p.filter((r) => r._id !== id))
      toast.success('Record deleted')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadInsuranceTemplate()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'insurance-register-template.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const handleBulkUpload = async () => {
    if (!bulkFile) { toast.error('Please select a file'); return }
    setBulkUploading(true)
    setBulkResult(null)
    try {
      const fd = new FormData()
      fd.append('file', bulkFile)
      const result = await bulkImportInsurance(fd)
      setBulkResult(result)
      if (result.inserted > 0) {
        toast.success(`${result.inserted} record${result.inserted !== 1 ? 's' : ''} imported`)
        await load()
      }
      if (result.errors > 0) toast.warning(`${result.errors} row${result.errors !== 1 ? 's' : ''} had errors`)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setBulkFile(null)
      setBulkUploading(false)
    }
  }

  const totalSumInsured = records.reduce((s, r) => s + (r.sumInsured || 0), 0)
  const totalMonthly    = records.reduce((s, r) => s + (r.monthlyPremium || 0), 0)
  const filteredRecords = statusFilter === 'all' ? records : records.filter((r) => r.status === statusFilter)
  const fmtMoney = (n) => `${currencySymbol} ${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Insurance Register</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage sum insured — reconcile against asset registry</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw size={14} /></Button>
            {isAdmin && <Button onClick={openCreate}><Plus size={16} /> Add Record</Button>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          {[
            { label: 'Total Records',      value: records.length,                                   color: 'text-nova-navy dark:text-white' },
            { label: 'Linked to Assets',   value: records.filter((r) => r.linkedAssetId).length,    color: 'text-green-600' },
            { label: isKenya ? 'All Matched (1:1)' : 'Not Linked (Ghost)', value: isKenya ? records.filter((r) => r.linkedAssetId).length : records.filter((r) => !r.linkedAssetId).length, color: isKenya ? 'text-green-600' : 'text-red-600' },
            { label: 'Total Sum Insured',  value: fmtMoney(totalSumInsured),                        color: 'text-nova-teal' },
          ].map(({ label, value, color }) => (
            <Card key={label}><CardContent className="p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Reconciliation shortcut */}
        <div className="flex items-center gap-3 p-4 bg-nova-teal/10 border border-nova-teal/30 rounded-xl">
          <Link2 size={18} className="text-nova-teal flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-nova-navy dark:text-white">
              {records.filter((r) => !r.linkedAssetId).length} records have no matching asset
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Go to the Reconciliation page to link them or identify ghost items you should stop paying for.
            </p>
          </div>
          <Link to="/reconciliation">
            <Button size="sm" variant="outline">View Reconciliation</Button>
          </Link>
        </div>

        {/* Table */}
        <Tabs defaultValue="records">
          <TabsList>
            <TabsTrigger value="records">Records List</TabsTrigger>
            {isAdmin && <TabsTrigger value="bulk">Bulk Import</TabsTrigger>}
          </TabsList>

          {/* Records tab */}
          <TabsContent value="records">
        <Card className="overflow-hidden">
          <CardHeader className="py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">
                {loading ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</span> : `Records (${filteredRecords.length}${statusFilter !== 'all' ? ` filtered` : ''})`}
              </CardTitle>
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          {!loading && filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Shield size={40} className="opacity-40" />
              <p className="font-medium">{statusFilter !== 'all' ? `No "${statusFilter}" records` : 'No records yet — click "Add Record" to start'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['Subsidiary', 'Status', 'Class', 'Description', 'Linked Asset', 'Sum Insured', isKenya ? 'Annual Premium' : 'Monthly Premium', 'Annual Premium', ...(isAdmin ? [''] : [])].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRecords.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{r.subsidiary}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColour[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{r.classOfInsurance}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[160px] truncate" title={r.descriptionDetails || r.assetOrInsurableRisk}>
                        {r.descriptionDetails || r.assetOrInsurableRisk || '—'}
                      </td>
                      {/* Linked Asset */}
                      <td className="px-4 py-3">
                        {r.linkedAssetId ? (
                          <div className="flex items-center gap-1.5">
                            <Link2 size={11} className="text-green-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] font-mono text-green-700 font-semibold">{r.linkedAssetId.assetId}</p>
                              <p className="text-[10px] text-gray-400 truncate max-w-[100px]">{r.linkedAssetId.description}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                            <Unlink size={10} /> Not linked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-nova-teal text-xs tabular-nums">{fmtMoney(r.sumInsured || 0)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs tabular-nums">
                        {isKenya ? '—' : fmtMoney(r.monthlyPremium || 0)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs tabular-nums">
                        <span className="text-nova-teal font-medium">
                          {fmtMoney((r.annualPremium ?? r.december2025Premium) || 0)}
                        </span>
                        {r.premiumYear && (
                          <span className="ml-1 text-[10px] text-gray-400">({r.premiumYear})</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete(r._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
          </TabsContent>

          {/* Bulk Import tab — admin only */}
          {isAdmin && (
          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Bulk Import Insurance Records</CardTitle>
                    <CardDescription>Upload an Excel or CSV file to import multiple records at once.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5 flex-shrink-0">
                    <Download size={14} /> Download Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
                  <FileSpreadsheet size={36} className="text-nova-green" />
                  <div className="text-center">
                    <p className="font-medium text-nova-navy dark:text-white">{bulkFile ? bulkFile.name : 'Click to select file or drag & drop'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Excel (.xlsx, .xls) and CSV — max 10 MB</p>
                  </div>
                  {bulkFile && (
                    <button type="button" onClick={(e) => { e.preventDefault(); setBulkFile(null); setBulkResult(null) }} className="text-red-500 hover:text-red-700"><X size={18} /></button>
                  )}
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => { setBulkFile(e.target.files?.[0] || null); setBulkResult(null) }} />
                </label>
                <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Required columns</p>
                  <div className="grid grid-cols-2 gap-x-4">
                    {[['School (Campus) *','required'],['Class of Insurance *','required'],['Sum Insured (R) *','required'],['Status','default: Active'],['Description Details','optional'],['Serial Number','optional'],['Monthly Premium (R)','optional'],['Policy Reference','optional']].map(([col, hint]) => (
                      <p key={col} className="flex items-center gap-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-nova-green flex-shrink-0" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{col}</span>
                        <span className="text-gray-400">— {hint}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <Button onClick={handleBulkUpload} disabled={!bulkFile || bulkUploading} className="w-full">
                  {bulkUploading ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><Upload size={16} /> Upload & Import</>}
                </Button>
                {bulkResult && (
                  <div className="space-y-3">
                    {/* Detected headers — critical for diagnosing column mismatches */}
                    {bulkResult.details?.rawHeaders && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Columns detected in your file:</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono break-all">
                          {bulkResult.details.rawHeaders.join(' | ')}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">{bulkResult.inserted} imported</span>
                      </div>
                      {bulkResult.errors > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                            {bulkResult.details?.totalErrors || bulkResult.errors} errors
                            {bulkResult.details?.totalErrors > 20 ? ' (showing first 20)' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    {bulkResult.details?.errors?.length > 0 && (
                      <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
                        <p className="px-3 py-2 text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                          Error details — check your column names match the template
                        </p>
                        <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                          {bulkResult.details.errors.map((r, i) => (
                            <div key={i} className="flex items-start gap-3 px-3 py-2 text-xs">
                              <span className="text-gray-400 flex-shrink-0 font-mono">row {r.row}</span>
                              <span className="text-red-600 dark:text-red-400">{r.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRecord ? 'Edit Insurance Record' : 'Add Insurance Record'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">

            {/* ── Campus (always shown) ─────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Campus *</Label>
              <Select value={form.subsidiary} onValueChange={(v) => set('subsidiary', v)}>
                <SelectTrigger><SelectValue placeholder={campusLoading ? 'Loading campuses…' : 'Select campus'} /></SelectTrigger>
                <SelectContent>{campusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* ══ KENYA FORM ══════════════════════════════════════════════ */}
            {isKenya && (<>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Asset Class</Label>
                  <Select value={form.asset_class || '__none__'} onValueChange={(v) => set('asset_class', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select asset class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Select class —</SelectItem>
                      {KE_ASSET_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description / Details</Label>
                <Textarea value={form.descriptionDetails} onChange={setF('descriptionDetails')} placeholder="Detailed description…" rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Physical Location</Label><Input value={form.physical_location} onChange={setF('physical_location')} placeholder="Building / Room" /></div>
                <div className="space-y-1.5"><Label>Procuring Department</Label><Input value={form.procuring_department} onChange={setF('procuring_department')} placeholder="Finance, IT…" /></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={setF('quantity')} min="1" /></div>
                <div className="space-y-1.5"><Label>Unit Cost ({currencySymbol})</Label><Input type="number" value={form.unitCost} onChange={setF('unitCost')} step="0.01" /></div>
                <div className="space-y-1.5">
                  <Label>Sum Insured ({currencySymbol}) *</Label>
                  <Input type="number" value={form.sumInsured} onChange={setF('sumInsured')} step="0.01" required />
                  <p className="text-[10px] text-gray-400">Auto-locked to asset Total Cost on save</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label>Year of Purchase</Label><Input type="number" value={form.year_of_purchase} onChange={setF('year_of_purchase')} placeholder="2022" /></div>
                <div className="space-y-1.5">
                  <Label>Years of Service <span className="text-[10px] text-gray-400">(auto)</span></Label>
                  <div className="h-10 flex items-center px-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-semibold text-nova-teal tabular-nums">
                      {form.years_of_service ? `${form.years_of_service} yr${Number(form.years_of_service) !== 1 ? 's' : ''}` : '—'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Age Bracket</Label>
                  <Select value={form.age_bracket || '__none__'} onValueChange={(v) => set('age_bracket', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select bracket" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {['<2.5 Yrs','2.5 - 5.0 Yrs','5.0 - 7.5 Yrs','7.5 - 10 Yrs','10> Yrs'].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Insurance Priority</Label>
                  <Select value={form.insurance_priority || '__none__'} onValueChange={(v) => set('insurance_priority', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {['High','Medium','Low','Nil','Expensed','Leased'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Asset Usage Status</Label>
                  <Select value={form.asset_usage_status || '__none__'} onValueChange={(v) => set('asset_usage_status', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Usage" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {['In Use','Retired or Lost'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ownership</Label>
                  <Select value={form.ownership || '__none__'} onValueChange={(v) => set('ownership', v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Ownership" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {['NP Owned','Leased','NCBA Owned','Other'].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5"><Label>Annual Premium ({currencySymbol})</Label><Input type="number" value={form.december2025Premium} onChange={setF('december2025Premium')} step="0.01" placeholder="0.00" /></div>
                <div className="space-y-1.5"><Label>Qty Insured</Label><Input type="number" min="0" value={form.quantity_insured} onChange={setF('quantity_insured')} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Qty Retired</Label><Input type="number" min="0" value={form.quantity_retired} onChange={setF('quantity_retired')} placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Retired Value ({currencySymbol})</Label><Input type="number" min="0" step="0.01" value={form.retired_asset_value} onChange={setF('retired_asset_value')} placeholder="0.00" /></div>
              </div>

              <DocumentLinkInput
                value={form.document_link}
                onChange={(url) => set('document_link', url)}
                label="Invoice / Document Link"
                required={true}
                hint="Proof of value — required for KE audit. Upload PDF/image or paste a link."
              />

              <div className="space-y-1.5"><Label>PR Reference</Label><Input value={form.pr_ref} onChange={setF('pr_ref')} placeholder="PR-2025-001" /></div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Retire / Write-off Date</Label><Input type="date" value={form.retire_write_off_date} onChange={setF('retire_write_off_date')} /></div>
                <div className="space-y-1.5"><Label>Status Detail</Label><Input value={form.status_detail} onChange={setF('status_detail')} placeholder="Additional status info" /></div>
              </div>

              <div className="space-y-1.5"><Label>Comments</Label><Textarea value={form.comments} onChange={setF('comments')} rows={2} placeholder="Internal admin comments" /></div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_insured} onChange={(e) => set('is_insured', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-nova-green" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Is Insured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.uninsured_flag} onChange={(e) => set('uninsured_flag', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-red-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Uninsured Flag</span>
                </label>
              </div>

              <div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={setF('notes')} placeholder="Any additional notes…" /></div>
            </>)}

            {/* ══ SOUTH AFRICA FORM ══════════════════════════════════════ */}
            {!isKenya && (<>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Month/Yr Acquisition</Label><Input value={form.monthYrAcquisition} onChange={setF('monthYrAcquisition')} placeholder="Jan-2025" /></div>
                <div className="space-y-1.5">
                  <Label>Class of Insurance *</Label>
                  <Select value={form.classOfInsurance} onValueChange={(v) => set('classOfInsurance', v)}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{insuranceClasses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => set('category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Policy Reference</Label><Input value={form.policyReference} onChange={setF('policyReference')} placeholder="PIONE002/0001" /></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Asset / Insurable Risk</Label><Input value={form.assetOrInsurableRisk} onChange={setF('assetOrInsurableRisk')} placeholder="Building, Equipment…" /></div>
                <div className="space-y-1.5"><Label>Brand – Model</Label><Input value={form.brandModel} onChange={setF('brandModel')} placeholder="Dell XPS 13" /></div>
              </div>

              <div className="space-y-1.5">
                <Label>Description / Details</Label>
                <Textarea value={form.descriptionDetails} onChange={setF('descriptionDetails')} placeholder="Detailed description…" rows={2} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5"><Label>Serial Number</Label><Input value={form.serialNumber} onChange={setF('serialNumber')} placeholder="Serial #" /></div>
                <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={setF('quantity')} min="1" /></div>
                <div className="space-y-1.5"><Label>Unit Cost ({currencySymbol})</Label><Input type="number" value={form.unitCost} onChange={setF('unitCost')} step="0.01" /></div>
                <div className="space-y-1.5"><Label>Sum Insured ({currencySymbol}) *</Label><Input type="number" value={form.sumInsured} onChange={setF('sumInsured')} step="0.01" required /></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label>Monthly Premium ({currencySymbol})</Label><Input type="number" value={form.monthlyPremium} onChange={setF('monthlyPremium')} step="0.01" /></div>
                <div className="space-y-1.5">
                  <Label>
                    Escalation Rate (%)
                    <span className="text-[10px] text-gray-400 ml-1">
                      {form.classOfInsurance === 'Buildings Combined' ? '— 5% (Buildings)' : '— TBD'}
                    </span>
                  </Label>
                  <Input
                    type="number"
                    value={form.classOfInsurance === 'Buildings Combined' ? '5' : form.rate}
                    onChange={setF('rate')}
                    step="0.01"
                    readOnly={form.classOfInsurance === 'Buildings Combined'}
                    className={form.classOfInsurance === 'Buildings Combined' ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}
                    placeholder="Rate %"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Premium Year</Label>
                  <select value={form.premiumYear || currentYear} onChange={(e) => set('premiumYear', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label>Vendor</Label><Input value={form.vendor} onChange={setF('vendor')} placeholder="Vendor" /></div>
                <div className="space-y-1.5"><Label>Interest Noted</Label><Input value={form.interestNoted} onChange={setF('interestNoted')} /></div>
                <div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={setF('notes')} /></div>
              </div>

              {/* Invoice / Document — SA */}
              <DocumentLinkInput
                value={form.document_link}
                onChange={(url) => set('document_link', url)}
                label="Invoice / Document"
                hint="Attach an invoice, photo or paste a Google Drive link."
              />
            </>)}

            {!editRecord && (
              <div className="space-y-2">
                <Label>Upload Documents</Label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
                  <Upload size={24} className="text-nova-green" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload or drag & drop</p>
                  <p className="text-xs text-gray-400">PDF, DOC, Excel, JPG, PNG, ZIP</p>
                  <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.zip" onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files || [])])} />
                </label>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-nova-green/10 border border-nova-green/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <File size={15} className="text-nova-green" />
                      <span className="text-sm truncate max-w-[220px]">{f.name}</span>
                      <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)}KB</span>
                    </div>
                    <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"><X size={15} /></button>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setForm(blank); setFiles([]) }}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editRecord ? 'Save Changes' : 'Add Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
