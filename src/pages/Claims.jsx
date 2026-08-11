import { Layout } from '@/components/Layout'
import {
  Plus, Trash2, ExternalLink, FileText, Upload, File, X, Download,
  FileSpreadsheet, Loader2, Filter, Edit2, RefreshCw, Link as LinkIcon,
  AlertCircle, PenLine,
} from 'lucide-react'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  fetchClaims, createClaim, updateClaim, deleteClaim,
  bulkImportClaims, downloadClaimsTemplate, getApiError,
  fetchClaimTemplates, getSavedSignature, saveSignature,
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
import { useAuth } from '@/context/AuthContext'

import { stampPdf, downloadBlob } from '@/lib/stampPdf'

const STATUSES = ['Internal WIP', 'Lodged', 'Paid Out', 'Rejected', 'Withdrawn', 'Below Minimum Excess']

const statusColour = {
  'Internal WIP':         'bg-yellow-100 text-yellow-700',
  'Paid Out':             'bg-green-100 text-green-700',
  'Rejected':             'bg-red-100 text-red-700',
  'Withdrawn':            'bg-gray-100 text-gray-600',
  'Lodged':               'bg-blue-100 text-blue-700',
  'Below Minimum Excess': 'bg-purple-100 text-purple-700',
}

const blankForm = {
  subsidiary: '', claimStatus: 'Internal WIP',
  dateOfIncident: '', dateOfSubmission: '', dateOfSettlement: '',
  claimValue: '', description: '', notes: '',
  incidentFormLink: '', claimFormLink: '', dischargeVoucherLink: '', folderLink: '',
  // Extended fields
  insurer_notified_date: '', internal_report_date: '',
  excess_paid: '', claim_amount_paid: '',
  np_user: '', item_pending: '', other_replacement: '',
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA') : '—'
const toDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : ''

export default function Claims() {
  const { campuses } = useCampuses()
  const { currencySymbol } = useAuth()
  const fmt = (n) => `${currencySymbol} ${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const [claims, setClaims]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editClaim, setEditClaim]   = useState(null)
  const [files, setFiles]           = useState([])
  const [form, setForm]             = useState(blankForm)
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters]       = useState({ status: 'all', subsidiary: 'all', year: 'all' })

  // bulk
  const [bulkFile,      setBulkFile]      = useState(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult,    setBulkResult]    = useState(null)

  // Claim Pack
  const [packOpen,    setPackOpen]    = useState(false)
  const [packClaim,   setPackClaim]   = useState(null)
  const [packInsurer, setPackInsurer] = useState('')
  const [packSaving,  setPackSaving]  = useState(false)
  const [packData,    setPackData]    = useState({})
  const [packItems,   setPackItems]   = useState([{ description:'', where_acquired:'', cost_price:'', depreciation:'', salvage:'', amount_claimed:'' }])
  const [sigCanvas,   setSigCanvas]   = useState(null)
  const [sigDrawing,  setSigDrawing]  = useState(false)
  // Template system
  const [claimTemplates, setClaimTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [savedSig,       setSavedSig]       = useState('')   // base64 from user profile
  const [useSavedSig,    setUseSavedSig]    = useState(false)
  const [generating,     setGenerating]     = useState(false)
  const sigCanvasRef = useRef(null)

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
    total:              filtered.length,
    paidOut:            filtered.filter((c) => c.claimStatus === 'Paid Out').length,
    internalWip:        filtered.filter((c) => c.claimStatus === 'Internal WIP').length,
    lodged:             filtered.filter((c) => c.claimStatus === 'Lodged').length,
    rejected:           filtered.filter((c) => c.claimStatus === 'Rejected').length,
    withdrawn:          filtered.filter((c) => c.claimStatus === 'Withdrawn').length,
    belowExcess:        filtered.filter((c) => c.claimStatus === 'Below Minimum Excess').length,
    totalValue:         filtered.reduce((s, c) => s + (c.claimValue || 0), 0),
    paidOutValue:       filtered.filter((c) => c.claimStatus === 'Paid Out').reduce((s, c) => s + (c.claim_amount_paid || c.claimValue || 0), 0),
  }), [filtered])

  const openCreate = () => { setEditClaim(null); setForm(blankForm); setFiles([]); setDialogOpen(true) }
  const openEdit = (claim) => {
    setEditClaim(claim)
    setForm({
      subsidiary:       claim.subsidiary      || '',
      claimStatus:      claim.claimStatus     || 'Internal WIP',
      dateOfIncident:   toDateInput(claim.dateOfIncident),
      dateOfSubmission: toDateInput(claim.dateOfSubmission),
      dateOfSettlement: toDateInput(claim.dateOfSettlement),
      claimValue:       String(claim.claimValue || ''),
      description:      claim.description     || '',
      notes:            claim.notes           || '',
      incidentFormLink:    claim.incidentFormLink    || '',
      claimFormLink:       claim.claimFormLink       || '',
      dischargeVoucherLink:claim.dischargeVoucherLink|| '',
      folderLink:          claim.folderLink          || '',
      insurer_notified_date: toDateInput(claim.insurer_notified_date),
      internal_report_date:  toDateInput(claim.internal_report_date),
      excess_paid:        String(claim.excess_paid       || ''),
      claim_amount_paid:  String(claim.claim_amount_paid || ''),
      np_user:            claim.np_user            || '',
      item_pending:       claim.item_pending       || '',
      other_replacement:  claim.other_replacement  || '',
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
      subsidiary:       form.subsidiary,
      claimStatus:      form.claimStatus,
      dateOfIncident:   form.dateOfIncident,
      dateOfSubmission: form.dateOfSubmission,
      dateOfSettlement: form.dateOfSettlement || null,
      claimValue:       Number(form.claimValue) || 0,
      description:      form.description.trim(),
      notes:            form.notes.trim(),
      incidentFormLink:    form.incidentFormLink.trim(),
      claimFormLink:       form.claimFormLink.trim(),
      dischargeVoucherLink:form.dischargeVoucherLink.trim(),
      folderLink:          form.folderLink.trim(),
      insurer_notified_date: form.insurer_notified_date || null,
      internal_report_date:  form.internal_report_date  || null,
      excess_paid:           Number(form.excess_paid)       || 0,
      claim_amount_paid:     Number(form.claim_amount_paid) || 0,
      np_user:           form.np_user.trim(),
      item_pending:      form.item_pending.trim(),
      other_replacement: form.other_replacement.trim(),
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

  const openPack = async (claim) => {
    setPackClaim(claim)
    const existing = claim.claim_pack || {}
    setPackInsurer(claim.insurer || '')
    setSelectedTemplate(null)
    setPackData({
      policy_no: '', renewal_date: '', last_premium_date: '',
      insured_name: 'Nova Pioneer Schools', insured_address: '', insured_telephone: '',
      insured_email: '', insured_pin: '', business_occupation: 'School',
      location: claim.subsidiary || '', loss_date_time: '',
      loss_location: claim.subsidiary || '', loss_description: claim.description || '',
      premises_type: 'School Premises', premises_unoccupied: 'No', premises_self_contained: 'Yes',
      owner_of_premises: 'Yes', responsible_repairs: 'Yes', suspicion_parties: 'N/A',
      other_insurance: 'N/A', previous_loss: 'No',
      value_buildings: '', value_property: '',
      police_notified_date: '', police_station: '', recovery_steps: '',
      entry_method: 'N/A', alarm_functional: 'N/A', guards_employed: 'N/A',
      transit_route: 'N/A', transit_accompanying: 'N/A', transit_employee_details: 'N/A',
      fidelity_guarantee: 'N/A', transit_frequency: 'N/A', transit_max_carried: 'N/A',
      amount_claimed: String(claim.claimValue || ''), identity_number: '', contact_number: '',
      when_loss_discovered: '', alarm_activated: 'N/A', third_party_name: 'N/A',
      other_party_interest: 'N/A', other_insurance_twk: 'N/A', total_value_insured: '',
      last_valuated: '', signed_by: '', signed_date: new Date().toLocaleDateString('en-GB'),
      signature_data_url: '',
      ...existing,
    })
    setPackItems(existing.items?.length ? existing.items : [{ description:'', where_acquired:'', cost_price:'', depreciation:'', salvage:'', amount_claimed:'' }])
    setUseSavedSig(false)

    // Load templates and saved signature in parallel
    const [templates, sig] = await Promise.all([
      fetchClaimTemplates(),
      getSavedSignature(),
    ])
    setClaimTemplates(templates)
    setSavedSig(sig || '')

    // Auto-select template matching saved insurer
    if (claim.insurer && templates.length) {
      const match = templates.find(t => t.insurer === claim.insurer)
      if (match) setSelectedTemplate(match)
    }

    setPackOpen(true)
  }

  const setP = (k) => (e) => setPackData((d) => ({ ...d, [k]: e.target.value }))

  // Signature canvas helpers
  const startSig = (e) => {
    setSigDrawing(true)
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.moveTo(cx, cy)
  }
  const drawSig = (e) => {
    if (!sigDrawing || !sigCanvasRef.current) return
    e.preventDefault()
    const ctx = sigCanvasRef.current.getContext('2d')
    const rect = sigCanvasRef.current.getBoundingClientRect()
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0A1628'
    ctx.lineTo(cx, cy); ctx.stroke()
  }
  const endSig = () => {
    setSigDrawing(false)
    if (!sigCanvasRef.current) return
    const dataUrl = sigCanvasRef.current.toDataURL('image/png')
    setPackData((d) => ({ ...d, signature_data_url: dataUrl }))
    setUseSavedSig(false)
  }
  const clearSig = () => {
    if (sigCanvasRef.current) sigCanvasRef.current.getContext('2d').clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height)
    setPackData((d) => ({ ...d, signature_data_url: '' }))
    setUseSavedSig(false)
  }
  const loadSavedSig = () => {
    setPackData((d) => ({ ...d, signature_data_url: savedSig }))
    setUseSavedSig(true)
    // Show saved sig on canvas
    if (sigCanvasRef.current && savedSig) {
      const ctx = sigCanvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height)
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height)
      img.src = savedSig
    }
  }
  const handleSaveSignatureToProfile = async () => {
    const sig = packData.signature_data_url
    if (!sig) { toast.error('Draw a signature first'); return }
    try {
      await saveSignature(sig)
      setSavedSig(sig)
      toast.success('Signature saved to your profile')
    } catch (err) { toast.error(getApiError(err)) }
  }

  const handleSavePack = async () => {
    if (!packInsurer) { toast.error('Select an insurer first'); return }
    setPackSaving(true)
    try {
      const data = await updateClaim(packClaim._id, {
        insurer: packInsurer,
        claim_pack: { ...packData, items: packItems, pack_generated_at: new Date() },
      })
      setClaims((p) => p.map((c) => c._id === packClaim._id ? data.claim : c))
      toast.success('Claim pack saved')
    } catch (err) { toast.error(getApiError(err)) }
    finally { setPackSaving(false) }
  }

  const handleDownloadPack = async () => {
    if (!selectedTemplate) { toast.error('Select an insurer template first'); return }
    if (!selectedTemplate.fieldMap?.length) {
      toast.error('This template has no field map yet. Go to Claim Form Templates to map the fields first.')
      return
    }
    setGenerating(true)
    try {
      const sig = useSavedSig ? savedSig : packData.signature_data_url
      const blob = await stampPdf({
        pdfUrl:    selectedTemplate.cloudinaryUrl,
        templateId: selectedTemplate._id,
        fieldMap:  selectedTemplate.fieldMap,
        values:    { ...packData },
        sigField:  selectedTemplate.signatureField,
        sigDataUrl: sig || null,
      })
      downloadBlob(blob, `ClaimPack_${selectedTemplate.insurer.replace(/\s+/g,'_')}_${packClaim?.claimId}_${new Date().toISOString().slice(0,10)}.pdf`)
      toast.success('Claim pack downloaded')
    } catch (err) {
      toast.error('PDF generation failed: ' + err.message)
    } finally { setGenerating(false) }
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
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total',              value: stats.total,        sub: fmt(stats.totalValue),    colour: 'text-nova-navy dark:text-white' },
            { label: 'Paid Out',           value: stats.paidOut,      sub: fmt(stats.paidOutValue),  colour: 'text-green-600' },
            { label: 'Internal WIP',       value: stats.internalWip,  sub: 'In progress',            colour: 'text-yellow-600' },
            { label: 'Lodged',             value: stats.lodged,       sub: 'With insurer',           colour: 'text-blue-600' },
            { label: 'Rejected/Withdrawn', value: stats.rejected + stats.withdrawn, sub: 'Closed',  colour: 'text-gray-500' },
            { label: 'Below Min Excess',   value: stats.belowExcess,  sub: 'Not pursued',            colour: 'text-purple-600' },
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
                  <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.subsidiary} onValueChange={(v) => setFilters((p) => ({ ...p, subsidiary: v }))}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Campus" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campuses</SelectItem>
                    {campuses.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
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
                      {['Ref','Status','Campus','Incident Date','Submitted','Settled','Claim Value','Amt Paid','Excess','Incident Link','Description','Docs',''].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={13} className="px-4 py-12 text-center text-gray-400">
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
                        <td className="px-3 py-3 tabular-nums text-xs font-semibold text-nova-navy dark:text-white whitespace-nowrap">{c.claimValue > 0 ? fmt(c.claimValue) : '—'}</td>
                        <td className="px-3 py-3 tabular-nums text-xs text-green-600 whitespace-nowrap">{c.claim_amount_paid > 0 ? fmt(c.claim_amount_paid) : '—'}</td>
                        <td className="px-3 py-3 tabular-nums text-xs text-gray-500 whitespace-nowrap">{c.excess_paid > 0 ? fmt(c.excess_paid) : '—'}</td>
                        {/* Linked incident badge */}
                        <td className="px-3 py-3 text-xs whitespace-nowrap">
                          {c.linked_incident_id ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                              <AlertCircle size={9} /> Linked
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400 max-w-[160px] truncate text-xs" title={c.description}>{c.description}</td>
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
                            <button onClick={() => openPack(c)} title="Claim Pack / Insurer Form" className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"><PenLine size={13} /></button>
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
                <Button onClick={handleBulkUpload} disabled={!bulkFile || bulkUploading} className="w-full">
                  {bulkUploading ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><Upload size={16} /> Upload & Import</>}
                </Button>
                {bulkResult && (
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editClaim ? `Edit Claim — ${editClaim.claimId}` : 'Submit New Claim'}</DialogTitle>
            <DialogDescription>Fill in the claim details. Extended fields for pipeline tracking.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Core */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campus *</Label>
                <Select value={form.subsidiary} onValueChange={(v) => setForm((p) => ({ ...p, subsidiary: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>
                    {campuses.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label>Date of Incident *</Label><Input type="date" value={form.dateOfIncident} onChange={(e) => setForm((p) => ({ ...p, dateOfIncident: e.target.value }))} required /></div>
              <div className="space-y-1.5"><Label>Date of Submission *</Label><Input type="date" value={form.dateOfSubmission} onChange={(e) => setForm((p) => ({ ...p, dateOfSubmission: e.target.value }))} required /></div>
              <div className="space-y-1.5"><Label>Date of Settlement</Label><Input type="date" value={form.dateOfSettlement} onChange={(e) => setForm((p) => ({ ...p, dateOfSettlement: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} required /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></div>

            <Separator />
            <p className="text-sm font-semibold text-nova-navy dark:text-white">Financial Details</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label>Claim Value ({currencySymbol})</Label><Input type="number" step="0.01" min="0" value={form.claimValue} onChange={(e) => setForm((p) => ({ ...p, claimValue: e.target.value }))} placeholder="0.00" /></div>
              <div className="space-y-1.5"><Label>Claim Amount Paid ({currencySymbol})</Label><Input type="number" step="0.01" min="0" value={form.claim_amount_paid} onChange={(e) => setForm((p) => ({ ...p, claim_amount_paid: e.target.value }))} placeholder="0.00" /></div>
              <div className="space-y-1.5"><Label>Excess Paid ({currencySymbol})</Label><Input type="number" step="0.01" min="0" value={form.excess_paid} onChange={(e) => setForm((p) => ({ ...p, excess_paid: e.target.value }))} placeholder="0.00" /></div>
            </div>

            <Separator />
            <p className="text-sm font-semibold text-nova-navy dark:text-white">Pipeline Tracking</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Insurer Notified Date</Label><Input type="date" value={form.insurer_notified_date} onChange={(e) => setForm((p) => ({ ...p, insurer_notified_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Internal Report Date</Label><Input type="date" value={form.internal_report_date} onChange={(e) => setForm((p) => ({ ...p, internal_report_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>NP User Involved</Label><Input value={form.np_user} onChange={(e) => setForm((p) => ({ ...p, np_user: e.target.value }))} placeholder="Name of staff member" /></div>
              <div className="space-y-1.5"><Label>Item Pending</Label><Input value={form.item_pending} onChange={(e) => setForm((p) => ({ ...p, item_pending: e.target.value }))} placeholder="What is outstanding?" /></div>
            </div>
            <div className="space-y-1.5"><Label>Other Replacement Info</Label><Input value={form.other_replacement} onChange={(e) => setForm((p) => ({ ...p, other_replacement: e.target.value }))} placeholder="Replacement details or notes" /></div>

            <Separator />
            <p className="text-sm font-semibold text-nova-navy dark:text-white flex items-center gap-2"><LinkIcon size={14} /> Document Links</p>
            <div className="grid grid-cols-2 gap-3">
              {[['incidentFormLink','Incident Form Link'],['claimFormLink','Claim Form Link'],['dischargeVoucherLink','Discharge Voucher Link'],['folderLink','Folder Link']].map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input type="url" value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder="https://drive.google.com/…" />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editClaim ? 'Save Changes' : 'Submit Claim'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Claim Pack Dialog ─────────────────────────────────────────────── */}
      {packOpen && packClaim && (
        <Dialog open={packOpen} onOpenChange={setPackOpen}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PenLine size={16} className="text-purple-600" />
                Claim Pack — {packClaim.claimId}
              </DialogTitle>
              <DialogDescription>
                Fill in the insurer form fields. Sign below, then download the pre-filled PDF to submit to the insurer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* Insurer selector */}
              <div className="space-y-1.5">
                <Label className="font-semibold">Select Insurer Template *</Label>
                {claimTemplates.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    No templates uploaded yet. Go to <strong>Claim Form Templates</strong> to upload insurer PDFs first.
                  </div>
                ) : (
                  <Select value={selectedTemplate?._id || ''} onValueChange={(id) => {
                    const tpl = claimTemplates.find(t => t._id === id)
                    setSelectedTemplate(tpl || null)
                    setPackInsurer(tpl?.insurer || '')
                  }}>
                    <SelectTrigger className="w-72"><SelectValue placeholder="Choose insurer template" /></SelectTrigger>
                    <SelectContent>
                      {claimTemplates.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.name} — {t.region}
                          {t.fieldMap?.length > 0 ? '' : ' ⚠ (not mapped)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedTemplate && (
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    {selectedTemplate.fieldMap?.length || 0} fields mapped ·
                    <a href={selectedTemplate.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="text-nova-teal hover:underline">View original PDF</a>
                  </p>
                )}
              </div>

              {packInsurer && (<>
                <Separator />
                <p className="text-sm font-bold text-nova-navy dark:text-white">Policy Information</p>
                <div className="grid grid-cols-3 gap-3">
                  {[['policy_no','Policy No.'],['renewal_date','Renewal Date'],['last_premium_date','Last Premium Date']].map(([k,l]) => (
                    <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input value={packData[k]||''} onChange={setP(k)} className="h-8 text-sm" /></div>
                  ))}
                </div>
                <Separator />
                <p className="text-sm font-bold text-nova-navy dark:text-white">Insured Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['insured_name','Insured Name'],['insured_address','Address'],['insured_telephone','Telephone'],['insured_email','Email'],['insured_pin','PIN No.'],['business_occupation','Business/Occupation']].map(([k,l]) => (
                    <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input value={packData[k]||''} onChange={setP(k)} className="h-8 text-sm" /></div>
                  ))}
                </div>
                {packInsurer === 'TWK' && (
                  <div className="grid grid-cols-2 gap-3">
                    {[['identity_number','Identity No./VAT'],['contact_number','Contact Number']].map(([k,l]) => (
                      <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input value={packData[k]||''} onChange={setP(k)} className="h-8 text-sm" /></div>
                    ))}
                  </div>
                )}
                <Separator />
                <p className="text-sm font-bold text-nova-navy dark:text-white">Circumstances / Loss Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['loss_date_time','Date & Time of Loss'],['loss_location','Where Loss Occurred']].map(([k,l]) => (
                    <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input value={packData[k]||''} onChange={setP(k)} className="h-8 text-sm" /></div>
                  ))}
                </div>
                <div className="space-y-1"><Label className="text-xs">Full Description of Loss</Label>
                  <Textarea value={packData.loss_description||''} onChange={setP('loss_description')} rows={3} className="text-sm" /></div>
                <Separator />
                <p className="text-sm font-bold text-nova-navy dark:text-white">General Information</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['premises_type','Type of Premises'],['premises_unoccupied','Were premises unoccupied? (Yes/No)'],
                    ['premises_self_contained','Are premises self-contained?'],['owner_of_premises','Are you owner?'],
                    ['responsible_repairs','Responsible for repairs?'],['suspicion_parties','Suspicion as to parties implicated?'],
                    ['value_buildings','Value of Buildings'],['value_property','Value of all property in premises'],
                    ['previous_loss','Previous loss/damage?'],['other_insurance','Other insurance covering this loss?'],
                  ].map(([k,l]) => (
                    <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input value={packData[k]||''} onChange={setP(k)} className="h-8 text-sm" /></div>
                  ))}
                </div>
                <Separator />
                <p className="text-sm font-bold text-nova-navy dark:text-white">Theft / Police Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {[['police_notified_date','When were Police notified?'],['police_station','Address of Police Station'],
                    ['recovery_steps','Steps taken to recover property'],['entry_method','Method of entry to premises'],
                    ['alarm_functional','Alarm — did it function?'],['guards_employed','Guards employed? (firm name)'],
                  ].map(([k,l]) => (
                    <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input value={packData[k]||''} onChange={setP(k)} className="h-8 text-sm" /></div>
                  ))}
                </div>
                {packInsurer !== 'TWK' && (<>
                  <Separator />
                  <p className="text-sm font-bold text-nova-navy dark:text-white">Loss in Transit (if applicable)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[['transit_route','Starting point & destination'],['transit_accompanying','Who was accompanying property?'],
                      ['transit_employee_details','Employee age & duties'],['fidelity_guarantee','Fidelity Guarantee Policy?'],
                      ['transit_frequency','How often is transit made?'],['transit_max_carried','Maximum ever carried at one time?'],
                    ].map(([k,l]) => (
                      <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input value={packData[k]||''} onChange={setP(k)} className="h-8 text-sm" /></div>
                    ))}
                  </div>
                </>)}
                <Separator />
                <p className="text-sm font-bold text-nova-navy dark:text-white">Amount Claimed</p>
                <div className="space-y-1 max-w-xs"><Label className="text-xs">Total Amount Claimed</Label>
                  <Input value={packData.amount_claimed||''} onChange={setP('amount_claimed')} className="h-8 text-sm" placeholder="e.g. KES 45,000" /></div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600">Items / Property Details</p>
                    <button type="button" onClick={() => setPackItems((p) => [...p, { description:'', where_acquired:'', cost_price:'', depreciation:'', salvage:'', amount_claimed:'' }])} className="text-xs text-nova-teal hover:underline">+ Add row</button>
                  </div>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-gray-50 border-b">
                        {['Description','Where/When Acquired','Cost Price','Depreciation','Salvage','Amount Claimed',''].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{packItems.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          {['description','where_acquired','cost_price','depreciation','salvage','amount_claimed'].map((f) => (
                            <td key={f} className="px-1 py-1"><Input value={item[f]||''} onChange={(e) => setPackItems((p) => p.map((r,i) => i===idx ? {...r,[f]:e.target.value} : r))} className="h-7 text-xs px-1.5" /></td>
                          ))}
                          <td className="px-1 py-1"><button type="button" onClick={() => setPackItems((p) => p.filter((_,i) => i!==idx))} className="text-red-400 hover:text-red-600"><X size={12} /></button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-nova-navy dark:text-white">Signature</p>
                    <div className="flex items-center gap-2">
                      {savedSig && (
                        <button type="button" onClick={loadSavedSig}
                          className="text-xs text-nova-teal hover:underline flex items-center gap-1">
                          ↩ Use saved signature
                        </button>
                      )}
                      <button type="button" onClick={clearSig} className="text-xs text-red-500 hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Draw your signature:</p>
                      <canvas ref={sigCanvasRef} width={300} height={100}
                        className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair touch-none w-full"
                        style={{ maxHeight: 100 }}
                        onMouseDown={startSig} onMouseMove={drawSig} onMouseUp={endSig} onMouseLeave={endSig}
                        onTouchStart={startSig} onTouchMove={drawSig} onTouchEnd={endSig} />
                      {packData.signature_data_url && !useSavedSig && (
                        <button type="button" onClick={handleSaveSignatureToProfile}
                          className="text-[10px] text-nova-teal hover:underline mt-1">
                          💾 Save to my profile for future use
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-1"><Label className="text-xs">Signed by (Print Name)</Label><Input value={packData.signed_by||''} onChange={setP('signed_by')} className="h-8 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-xs">Date</Label><Input value={packData.signed_date||''} onChange={setP('signed_date')} className="h-8 text-sm" /></div>
                    </div>
                  </div>
                  {packData.signature_data_url && (
                    <p className="text-[10px] text-green-600">✓ Signature ready {useSavedSig ? '(from saved profile)' : '(newly drawn)'}</p>
                  )}
                </div>
              </>)}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPackOpen(false)}>Close</Button>
              <Button type="button" variant="outline" onClick={handleSavePack} disabled={packSaving || !packInsurer}>
                {packSaving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Pack'}
              </Button>
              <Button type="button" onClick={handleDownloadPack} disabled={!selectedTemplate || generating} className="bg-purple-600 hover:bg-purple-700">
                {generating ? <><Loader2 size={14} className="animate-spin mr-1" /> Generating…</> : <><Download size={14} className="mr-1" /> Download PDF</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  )
}
