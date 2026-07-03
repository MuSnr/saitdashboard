import { Layout } from '@/components/Layout'
import {
  Plus, Trash2, ExternalLink, FileText, Upload, File, X, Download, FileSpreadsheet,
  Loader2, Filter, Edit2, RefreshCw, Link as LinkIcon,
} from 'lucide-react'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  fetchClaims, createClaim, updateClaim, deleteClaim,
  bulkImportClaims, downloadClaimsTemplate, getApiError,
} from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useCampuses } from '@/context/CampusContext'

const STATUSES = ['Pending', 'Paid Out', 'Rejected', 'Withdrawn', 'Lodged']

const statusColour = {
  'Paid Out': 'bg-green-100 text-green-700',
  Pending:    'bg-yellow-100 text-yellow-700',
  Rejected:   'bg-red-100 text-red-700',
  Withdrawn:  'bg-gray-100 text-gray-600',
  Lodged:     'bg-blue-100 text-blue-700',
}

const blankForm = {
  subsidiary: '', claimStatus: 'Pending', dateOfIncident: '', dateOfSubmission: '',
  dateOfSettlement: '', claimValue: '', description: '', notes: '',
  incidentFormLink: '', claimFormLink: '', dischargeVoucherLink: '', folderLink: '',
}

const fmt     = (n) => Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA') : '—'

export default function Claims() {
  const { campuses } = useCampuses()
  const [claims, setClaims]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editClaim, setEditClaim] = useState(null)
  const [files, setFiles]         = useState([])
  const [form, setForm]           = useState(blankForm)
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters]     = useState({ status: 'all', subsidiary: 'all', year: 'all' })

  // bulk
  const [bulkFile,      setBulkFile]      = useState(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult,    setBulkResult]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await fetchClaims(); setClaims(Array.isArray(data) ? data : []) }
    catch (err) { toast.error(getApiError(err)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const years = useMemo(() =>
    [...new Set(claims.map((c) => c.dateOfIncident ? new Date(c.dateOfIncident).getFullYear().toString() : null).filter(Boolean))].sort().reverse(),
    [claims])

  const filtered = useMemo(() => claims.filter((c) => {
    const yr = c.dateOfIncident ? new Date(c.dateOfIncident).getFullYear().toString() : ''
    return (filters.status === 'all' || c.claimStatus === filters.status) &&
           (filters.subsidiary === 'all' || c.subsidiary === filters.subsidiary) &&
           (filters.year === 'all' || yr === filters.year)
  }), [claims, filters])

  const stats = useMemo(() => ({
    total:      filtered.length,
    paidOut:    filtered.filter((c) => c.claimStatus === 'Paid Out').length,
    pending:    filtered.filter((c) => c.claimStatus === 'Pending').length,
    lodged:     filtered.filter((c) => c.claimStatus === 'Lodged').length,
    rejected:   filtered.filter((c) => c.claimStatus === 'Rejected').length,
    withdrawn:  filtered.filter((c) => c.claimStatus === 'Withdrawn').length,
    totalValue: filtered.reduce((s, c) => s + (c.claimValue || 0), 0),
    paidOutValue: filtered.filter((c) => c.claimStatus === 'Paid Out').reduce((s, c) => s + (c.claimValue || 0), 0),
  }), [filtered])

  const openCreate = () => { setEditClaim(null); setForm(blankForm); setFiles([]); setDialogOpen(true) }
  const openEdit   = (claim) => {
    setEditClaim(claim)
    setForm({
      subsidiary: claim.subsidiary || '', claimStatus: claim.claimStatus || 'Pending',
      dateOfIncident:   claim.dateOfIncident   ? new Date(claim.dateOfIncident).toISOString().slice(0,10)   : '',
      dateOfSubmission: claim.dateOfSubmission ? new Date(claim.dateOfSubmission).toISOString().slice(0,10) : '',
      dateOfSettlement: claim.dateOfSettlement ? new Date(claim.dateOfSettlement).toISOString().slice(0,10) : '',
      claimValue: String(claim.claimValue || ''),
      description: claim.description || '', notes: claim.notes || '',
      incidentFormLink: claim.incidentFormLink || '', claimFormLink: claim.claimFormLink || '',
      dischargeVoucherLink: claim.dischargeVoucherLink || '', folderLink: claim.folderLink || '',
    })
    setFiles([]); setDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subsidiary || !form.dateOfIncident || !form.dateOfSubmission || !form.description) {
      toast.error('Campus, incident date, submission date and description are required'); return
    }
    setSubmitting(true)
    const payload = {
      subsidiary: form.subsidiary, claimStatus: form.claimStatus,
      dateOfIncident: form.dateOfIncident, dateOfSubmission: form.dateOfSubmission,
      dateOfSettlement: form.dateOfSettlement || null, claimValue: Number(form.claimValue) || 0,
      description: form.description.trim(), notes: form.notes.trim(),
      incidentFormLink: form.incidentFormLink.trim(), claimFormLink: form.claimFormLink.trim(),
      dischargeVoucherLink: form.dischargeVoucherLink.trim(), folderLink: form.folderLink.trim(),
    }
    try {
      if (editClaim) {
        const data = await updateClaim(editClaim._id, payload)
        setClaims((p) => p.map((c) => c._id === editClaim._id ? data.claim : c))
        toast.success('Claim updated')
      } else {
        const data = await createClaim(payload)
        setClaims((p) => [data.claim, ...p])
        toast.success('Claim submitted')
      }
      setDialogOpen(false)
    } catch (err) { toast.error(getApiError(err)) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this claim? This cannot be undone.')) return
    try { await deleteClaim(id); setClaims((p) => p.filter((c) => c._id !== id)); toast.success('Claim deleted') }
    catch (err) { toast.error(getApiError(err)) }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadClaimsTemplate()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'claims-template.xlsx'; a.click(); URL.revokeObjectURL(url)
    } catch (err) { toast.error(getApiError(err)) }
  }

  const handleBulkUpload = async () => {
    if (!bulkFile) { toast.error('Please select a file'); return }
    setBulkUploading(true); setBulkResult(null)
    try {
      const fd = new FormData(); fd.append('file', bulkFile)
      const result = await bulkImportClaims(fd)
      setBulkResult(result)
      if (result.inserted > 0) { toast.success(`${result.inserted} claim${result.inserted !== 1 ? 's' : ''} imported`); await load() }
      if (result.errors > 0)   toast.warning(`${result.errors} row${result.errors !== 1 ? 's' : ''} had errors`)
    } catch (err) { toast.error(getApiError(err)) }
    finally { setBulkFile(null); setBulkUploading(false) }
  }

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={40} className="animate-spin text-nova-green" />
          <p className="text-gray-500 dark:text-gray-400">Loading claims…</p>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Claims Pipeline</h1>
            <p className="text-gray-500 dark:text-gray-400">Track and manage insurance claims</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
            <Button onClick={openCreate}><Plus size={16} /> New Claim</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total',               value: stats.total,               sub: `R ${fmt(stats.totalValue)}`,   colour: 'text-nova-navy dark:text-white' },
            { label: 'Paid Out',            value: stats.paidOut,             sub: `R ${fmt(stats.paidOutValue)}`, colour: 'text-green-600' },
            { label: 'Pending',             value: stats.pending,             sub: 'In progress',                  colour: 'text-yellow-600' },
            { label: 'Lodged',              value: stats.lodged,              sub: 'Awaiting docs',                colour: 'text-blue-600' },
            { label: 'Rejected/Withdrawn',  value: stats.rejected + stats.withdrawn, sub: 'Closed',              colour: 'text-gray-500' },
          ].map(({ label, value, sub, colour }) => (
            <Card key={label}><CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${colour}`}>{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Claims List</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>

          {/* List tab */}
          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={15} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter Claims</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.subsidiary} onValueChange={(v) => setFilters((p) => ({ ...p, subsidiary: v }))}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Campus" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campuses</SelectItem>
                    {[...new Set([...campuses.map((c) => c.name), ...claims.map((c) => c.subsidiary).filter(Boolean)])].sort().map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.year} onValueChange={(v) => setFilters((p) => ({ ...p, year: v }))}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
                <span className="font-semibold text-nova-navy dark:text-white text-sm">All Claims ({filtered.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      {['Ref','Status','Campus','Incident','Submitted','Settled','Value','Description','Notes','Docs',''].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                        {claims.length === 0 ? 'No claims yet — submit your first claim' : 'No claims match your filters'}
                      </td></tr>
                    ) : filtered.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-3 py-3 font-mono text-xs font-bold text-nova-navy dark:text-white whitespace-nowrap">{c.claimId}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColour[c.claimStatus] || 'bg-gray-100 text-gray-600'}`}>{c.claimStatus}</span>
                        </td>
                        <td className="px-3 py-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{c.subsidiary}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(c.dateOfIncident)}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(c.dateOfSubmission)}</td>
                        <td className="px-3 py-3 text-xs whitespace-nowrap">
                          {c.dateOfSettlement ? <span className="text-green-600 font-medium">{fmtDate(c.dateOfSettlement)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-xs font-semibold text-nova-navy dark:text-white whitespace-nowrap">{c.claimValue > 0 ? `R ${fmt(c.claimValue)}` : '—'}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400 max-w-[160px] truncate text-xs" title={c.description}>{c.description}</td>
                        <td className="px-3 py-3 text-gray-400 max-w-[120px] truncate text-xs" title={c.notes}>{c.notes || '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {c.incidentFormLink && <a href={c.incidentFormLink} target="_blank" rel="noopener noreferrer" title="Incident Form" className="p-1 rounded text-nova-teal hover:bg-nova-teal/10"><FileText size={13} /></a>}
                            {c.claimFormLink && <a href={c.claimFormLink} target="_blank" rel="noopener noreferrer" title="Claim Form" className="p-1 rounded text-nova-teal hover:bg-nova-teal/10"><LinkIcon size={13} /></a>}
                            {c.dischargeVoucherLink && <a href={c.dischargeVoucherLink} target="_blank" rel="noopener noreferrer" title="Discharge Voucher" className="p-1 rounded text-green-600 hover:bg-green-50"><FileText size={13} /></a>}
                            {c.folderLink && <a href={c.folderLink} target="_blank" rel="noopener noreferrer" title="Folder" className="p-1 rounded text-nova-teal hover:bg-nova-teal/10"><ExternalLink size={13} /></a>}
                            {!c.incidentFormLink && !c.claimFormLink && !c.dischargeVoucherLink && !c.folderLink && <span className="text-gray-300 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete(c._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Bulk Import tab */}
          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Bulk Import Claims</CardTitle>
                    <CardDescription>Upload an Excel or CSV file to import multiple claims at once.</CardDescription>
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
                    <button type="button" onClick={(e) => { e.preventDefault(); setBulkFile(null); setBulkResult(null) }} className="text-red-500 hover:text-red-700">
                      <X size={18} />
                    </button>
                  )}
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => { setBulkFile(e.target.files?.[0] || null); setBulkResult(null) }} />
                </label>

                {/* Column hint */}
                <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Required columns</p>
                  <div className="grid grid-cols-2 gap-x-4">
                    {[['Campus *','required'],['Date of Incident *','YYYY-MM-DD'],['Date of Claim Submission *','YYYY-MM-DD'],['Brief Description *','required'],['Claim Status','default: Pending'],['Claim Value (R)','optional'],['Date of Settlement','optional'],['Notes','optional']].map(([col, hint]) => (
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

                {/* Results */}
                {bulkResult && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">{bulkResult.inserted} imported</span>
                      </div>
                      {bulkResult.errors > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-sm font-semibold text-red-700 dark:text-red-400">{bulkResult.errors} errors</span>
                        </div>
                      )}
                    </div>
                    {bulkResult.details?.inserted?.length > 0 && (
                      <div className="rounded-lg border border-green-200 dark:border-green-800 overflow-hidden">
                        <p className="px-3 py-2 text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">Imported claims</p>
                        <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                          {bulkResult.details.inserted.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                              <span className="font-mono text-gray-400">{r.claimId}</span>
                              <span className="text-gray-700 dark:text-gray-300 truncate">{r.description}</span>
                              <span className="text-gray-400 ml-auto">row {r.row}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {bulkResult.details?.errors?.length > 0 && (
                      <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
                        <p className="px-3 py-2 text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">Rows with errors</p>
                        <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                          {bulkResult.details.errors.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                              <span className="text-gray-400 flex-shrink-0">row {r.row}</span>
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
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editClaim ? `Edit Claim — ${editClaim.claimId}` : 'Submit New Claim'}</DialogTitle>
            <DialogDescription>All fields match the Excel Claims sheet columns exactly.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campus *</Label>
                <Select value={form.subsidiary} onValueChange={(v) => setForm((p) => ({ ...p, subsidiary: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>
                    {[...new Set([...campuses.map((c) => c.name), ...claims.map((c) => c.subsidiary).filter(Boolean)])].sort().map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Claim Status</Label>
                <Select value={form.claimStatus} onValueChange={(v) => setForm((p) => ({ ...p, claimStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Date of Incident *</Label><Input type="date" value={form.dateOfIncident} onChange={(e) => setForm((p) => ({ ...p, dateOfIncident: e.target.value }))} required /></div>
              <div className="space-y-1.5"><Label>Date of Submission *</Label><Input type="date" value={form.dateOfSubmission} onChange={(e) => setForm((p) => ({ ...p, dateOfSubmission: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Date of Settlement <span className="text-gray-400 text-[10px]">(optional)</span></Label><Input type="date" value={form.dateOfSettlement} onChange={(e) => setForm((p) => ({ ...p, dateOfSettlement: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Claim Value (R)</Label><Input type="number" step="0.01" min="0" value={form.claimValue} onChange={(e) => setForm((p) => ({ ...p, claimValue: e.target.value }))} placeholder="0.00" /></div>
            </div>
            <div className="space-y-1.5"><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} required /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            <Separator />
            <p className="text-sm font-semibold text-nova-navy dark:text-white flex items-center gap-2"><LinkIcon size={14} /> Document Links</p>
            <div className="space-y-3">
              {[['incidentFormLink','Incident Form Link'],['claimFormLink','Claim Form Link'],['dischargeVoucherLink','Discharge Voucher Link'],['folderLink','Folder Link']].map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input type="url" value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder="https://drive.google.com/…" />
                </div>
              ))}
            </div>
            {!editClaim && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Upload Claim Documents</Label>
                  <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-5 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
                    <Upload size={22} className="text-nova-green" />
                    <p className="text-sm text-gray-500">Click to upload files</p>
                    <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xlsx,.jpg,.png,.zip" onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files || [])])} />
                  </label>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-nova-green/10 border border-nova-green/30 rounded-lg">
                      <div className="flex items-center gap-2"><File size={14} className="text-nova-green" /><span className="text-xs truncate max-w-[200px]">{f.name}</span></div>
                      <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-red-500 p-0.5 rounded hover:bg-red-50"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editClaim ? 'Save Changes' : 'Submit Claim'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
