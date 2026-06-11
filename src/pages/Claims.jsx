import { Layout } from '@/components/Layout'
import {
  Plus, Trash2, ExternalLink, FileText, Upload, File, X,
  Loader2, Filter, Edit2, RefreshCw, Link as LinkIcon,
} from 'lucide-react'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { fetchClaims, createClaim, updateClaim, deleteClaim, getApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useCampuses } from '@/context/CampusContext'

// ── Matches exact Excel status values ─────────────────────────────────────────
const STATUSES = ['Pending', 'Paid Out', 'Rejected', 'Withdrawn', 'Lodged']

const statusVariant = {
  'Paid Out': 'default',
  Pending: 'warning',
  Rejected: 'destructive',
  Withdrawn: 'secondary',
  Lodged: 'info',
}

const statusColour = {
  'Paid Out': 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Rejected: 'bg-red-100 text-red-700',
  Withdrawn: 'bg-gray-100 text-gray-600',
  Lodged: 'bg-blue-100 text-blue-700',
}

// ── Blank form — mirrors every Excel column ───────────────────────────────────
const blankForm = {
  subsidiary: '',
  claimStatus: 'Pending',
  dateOfIncident: '',
  dateOfSubmission: '',
  dateOfSettlement: '',
  claimValue: '',
  description: '',
  notes: '',
  incidentFormLink: '',
  claimFormLink: '',
  dischargeVoucherLink: '',
  folderLink: '',
}

const fmt = (n) => Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-ZA') : '—')

export default function Claims() {
  const { campuses } = useCampuses()

  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editClaim, setEditClaim] = useState(null)
  const [files, setFiles] = useState([])
  const [form, setForm] = useState(blankForm)
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters] = useState({ status: 'all', subsidiary: 'all', year: 'all' })

  // Load claims
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchClaims()
      setClaims(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Years derived from claim data
  const years = useMemo(
    () => [...new Set(claims.map((c) => c.dateOfIncident ? new Date(c.dateOfIncident).getFullYear().toString() : null).filter(Boolean))].sort().reverse(),
    [claims]
  )

  // Filtered list
  const filtered = useMemo(
    () => claims.filter((c) => {
      const yr = c.dateOfIncident ? new Date(c.dateOfIncident).getFullYear().toString() : ''
      return (
        (filters.status === 'all' || c.claimStatus === filters.status) &&
        (filters.subsidiary === 'all' || c.subsidiary === filters.subsidiary) &&
        (filters.year === 'all' || yr === filters.year)
      )
    }),
    [claims, filters]
  )

  // Stats
  const stats = useMemo(() => ({
    total: filtered.length,
    paidOut: filtered.filter((c) => c.claimStatus === 'Paid Out').length,
    rejected: filtered.filter((c) => c.claimStatus === 'Rejected').length,
    pending: filtered.filter((c) => c.claimStatus === 'Pending').length,
    lodged: filtered.filter((c) => c.claimStatus === 'Lodged').length,
    withdrawn: filtered.filter((c) => c.claimStatus === 'Withdrawn').length,
    totalValue: filtered.reduce((s, c) => s + (c.claimValue || 0), 0),
    paidOutValue: filtered.filter((c) => c.claimStatus === 'Paid Out').reduce((s, c) => s + (c.claimValue || 0), 0),
  }), [filtered])

  // ── Open create ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditClaim(null)
    setForm(blankForm)
    setFiles([])
    setDialogOpen(true)
  }

  // ── Open edit ─────────────────────────────────────────────────────────────
  const openEdit = (claim) => {
    setEditClaim(claim)
    setForm({
      subsidiary: claim.subsidiary || '',
      claimStatus: claim.claimStatus || 'Pending',
      dateOfIncident: claim.dateOfIncident ? new Date(claim.dateOfIncident).toISOString().slice(0, 10) : '',
      dateOfSubmission: claim.dateOfSubmission ? new Date(claim.dateOfSubmission).toISOString().slice(0, 10) : '',
      dateOfSettlement: claim.dateOfSettlement ? new Date(claim.dateOfSettlement).toISOString().slice(0, 10) : '',
      claimValue: String(claim.claimValue || ''),
      description: claim.description || '',
      notes: claim.notes || '',
      incidentFormLink: claim.incidentFormLink || '',
      claimFormLink: claim.claimFormLink || '',
      dischargeVoucherLink: claim.dischargeVoucherLink || '',
      folderLink: claim.folderLink || '',
    })
    setFiles([])
    setDialogOpen(true)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subsidiary || !form.dateOfIncident || !form.dateOfSubmission || !form.description) {
      toast.error('Campus, incident date, submission date and description are required')
      return
    }
    setSubmitting(true)
    const payload = {
      subsidiary: form.subsidiary,
      claimStatus: form.claimStatus,
      dateOfIncident: form.dateOfIncident,
      dateOfSubmission: form.dateOfSubmission,
      dateOfSettlement: form.dateOfSettlement || null,
      claimValue: Number(form.claimValue) || 0,
      description: form.description.trim(),
      notes: form.notes.trim(),
      incidentFormLink: form.incidentFormLink.trim(),
      claimFormLink: form.claimFormLink.trim(),
      dischargeVoucherLink: form.dischargeVoucherLink.trim(),
      folderLink: form.folderLink.trim(),
    }
    try {
      if (editClaim) {
        const data = await updateClaim(editClaim._id, payload)
        setClaims((p) => p.map((c) => (c._id === editClaim._id ? data.claim : c)))
        toast.success('Claim updated')
      } else {
        const data = await createClaim(payload)
        setClaims((p) => [data.claim, ...p])
        toast.success('Claim submitted')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this claim? This cannot be undone.')) return
    try {
      await deleteClaim(id)
      setClaims((p) => p.filter((c) => c._id !== id))
      toast.success('Claim deleted')
    } catch (err) {
      toast.error(getApiError(err))
    }
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

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Claims Pipeline</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Track and manage insurance claims — matches the Excel claims register exactly
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
            <Button onClick={openCreate}><Plus size={16} /> New Claim</Button>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, sub: `R ${fmt(stats.totalValue)}`, colour: 'text-nova-navy dark:text-white' },
            { label: 'Paid Out', value: stats.paidOut, sub: `R ${fmt(stats.paidOutValue)}`, colour: 'text-green-600' },
            { label: 'Pending', value: stats.pending, sub: 'In progress', colour: 'text-yellow-600' },
            { label: 'Lodged', value: stats.lodged, sub: 'Awaiting docs', colour: 'text-blue-600' },
            { label: 'Rejected / Withdrawn', value: stats.rejected + stats.withdrawn, sub: 'Closed', colour: 'text-gray-500' },
          ].map(({ label, value, sub, colour }) => (
            <Card key={label}><CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${colour}`}>{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
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
                {/* Dynamic from context + any that appear in existing claims */}
                {[...new Set([
                  ...campuses.map((c) => c.name),
                  ...claims.map((c) => c.subsidiary).filter(Boolean),
                ])].sort().map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
            <span className="font-semibold text-nova-navy dark:text-white text-sm">
              All Claims ({filtered.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  {[
                    'Ref',             // claimId
                    'Status',          // claimStatus
                    'Campus',          // subsidiary
                    'Incident',        // dateOfIncident
                    'Submitted',       // dateOfSubmission
                    'Settled',         // dateOfSettlement
                    'Value',           // claimValue
                    'Description',     // description
                    'Notes',           // notes
                    'Documents',       // link columns
                    '',                // actions
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                      {claims.length === 0 ? 'No claims yet — submit your first claim' : 'No claims match your filters'}
                    </td>
                  </tr>
                ) : filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Ref */}
                    <td className="px-3 py-3 font-mono text-xs font-bold text-nova-navy dark:text-white whitespace-nowrap">
                      {c.claimId}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColour[c.claimStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {c.claimStatus}
                      </span>
                    </td>

                    {/* Campus */}
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{c.subsidiary}</td>

                    {/* Date of Incident */}
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(c.dateOfIncident)}</td>

                    {/* Date of Submission */}
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(c.dateOfSubmission)}</td>

                    {/* Date of Settlement */}
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {c.dateOfSettlement
                        ? <span className="text-green-600 font-medium">{fmtDate(c.dateOfSettlement)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Claim Value */}
                    <td className="px-3 py-3 tabular-nums text-xs font-semibold text-nova-navy dark:text-white whitespace-nowrap">
                      {c.claimValue > 0 ? `R ${fmt(c.claimValue)}` : '—'}
                    </td>

                    {/* Description */}
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 max-w-[160px] truncate text-xs" title={c.description}>
                      {c.description}
                    </td>

                    {/* Notes */}
                    <td className="px-3 py-3 text-gray-400 max-w-[120px] truncate text-xs" title={c.notes}>
                      {c.notes || '—'}
                    </td>

                    {/* Document links — matches the 4 link columns in the Excel sheet */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {c.incidentFormLink && (
                          <a href={c.incidentFormLink} target="_blank" rel="noopener noreferrer"
                            title="Incident Form"
                            className="p-1 rounded text-nova-teal hover:bg-nova-teal/10 transition-colors">
                            <FileText size={13} />
                          </a>
                        )}
                        {c.claimFormLink && (
                          <a href={c.claimFormLink} target="_blank" rel="noopener noreferrer"
                            title="Claim Form"
                            className="p-1 rounded text-nova-teal hover:bg-nova-teal/10 transition-colors">
                            <LinkIcon size={13} />
                          </a>
                        )}
                        {c.dischargeVoucherLink && (
                          <a href={c.dischargeVoucherLink} target="_blank" rel="noopener noreferrer"
                            title="Discharge Voucher"
                            className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors">
                            <FileText size={13} />
                          </a>
                        )}
                        {c.folderLink && (
                          <a href={c.folderLink} target="_blank" rel="noopener noreferrer"
                            title="Folder (Docs & Pics)"
                            className="p-1 rounded text-nova-teal hover:bg-nova-teal/10 transition-colors">
                            <ExternalLink size={13} />
                          </a>
                        )}
                        {!c.incidentFormLink && !c.claimFormLink && !c.dischargeVoucherLink && !c.folderLink && (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(c._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Create / Edit Dialog — every Excel column ─────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editClaim ? `Edit Claim — ${editClaim.claimId}` : 'Submit New Claim'}</DialogTitle>
            <DialogDescription>
              All fields match the Excel Claims sheet columns exactly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">

            {/* ── Row 1: Campus + Status ────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campus / Subsidiary *</Label>
                <Select value={form.subsidiary} onValueChange={(v) => setForm((p) => ({ ...p, subsidiary: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>
                    {/* Dynamic campuses + any from existing data */}
                    {[...new Set([
                      ...campuses.map((c) => c.name),
                      ...claims.map((c) => c.subsidiary).filter(Boolean),
                    ])].sort().map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Claim Status</Label>
                <Select value={form.claimStatus} onValueChange={(v) => setForm((p) => ({ ...p, claimStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Row 2: Date of Incident + Date of Submission ──────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date of Incident *</Label>
                <Input type="date" value={form.dateOfIncident} onChange={(e) => setForm((p) => ({ ...p, dateOfIncident: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Claim Submission *</Label>
                <Input type="date" value={form.dateOfSubmission} onChange={(e) => setForm((p) => ({ ...p, dateOfSubmission: e.target.value }))} required />
              </div>
            </div>

            {/* ── Row 3: Date of Settlement + Claim Value ───────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Date of Settlement
                  <span className="text-gray-400 text-[10px] ml-1">(leave blank if not yet settled)</span>
                </Label>
                <Input type="date" value={form.dateOfSettlement} onChange={(e) => setForm((p) => ({ ...p, dateOfSettlement: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Claim Value (R)
                  <span className="text-gray-400 text-[10px] ml-1">(0 if unknown / pending)</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.claimValue}
                  onChange={(e) => setForm((p) => ({ ...p, claimValue: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* ── Row 4: Description ───────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Brief Description / Claim Details *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Stolen chromebooks, Fence damage due to thunderstorm…"
                rows={3}
                required
              />
            </div>

            {/* ── Row 5: Notes ─────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Claim registered, awaiting supporting documents"
              />
            </div>

            <Separator />

            {/* ── Document Links — 4 columns from the Excel sheet ─────── */}
            <div>
              <p className="text-sm font-semibold text-nova-navy dark:text-white mb-3 flex items-center gap-2">
                <LinkIcon size={14} /> Document Links
                <span className="text-xs font-normal text-gray-400">(Google Drive / any URL — matches the 4 link columns in the sheet)</span>
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Incident Form Link</Label>
                  <Input
                    type="url"
                    value={form.incidentFormLink}
                    onChange={(e) => setForm((p) => ({ ...p, incidentFormLink: e.target.value }))}
                    placeholder="https://drive.google.com/file/…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Claim Form Link</Label>
                  <Input
                    type="url"
                    value={form.claimFormLink}
                    onChange={(e) => setForm((p) => ({ ...p, claimFormLink: e.target.value }))}
                    placeholder="https://drive.google.com/file/…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Discharge Voucher Link</Label>
                  <Input
                    type="url"
                    value={form.dischargeVoucherLink}
                    onChange={(e) => setForm((p) => ({ ...p, dischargeVoucherLink: e.target.value }))}
                    placeholder="https://drive.google.com/file/…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Folder Containing Docs & Pics</Label>
                  <Input
                    type="url"
                    value={form.folderLink}
                    onChange={(e) => setForm((p) => ({ ...p, folderLink: e.target.value }))}
                    placeholder="https://drive.google.com/drive/folders/…"
                  />
                </div>
              </div>
            </div>

            {/* ── File upload (attachments, not links) ─────────────────── */}
            {!editClaim && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Upload Claim Documents</Label>
                  <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-5 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
                    <Upload size={22} className="text-nova-green" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload files</p>
                    <input
                      type="file" multiple className="hidden"
                      accept=".pdf,.doc,.docx,.xlsx,.jpg,.png,.zip"
                      onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files || [])])}
                    />
                  </label>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-nova-green/10 border border-nova-green/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <File size={14} className="text-nova-green" />
                        <span className="text-xs truncate max-w-[200px]">{f.name}</span>
                        <span className="text-[10px] text-gray-400">{(f.size / 1024).toFixed(1)}KB</span>
                      </div>
                      <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : editClaim ? 'Save Changes' : 'Submit Claim'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
