import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/Layout'
import { Plus, Upload, X, Trash2, FileSpreadsheet, Loader2, Edit2, RefreshCw, AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { fetchAssets, createAsset, updateAsset, deleteAsset, bulkImportAssets, downloadAssetTemplate, getApiError } from '@/services/api'
import { useCampuses } from '@/context/CampusContext'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// ── Static insurance class list ───────────────────────────────────────────────
const INSURANCE_CLASSES = [
  'Fire',
  'Buildings Combined',
  'Business All Risk',
  'Electronic Equipment',
  'Theft Section',
  'Business Interruption',
  'Public Liability',
  'Umbrella Liability',
  'Employers Liability',
  'Sasria',
  'Broker Fees',
  'TWK Assist / Bystand',
]

const INSURANCE_STATUSES = ['Insured', 'Request Removal', 'Request Addition', 'Stolen', 'Not Insured']
const PRICING_YEARS = ['2025', '2026', '2027']

// ── Blank form ────────────────────────────────────────────────────────────────
const blank = {
  campusId: '',        // internal: campus _id for cascading select
  subsidiary: '',      // campus name — what gets saved
  subCampusId: '',     // internal: sub-campus _id
  subLocation: '',     // sub-campus name — what gets saved
  insuranceClass: '',
  description: '',
  serialNumber: '',
  quantity: '1',
  unitPrice: '',
  isDuplicate: false,
  duplicateNote: '',
  insuranceStatus: '__none__',
  year: '2025',
  notes: '',
}

// ── Badge colours ─────────────────────────────────────────────────────────────
const classBadge = {
  'Fire': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Buildings Combined': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'Business All Risk': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Electronic Equipment': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

const statusBadge = {
  Insured: 'bg-green-100 text-green-700',
  'Request Removal': 'bg-red-100 text-red-700',
  'Request Addition': 'bg-blue-100 text-blue-700',
  Stolen: 'bg-red-200 text-red-800',
  'Not Insured': 'bg-gray-100 text-gray-600',
}

const fmt = (n) => Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DataEntry() {
  const { isAdmin } = useAuth()
  const { campuses, getSubCampusesFor, loading: campusLoading } = useCampuses()

  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editAsset, setEditAsset] = useState(null)
  const [form, setForm] = useState(blank)
  const [submitting, setSubmitting] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState(null) // null | { inserted, skipped, errors, details }

  // Sub-campuses available for the currently selected campus
  const availableSubCampuses = form.campusId ? getSubCampusesFor(form.campusId) : []

  // Computed sum insured preview
  const previewSum = (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0)

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  // When campus changes, reset sub-campus and store campus name too
  const handleCampusChange = (campusId) => {
    const campus = campuses.find((c) => c._id === campusId)
    setForm((p) => ({
      ...p,
      campusId,
      subsidiary: campus?.name || '',
      subCampusId: '',
      subLocation: '',
    }))
  }

  // When sub-campus changes, store sub-campus name too
  const handleSubCampusChange = (subId) => {
    if (subId === '__none__') {
      setForm((p) => ({ ...p, subCampusId: '', subLocation: '' }))
      return
    }
    const sub = availableSubCampuses.find((s) => s._id === subId)
    setForm((p) => ({ ...p, subCampusId: subId, subLocation: sub?.name || '' }))
  }

  // ── Load assets ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAssets()
      setAssets(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Open create ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditAsset(null)
    setForm(blank)
    setDialogOpen(true)
  }

  // ── Open edit ────────────────────────────────────────────────────────────────
  const openEdit = (a) => {
    setEditAsset(a)
    // Find the matching campus and sub-campus by name to restore IDs
    const campus = campuses.find((c) => c.name === a.subsidiary)
    const subs = campus ? getSubCampusesFor(campus._id) : []
    const sub = subs.find((s) => s.name === a.subLocation)
    setForm({
      campusId: campus?._id || '',
      subsidiary: a.subsidiary || '',
      subCampusId: sub?._id || '',
      subLocation: a.subLocation || '',
      insuranceClass: a.insuranceClass || '',
      description: a.description || '',
      serialNumber: a.serialNumber || '',
      quantity: String(a.quantity || 1),
      unitPrice: String(a.unitPrice || ''),
      isDuplicate: a.isDuplicate || false,
      duplicateNote: a.duplicateNote || '',
      insuranceStatus: a.insuranceStatus || '__none__',
      year: String(a.year || 2025),
      notes: a.notes || '',
    })
    setDialogOpen(true)
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.subsidiary) { toast.error('Campus is required'); return }
    if (!form.insuranceClass) { toast.error('Insurance Class is required'); return }
    if (!form.description.trim()) { toast.error('Item Description is required'); return }
    if (!form.unitPrice || Number(form.unitPrice) < 0) { toast.error('Unit Price is required'); return }

    setSubmitting(true)
    const payload = {
      subsidiary: form.subsidiary,
      subLocation: form.subLocation,
      insuranceClass: form.insuranceClass,
      description: form.description.trim(),
      serialNumber: form.serialNumber.trim(),
      gradeLocation: '',           // no longer used in this form
      quantity: Number(form.quantity) || 1,
      unitPrice: Number(form.unitPrice),
      isDuplicate: form.isDuplicate,
      duplicateNote: form.duplicateNote.trim(),
      insuranceStatus: form.insuranceStatus === '__none__' ? '' : form.insuranceStatus,
      year: Number(form.year) || 2025,
      notes: form.notes.trim(),
    }

    try {
      if (editAsset) {
        const data = await updateAsset(editAsset._id, payload)
        setAssets((p) => p.map((a) => (a._id === editAsset._id ? data.asset : a)))
        toast.success('Asset updated')
      } else {
        const data = await createAsset(payload)
        setAssets((p) => [data.asset, ...p])
        toast.success('Asset added successfully')
      }
      setDialogOpen(false)
      setForm(blank)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (asset) => {
    if (!window.confirm(`Delete "${asset.description}"? This cannot be undone.`)) return
    try {
      await deleteAsset(asset._id)
      setAssets((p) => p.filter((x) => x._id !== asset._id))
      toast.success('Asset removed')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadAssetTemplate()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'asset-register-template.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const handleBulkUpload = async () => {
    if (!uploadFile) { toast.error('Please select a file'); return }
    setUploading(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      const result = await bulkImportAssets(fd)
      setImportResult(result)
      if (result.inserted > 0) {
        toast.success(`${result.inserted} asset${result.inserted !== 1 ? 's' : ''} imported`)
        await load()
      }
      if (result.errors > 0) toast.warning(`${result.errors} row${result.errors !== 1 ? 's' : ''} had errors — see details below`)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setUploadFile(null)
      setUploading(false)
    }
  }

  // ── Totals ───────────────────────────────────────────────────────────────────
  const validAssets = assets.filter((a) => !a.isDuplicate)
  const totalSumInsured = validAssets.reduce((s, a) => s + (a.sumInsured || 0), 0)
  const totalQty = validAssets.reduce((s, a) => s + (a.quantity || 0), 0)
  const duplicateCount = assets.filter((a) => a.isDuplicate).length

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Asset Register — Data Entry</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Add assets as per the register — Campus, Insurance Class, Description, Serial Number, Qty, Unit Price
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} />
            </Button>
            <Button onClick={openCreate} disabled={campuses.length === 0 && !campusLoading}>
              <Plus size={16} /> Add Asset
            </Button>
          </div>
        </div>

        {/* No campuses warning */}
        {!campusLoading && campuses.length === 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              No campuses configured yet.{' '}
              {isAdmin
                ? <Link to="/locations" className="font-semibold underline">Add campuses in the Locations page</Link>
                : 'Ask an admin to add campuses before entering assets.'}
            </p>
          </div>
        )}

        {/* ── Summary stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Line Items</p>
            <p className="text-3xl font-bold text-nova-navy dark:text-white">{assets.length}</p>
            {duplicateCount > 0 && <p className="text-xs text-amber-500 mt-1">{duplicateCount} marked as duplicate</p>}
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Quantity</p>
            <p className="text-3xl font-bold text-nova-navy dark:text-white">{totalQty.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sum Insured</p>
            <p className="text-2xl font-bold text-nova-teal">R {fmt(totalSumInsured)}</p>
          </CardContent></Card>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>

          {/* Manual */}
          <TabsContent value="manual">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={32} className="animate-spin text-nova-green" />
              </div>
            ) : assets.length === 0 ? (
              <Card className="border-dashed border-2 cursor-pointer hover:border-nova-green transition-colors" onClick={openCreate}>
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 bg-nova-green/10 rounded-2xl flex items-center justify-center">
                    <Plus size={32} className="text-nova-green" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-nova-navy dark:text-white mb-1">Click to add your first asset</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Mirrors the Excel register columns exactly</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <CardHeader className="flex-row items-center justify-between py-4">
                  <CardTitle className="text-base">Asset Register ({assets.length} line items)</CardTitle>
                  <Button size="sm" onClick={openCreate}><Plus size={14} /> Add More</Button>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        {['Asset ID', 'Campus', 'Sub-Campus', 'Insurance Class', 'Description', 'Serial #', 'Qty', 'Unit Price', 'Sum Insured', 'Status', 'Yr', ''].map((h) => (
                          <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {assets.map((a) => (
                        <tr
                          key={a._id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${a.isDuplicate ? 'opacity-50 bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                        >
                          <td className="px-3 py-2.5 font-mono text-[10px] text-gray-400">{a.assetId}</td>
                          <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{a.subsidiary}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500">{a.subLocation || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${classBadge[a.insuranceClass] || 'bg-gray-100 text-gray-600'}`}>
                              {a.insuranceClass}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 max-w-[180px] truncate text-xs" title={a.description}>
                            {a.description}
                            {a.isDuplicate && <span className="ml-1 text-[10px] text-amber-600 font-bold">[DUP]</span>}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[10px] text-gray-500 max-w-[110px] truncate">
                            {a.serialNumber || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 tabular-nums text-xs">{a.quantity}</td>
                          <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 tabular-nums text-xs">R {fmt(a.unitPrice)}</td>
                          <td className="px-3 py-2.5 font-semibold text-nova-teal tabular-nums text-xs">R {fmt(a.sumInsured)}</td>
                          <td className="px-3 py-2.5">
                            {a.insuranceStatus
                              ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge[a.insuranceStatus] || 'bg-gray-100 text-gray-600'}`}>{a.insuranceStatus}</span>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-400">{a.year}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors"><Edit2 size={13} /></button>
                              <button onClick={() => handleDelete(a)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Bulk */}
          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Bulk Import from Excel</CardTitle>
                    <CardDescription>Upload the asset register Excel file. Columns must match the register format.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="flex-shrink-0 gap-1.5">
                    <Download size={14} /> Download Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Drop zone */}
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
                  <FileSpreadsheet size={36} className="text-nova-green" />
                  <div className="text-center">
                    <p className="font-medium text-nova-navy dark:text-white">
                      {uploadFile ? uploadFile.name : 'Click to select file or drag & drop'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Excel (.xlsx, .xls) and CSV supported · max 10 MB</p>
                  </div>
                  {uploadFile && (
                    <button type="button" onClick={(e) => { e.preventDefault(); setUploadFile(null); setImportResult(null) }}
                      className="text-red-500 hover:text-red-700 transition-colors">
                      <X size={18} />
                    </button>
                  )}
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv"
                    onChange={(e) => { setUploadFile(e.target.files?.[0] || null); setImportResult(null) }} />
                </label>

                {/* Column guide */}
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected columns (header names are flexible)</p>
                  <div className="grid grid-cols-2 gap-x-4">
                    {[
                      ['School / Campus *',     'required'],
                      ['Insurance Class *',     'required'],
                      ['Item Description *',    'required'],
                      ['Unit Price (ZAR) *',    'required'],
                      ['Serial Number',         'optional'],
                      ['Quantity',              'optional, default 1'],
                      ['Sub-Location',          'optional'],
                      ['Insurance Status',      'optional'],
                      ['Notes',                 'optional'],
                    ].map(([col, hint]) => (
                      <p key={col} className="flex items-center gap-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-nova-green flex-shrink-0" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{col}</span>
                        <span className="text-gray-400">— {hint}</span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* Upload button */}
                <Button onClick={handleBulkUpload} disabled={!uploadFile || uploading} className="w-full">
                  {uploading
                    ? <><Loader2 size={14} className="animate-spin" /> Importing…</>
                    : <><Upload size={16} /> Upload & Import</>}
                </Button>

                {/* Results */}
                {importResult && (
                  <div className="space-y-3">
                    {/* Summary pills */}
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">{importResult.inserted} imported</span>
                      </div>
                      {importResult.skipped > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{importResult.skipped} skipped</span>
                        </div>
                      )}
                      {importResult.errors > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-sm font-semibold text-red-700 dark:text-red-400">{importResult.errors} errors</span>
                        </div>
                      )}
                    </div>

                    {/* Inserted list */}
                    {importResult.details?.inserted?.length > 0 && (
                      <div className="rounded-lg border border-green-200 dark:border-green-800 overflow-hidden">
                        <p className="px-3 py-2 text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                          Imported assets
                        </p>
                        <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                          {importResult.details.inserted.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                              <span className="font-mono text-gray-400">{r.assetId}</span>
                              <span className="text-gray-700 dark:text-gray-300 truncate">{r.description}</span>
                              <span className="text-gray-400 ml-auto">row {r.row}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Error list */}
                    {importResult.details?.errors?.length > 0 && (
                      <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
                        <p className="px-3 py-2 text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                          Rows with errors (fix and re-upload)
                        </p>
                        <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                          {importResult.details.errors.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                              <span className="text-gray-400 flex-shrink-0">row {r.row}</span>
                              <span className="text-red-600 dark:text-red-400">{r.reason}</span>
                              {r.description && <span className="text-gray-400 truncate ml-auto">{r.description}</span>}
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
        </Tabs>
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAsset ? 'Edit Asset' : 'Add Asset to Register'}</DialogTitle>
            <DialogDescription>
              {editAsset
                ? 'Update the asset details. Campus and sub-campus are loaded from the database.'
                : 'Fill in the asset details. Campus and sub-campus are loaded from the database.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">

            {/* ── Campus + Sub-campus (cascading, dynamic) ──────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campus *</Label>
                {campusLoading ? (
                  <div className="h-10 flex items-center px-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <Loader2 size={14} className="animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400 ml-2">Loading campuses…</span>
                  </div>
                ) : campuses.length === 0 ? (
                  <div className="h-10 flex items-center px-3 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                    <span className="text-xs text-amber-600">
                      No campuses yet —{' '}
                      {isAdmin && (
                        <Link to="/locations" onClick={() => setDialogOpen(false)} className="underline font-semibold">
                          add them here
                        </Link>
                      )}
                    </span>
                  </div>
                ) : (
                  <Select
                    value={form.campusId}
                    onValueChange={handleCampusChange}
                  >
                    <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                    <SelectContent>
                      {campuses.map((c) => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>
                  Sub-Campus
                  {form.campusId && availableSubCampuses.length === 0 && (
                    <span className="text-[10px] text-gray-400 ml-1">
                      — none added yet
                      {isAdmin && (
                        <Link to="/locations" onClick={() => setDialogOpen(false)} className="text-nova-teal underline ml-1">add sub-campus</Link>
                      )}
                    </span>
                  )}
                </Label>
                <Select
                  value={form.subCampusId || '__none__'}
                  onValueChange={handleSubCampusChange}
                  disabled={!form.campusId || availableSubCampuses.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.campusId ? 'Select sub-campus' : 'Select campus first'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {availableSubCampuses.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Insurance Class ───────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Insurance Class *</Label>
              <Select value={form.insuranceClass} onValueChange={(v) => set('insuranceClass', v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ── Item Description ──────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Item Description *</Label>
              <Input
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="e.g. Acer Chromebook C733, Chair - 375mmh, Building at 60 Williams Road…"
                required
              />
            </div>

            {/* ── Serial Number ─────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Serial Number</Label>
              <Input
                value={form.serialNumber}
                onChange={(e) => set('serialNumber', e.target.value)}
                placeholder="e.g. NXH8VEA00195218CC07600"
                className="font-mono"
              />
              <p className="text-[10px] text-gray-400">
                Leave blank for furniture and building items where a serial number does not apply.
              </p>
            </div>

            {/* ── Quantity + Unit Price + Sum Insured preview ───────────── */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  min="0"
                  step="1"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price (ZAR) *</Label>
                <Input
                  type="number"
                  value={form.unitPrice}
                  onChange={(e) => set('unitPrice', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sum Insured</Label>
                <div className="h-10 flex items-center px-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-semibold text-nova-teal tabular-nums">R {fmt(previewSum)}</span>
                </div>
              </div>
            </div>

            {/* ── Insurance Status + Pricing Year ──────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Insurance Status</Label>
                <Select
                  value={form.insuranceStatus}
                  onValueChange={(v) => set('insuranceStatus', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Set status…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Not set —</SelectItem>
                    {INSURANCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pricing Year</Label>
                <Select value={form.year} onValueChange={(v) => set('year', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICING_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Duplicate flag ────────────────────────────────────────── */}
            <div className={`p-4 rounded-xl border transition-colors ${form.isDuplicate ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDuplicate}
                  onChange={(e) => set('isDuplicate', e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <div className="flex items-center gap-2">
                  {form.isDuplicate && <AlertTriangle size={15} className="text-amber-500" />}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mark as DUPLICATE
                  </span>
                  <span className="text-xs text-gray-400">(excluded from totals & sum insured)</span>
                </div>
              </label>
              {form.isDuplicate && (
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs">Duplicate Note</Label>
                  <Input
                    value={form.duplicateNote}
                    onChange={(e) => set('duplicateNote', e.target.value)}
                    placeholder="e.g. Serial already listed under Ruimsig JS"
                    className="text-sm"
                  />
                </div>
              )}
            </div>

            {/* ── Notes ─────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Any additional context…"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !form.campusId}>
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : editAsset ? 'Save Changes' : 'Add to Register'
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
