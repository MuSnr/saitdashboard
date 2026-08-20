import { Layout } from '@/components/Layout'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Edit2, Upload, Loader2, RefreshCw, MapPin, FileText, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { fetchClaimTemplates, createClaimTemplate, updateClaimTemplate, deleteClaimTemplate, getApiError } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

// All the data fields that can be mapped to PDF positions
const FIELD_KEYS = [
  { key: 'policy_no',           label: 'Policy No.' },
  { key: 'renewal_date',        label: 'Renewal Date' },
  { key: 'last_premium_date',   label: 'Last Premium Date' },
  { key: 'insured_name',        label: 'Insured Name' },
  { key: 'insured_address',     label: 'Address' },
  { key: 'insured_telephone',   label: 'Telephone' },
  { key: 'insured_email',       label: 'Email' },
  { key: 'insured_pin',         label: 'PIN No.' },
  { key: 'business_occupation', label: 'Business / Occupation' },
  { key: 'loss_date_time',      label: 'Date & Time of Loss' },
  { key: 'loss_location',       label: 'Where Loss Occurred' },
  { key: 'loss_description',    label: 'Description of Loss' },
  { key: 'premises_type',       label: 'Type of Premises' },
  { key: 'premises_unoccupied', label: 'Premises Unoccupied?' },
  { key: 'owner_of_premises',   label: 'Owner of Premises?' },
  { key: 'suspicion_parties',   label: 'Suspicion of Parties' },
  { key: 'other_insurance',     label: 'Other Insurance' },
  { key: 'previous_loss',       label: 'Previous Loss?' },
  { key: 'value_buildings',     label: 'Value of Buildings' },
  { key: 'value_property',      label: 'Value of Property' },
  { key: 'police_notified_date',label: 'Police Notified Date' },
  { key: 'police_station',      label: 'Police Station' },
  { key: 'recovery_steps',      label: 'Recovery Steps' },
  { key: 'entry_method',        label: 'Entry Method' },
  { key: 'alarm_functional',    label: 'Alarm Functional?' },
  { key: 'guards_employed',     label: 'Guards Employed?' },
  { key: 'amount_claimed',      label: 'Amount Claimed' },
  { key: 'identity_number',     label: 'Identity Number / VAT' },
  { key: 'contact_number',      label: 'Contact Number' },
  { key: 'signed_by',           label: 'Signed By (Name)' },
  { key: 'signed_date',         label: 'Signed Date' },
]

const blankForm = { name: '', insurer: '', region: 'Both' }

// ── Pre-mapped field coordinates for known insurer forms ─────────────────────
// Coordinates are in mm from top-left of A4 page (210×297mm)
// Measured from the actual GA Insurance and TWK forms

const DEFAULT_MAPS = {
  // GA Insurance & Mayfair — identical form layout
  'GA': {
    fieldMap: [
      { key: 'policy_no',           label: 'Policy No.',             page: 1, x: 35,  y: 52,  fontSize: 9, fontStyle: 'normal', maxWidth: 25 },
      { key: 'renewal_date',        label: 'Renewal Date',           page: 1, x: 95,  y: 52,  fontSize: 9, fontStyle: 'normal', maxWidth: 30 },
      { key: 'last_premium_date',   label: 'Last Premium Date',      page: 1, x: 155, y: 52,  fontSize: 9, fontStyle: 'normal', maxWidth: 45 },
      { key: 'insured_name',        label: 'Insured Name',           page: 1, x: 50,  y: 62,  fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'insured_address',     label: 'Address',                page: 1, x: 50,  y: 70,  fontSize: 9, fontStyle: 'normal', maxWidth: 100 },
      { key: 'insured_telephone',   label: 'Telephone',              page: 1, x: 140, y: 70,  fontSize: 9, fontStyle: 'normal', maxWidth: 50 },
      { key: 'business_occupation', label: 'Business/Occupation',   page: 1, x: 50,  y: 78,  fontSize: 9, fontStyle: 'normal', maxWidth: 80 },
      { key: 'insured_email',       label: 'Email',                  page: 1, x: 50,  y: 86,  fontSize: 9, fontStyle: 'normal', maxWidth: 80 },
      { key: 'insured_pin',         label: 'PIN No.',                page: 1, x: 150, y: 86,  fontSize: 9, fontStyle: 'normal', maxWidth: 45 },
      { key: 'loss_date_time',      label: 'Date & Time of Loss',    page: 1, x: 50,  y: 100, fontSize: 9, fontStyle: 'normal', maxWidth: 60 },
      { key: 'loss_location',       label: 'Where Loss Occurred',   page: 1, x: 50,  y: 109, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'loss_description',    label: 'Description of Loss',   page: 1, x: 50,  y: 118, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'premises_type',       label: 'Type of Premises',      page: 1, x: 50,  y: 140, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'premises_unoccupied', label: 'Premises Unoccupied?',  page: 1, x: 50,  y: 149, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'owner_of_premises',   label: 'Owner of Premises?',    page: 1, x: 50,  y: 158, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'suspicion_parties',   label: 'Suspicion of Parties',  page: 1, x: 50,  y: 175, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'other_insurance',     label: 'Other Insurance',       page: 1, x: 50,  y: 184, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'previous_loss',       label: 'Previous Loss?',        page: 1, x: 50,  y: 197, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'value_buildings',     label: 'Value of Buildings',    page: 1, x: 100, y: 210, fontSize: 9, fontStyle: 'normal', maxWidth: 50 },
      { key: 'value_property',      label: 'Value of Property',     page: 1, x: 160, y: 210, fontSize: 9, fontStyle: 'normal', maxWidth: 40 },
      { key: 'police_notified_date',label: 'Police Notified Date',  page: 1, x: 50,  y: 228, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'police_station',      label: 'Police Station',        page: 1, x: 50,  y: 237, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'recovery_steps',      label: 'Recovery Steps',        page: 1, x: 50,  y: 246, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'amount_claimed',      label: 'Amount Claimed',        page: 1, x: 50,  y: 280, fontSize: 9, fontStyle: 'normal', maxWidth: 140 },
      { key: 'signed_by',           label: 'Signed By',             page: 2, x: 100, y: 248, fontSize: 9, fontStyle: 'normal', maxWidth: 80 },
      { key: 'signed_date',         label: 'Signed Date',           page: 2, x: 100, y: 238, fontSize: 9, fontStyle: 'normal', maxWidth: 50 },
    ],
    signatureField: { page: 2, x: 15, y: 230, width: 65, height: 18 },
  },
  // TWK — South Africa bilingual form
  'TWK': {
    fieldMap: [
      { key: 'policy_no',           label: 'Policy No.',             page: 1, x: 50,  y: 36,  fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'insured_name',        label: 'Insured Name',           page: 1, x: 50,  y: 54,  fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'identity_number',     label: 'Identity No./VAT',       page: 1, x: 50,  y: 63,  fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'contact_number',      label: 'Contact Number',         page: 1, x: 50,  y: 72,  fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'loss_date_time',      label: 'Date of Loss',           page: 1, x: 50,  y: 90,  fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'loss_location',       label: 'When Loss Discovered',   page: 1, x: 50,  y: 99,  fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'amount_claimed',      label: 'Value of Loss',          page: 1, x: 50,  y: 108, fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'insured_address',     label: 'Address',                page: 1, x: 50,  y: 126, fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'premises_unoccupied', label: 'Premises Occupied?',     page: 1, x: 50,  y: 135, fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'business_occupation', label: 'Purpose of Occupation',  page: 1, x: 50,  y: 162, fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'loss_description',    label: 'Circumstances',          page: 1, x: 50,  y: 180, fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'previous_loss',       label: 'Previous Loss?',         page: 1, x: 50,  y: 240, fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'police_notified_date',label: 'Police Date/Time/Place', page: 2, x: 50,  y: 36,  fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'police_station',      label: 'Police Details',         page: 2, x: 50,  y: 54,  fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'other_insurance',     label: 'Other Insurance?',       page: 2, x: 50,  y: 108, fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'value_property',      label: 'Total Value Insured',    page: 2, x: 50,  y: 126, fontSize: 9, fontStyle: 'normal', maxWidth: 120 },
      { key: 'signed_by',           label: 'Signed By',              page: 2, x: 100, y: 200, fontSize: 9, fontStyle: 'normal', maxWidth: 80 },
      { key: 'signed_date',         label: 'Signed Date',            page: 2, x: 100, y: 190, fontSize: 9, fontStyle: 'normal', maxWidth: 50 },
    ],
    signatureField: { page: 2, x: 15, y: 183, width: 65, height: 18 },
  },
}

// Detect which default map to use based on insurer name
function getDefaultMap(insurer) {
  if (!insurer) return null
  const name = insurer.toLowerCase()
  if (name.includes('twk')) return DEFAULT_MAPS['TWK']
  if (name.includes('ga') || name.includes('mayfair')) return DEFAULT_MAPS['GA']
  return null
}

export default function ClaimTemplates() {
  const { isAdmin, isSuperAdmin } = useAuth()
  const [templates, setTemplates]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTpl, setEditTpl]       = useState(null)
  const [form, setForm]             = useState(blankForm)
  const [pdfFile, setPdfFile]       = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Field mapper state
  const [mapperOpen,   setMapperOpen]   = useState(false)
  const [mapperTpl,    setMapperTpl]    = useState(null)
  const [fieldMap,     setFieldMap]     = useState([])
  const [sigField,     setSigField]     = useState({ page:1, x:15, y:240, width:60, height:20 })
  const [activeKey,    setActiveKey]    = useState(null)   // key being mapped
  const [pdfImgUrl,    setPdfImgUrl]    = useState(null)   // rendered page image
  const [mapperPage,   setMapperPage]   = useState(1)
  const [savingMap,    setSavingMap]    = useState(false)
  // Actual page dimensions in mm — captured from pdf.js viewport at scale=1
  const [pageSizeMm,   setPageSizeMm]   = useState({ width: 210, height: 297 })
  const [totalPages,   setTotalPages]   = useState(1)
  const canvasRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await fetchClaimTemplates(); setTemplates(data) }
    catch (err) { toast.error(getApiError(err)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditTpl(null); setForm(blankForm); setPdfFile(null); setDialogOpen(true) }
  const openEdit   = (t) => { setEditTpl(t); setForm({ name: t.name, insurer: t.insurer, region: t.region }); setPdfFile(null); setDialogOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.insurer) { toast.error('Name and insurer are required'); return }
    if (!editTpl && !pdfFile) { toast.error('Please upload the insurer PDF'); return }
    setSubmitting(true)
    try {
      if (editTpl) {
        const payload = { name: form.name, insurer: form.insurer, region: form.region }
        if (pdfFile) {
          const fd = new FormData()
          Object.entries(payload).forEach(([k,v]) => fd.append(k, v))
          fd.append('pdf', pdfFile)
          await updateClaimTemplate(editTpl._id, fd)
        } else {
          await updateClaimTemplate(editTpl._id, payload)
        }
        toast.success('Template updated')
      } else {
        const fd = new FormData()
        fd.append('name', form.name); fd.append('insurer', form.insurer); fd.append('region', form.region)
        fd.append('pdf', pdfFile)
        await createClaimTemplate(fd)
        toast.success('Template uploaded')
      }
      setDialogOpen(false); load()
    } catch (err) { toast.error(getApiError(err)) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return
    try { await deleteClaimTemplate(id); setTemplates((p) => p.filter((t) => t._id !== id)); toast.success('Deleted') }
    catch (err) { toast.error(getApiError(err)) }
  }

  // Open field mapper for a template
  const openMapper = (tpl) => {
    setMapperTpl(tpl)
    setFieldMap(tpl.fieldMap || [])
    setSigField(tpl.signatureField || { page:1, x:15, y:240, width:60, height:20 })
    setMapperPage(1)
    setActiveKey(null)

    // Auto-load default map if template has no mapping yet
    if (!tpl.fieldMap?.length) {
      const def = getDefaultMap(tpl.insurer)
      if (def) {
        setFieldMap(def.fieldMap)
        setSigField(def.signatureField)
        toast.success(`Default field map loaded for ${tpl.insurer} — review positions then save.`)
      }
    }

    // Use proxy URL — streams PDF from GridFS via our authenticated API
    const proxyUrl = `${import.meta.env.VITE_API_URL || '/api'}/claim-templates/${tpl._id}/pdf`
    renderPdfPage(proxyUrl, 1)
    setMapperOpen(true)
  }

  const renderPdfPage = async (url, pageNum) => {
    try {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          s.onload = resolve; s.onerror = reject
          document.head.appendChild(s)
        })
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      }

      // Fetch PDF bytes ourselves with auth token, pass ArrayBuffer to pdf.js
      const token = localStorage.getItem('sait-token')
      const res   = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = await res.arrayBuffer()

      const pdf      = await window.pdfjsLib.getDocument({ data: buffer }).promise
      const page     = await pdf.getPage(pageNum)

      // Capture actual page size at scale=1 (native PDF points), convert to mm
      // 1 PDF point = 0.3528 mm
      const PT_TO_MM = 0.3528
      const nativeVp = page.getViewport({ scale: 1 })
      setPageSizeMm({
        width:  nativeVp.width  * PT_TO_MM,
        height: nativeVp.height * PT_TO_MM,
      })
      setTotalPages(pdf.numPages)

      // Render at higher scale for display quality
      const scale    = 1.5
      const viewport = page.getViewport({ scale })
      const canvas   = document.createElement('canvas')
      canvas.width   = viewport.width
      canvas.height  = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      setPdfImgUrl(canvas.toDataURL('image/png'))
    } catch (err) {
      toast.error('Could not render PDF preview: ' + err.message)
    }
  }

  // Click on PDF preview to map a field
  const handleMapperClick = (e) => {
    if (!activeKey || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width
    const yPct = (e.clientY - rect.top)  / rect.height

    // Use actual page dimensions captured from pdf.js — not hardcoded A4
    const xMm = xPct * pageSizeMm.width
    const yMm = yPct * pageSizeMm.height

    if (activeKey === '__signature__') {
      setSigField((s) => ({
        ...s,
        page: mapperPage,
        x: parseFloat(xMm.toFixed(2)),
        y: parseFloat(yMm.toFixed(2)),
        pageWidth:  parseFloat(pageSizeMm.width.toFixed(2)),
        pageHeight: parseFloat(pageSizeMm.height.toFixed(2)),
      }))
      toast.success(`Signature placed at (${xMm.toFixed(1)}, ${yMm.toFixed(1)}) mm`)
    } else {
      const label = FIELD_KEYS.find((f) => f.key === activeKey)?.label || activeKey
      setFieldMap((prev) => {
        const filtered = prev.filter((f) => f.key !== activeKey)
        return [...filtered, {
          key:        activeKey,
          label,
          page:       mapperPage,
          x:          parseFloat(xMm.toFixed(2)),
          y:          parseFloat(yMm.toFixed(2)),
          // Store actual page size alongside each coordinate so stampPdf can verify
          pageWidth:  parseFloat(pageSizeMm.width.toFixed(2)),
          pageHeight: parseFloat(pageSizeMm.height.toFixed(2)),
          fontSize:   9,
          fontStyle:  'normal',
          maxWidth:   60,
        }]
      })
      toast.success(`"${label}" mapped to (${xMm.toFixed(1)}, ${yMm.toFixed(1)}) mm`)
    }
    setActiveKey(null)
  }

  const saveFieldMap = async () => {
    if (!mapperTpl) return
    setSavingMap(true)
    try {
      await updateClaimTemplate(mapperTpl._id, { fieldMap: JSON.stringify(fieldMap), signatureField: JSON.stringify(sigField) })
      toast.success('Field map saved')
      setMapperOpen(false)
      load()
    } catch (err) { toast.error(getApiError(err)) }
    finally { setSavingMap(false) }
  }

  if (!isAdmin && !isSuperAdmin) return (
    <Layout><div className="p-8 text-gray-500">Admin access required.</div></Layout>
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Claim Form Templates</h1>
            <p className="text-gray-500 dark:text-gray-400">Upload insurer PDF forms and map their fields for auto-fill</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
            <Button onClick={openCreate}><Plus size={16} /> Upload Template</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-nova-green" /></div>
        ) : templates.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>No templates yet. Upload your first insurer PDF form.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <Card key={t._id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <CardDescription>{t.insurer} · {t.region}</CardDescription>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.fieldMap?.length > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.fieldMap?.length > 0 ? `${t.fieldMap.length} fields mapped` : 'Not mapped'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a
                    href={`${import.meta.env.VITE_API_URL || '/api'}/claim-templates/${t._id}/pdf`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-nova-teal hover:underline flex items-center gap-1"
                    onClick={(e) => {
                      // Attach token as query param since anchor tags can't set headers
                      e.preventDefault()
                      const token = localStorage.getItem('sait-token')
                      const url = `${import.meta.env.VITE_API_URL || '/api'}/claim-templates/${t._id}/pdf`
                      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.blob())
                        .then(blob => {
                          const blobUrl = URL.createObjectURL(blob)
                          window.open(blobUrl, '_blank')
                          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
                        })
                        .catch(() => toast.error('Could not open PDF'))
                    }}
                  >
                    <FileText size={12} /> View original PDF
                  </a>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openMapper(t)}>
                      <MapPin size={13} /> Map Fields
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Edit2 size={13} /></Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(t._id)}><Trash2 size={13} /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTpl ? 'Edit Template' : 'Upload Insurer PDF Template'}</DialogTitle>
            <DialogDescription>The original PDF will be stored and used as the base for claim packs.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5"><Label>Template Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. GA Insurance Kenya 2026" required /></div>
            <div className="space-y-1.5"><Label>Insurer *</Label>
              <Input value={form.insurer} onChange={(e) => setForm((p) => ({ ...p, insurer: e.target.value }))} placeholder="e.g. GA Insurance" required /></div>
            <div className="space-y-1.5"><Label>Region</Label>
              <Select value={form.region} onValueChange={(v) => setForm((p) => ({ ...p, region: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kenya">Kenya</SelectItem>
                  <SelectItem value="South Africa">South Africa</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editTpl ? 'Replace PDF (optional)' : 'Insurer PDF *'}</Label>
              <label className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-nova-green transition-colors">
                <Upload size={20} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600">{pdfFile ? pdfFile.name : 'Click to select PDF'}</span>
                <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : editTpl ? 'Save' : 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Field Mapper Dialog */}
      {mapperOpen && mapperTpl && (
        <Dialog open={mapperOpen} onOpenChange={setMapperOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><MapPin size={16} className="text-purple-600" /> Field Mapper — {mapperTpl.name}</DialogTitle>
              <DialogDescription className="flex items-center justify-between">
                <span>Select a field, then click on the PDF where that value should appear.</span>
                {getDefaultMap(mapperTpl?.insurer) && (
                  <button
                    type="button"
                    onClick={() => {
                      const def = getDefaultMap(mapperTpl.insurer)
                      setFieldMap(def.fieldMap)
                      setSigField(def.signatureField)
                      toast.success('Default positions loaded — save when ready.')
                    }}
                    className="text-xs font-semibold text-purple-600 hover:underline flex-shrink-0 ml-4"
                  >
                    ↩ Load default map
                  </button>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-4 pt-2">
              {/* Left: field list */}
              <div className="w-56 flex-shrink-0 space-y-1 overflow-y-auto max-h-[70vh]">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Fields</p>
                {FIELD_KEYS.map((f) => {
                  const mapped = fieldMap.find((m) => m.key === f.key)
                  return (
                    <button key={f.key} onClick={() => setActiveKey(f.key)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-lg flex items-center justify-between gap-1 transition-colors
                        ${activeKey === f.key ? 'bg-purple-100 text-purple-700 font-semibold' : 'hover:bg-gray-100 text-gray-700'}
                      `}>
                      <span>{f.label}</span>
                      {mapped && <Check size={11} className="text-green-500 flex-shrink-0" />}
                    </button>
                  )
                })}
                <Separator />
                <button onClick={() => setActiveKey('__signature__')}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg flex items-center justify-between gap-1 transition-colors
                    ${activeKey === '__signature__' ? 'bg-purple-100 text-purple-700 font-semibold' : 'hover:bg-gray-100 text-gray-700'}
                  `}>
                  <span>✍ Signature</span>
                  {sigField.x && <Check size={11} className="text-green-500 flex-shrink-0" />}
                </button>
              </div>

              {/* Right: PDF preview */}
              <div className="flex-1 space-y-2">
                {activeKey && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700 font-medium">
                    <MapPin size={14} />
                    Click on the PDF to place: <strong>{activeKey === '__signature__' ? 'Signature' : FIELD_KEYS.find(f => f.key === activeKey)?.label}</strong>
                  </div>
                )}
                {/* Page navigation */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={mapperPage <= 1}
                      onClick={() => {
                        const newPage = mapperPage - 1
                        setMapperPage(newPage)
                        setPdfImgUrl(null)
                        const proxyUrl = `${import.meta.env.VITE_API_URL || '/api'}/claim-templates/${mapperTpl._id}/pdf`
                        renderPdfPage(proxyUrl, newPage)
                      }}
                      className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                    >← Prev</button>
                    <span className="text-xs text-gray-600 font-medium">Page {mapperPage} / {totalPages}</span>
                    <button
                      type="button"
                      disabled={mapperPage >= totalPages}
                      onClick={() => {
                        const newPage = mapperPage + 1
                        setMapperPage(newPage)
                        setPdfImgUrl(null)
                        const proxyUrl = `${import.meta.env.VITE_API_URL || '/api'}/claim-templates/${mapperTpl._id}/pdf`
                        renderPdfPage(proxyUrl, newPage)
                      }}
                      className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
                    >Next →</button>
                  </div>
                )}
                {pdfImgUrl ? (
                  <div className="relative border border-gray-300 rounded-lg overflow-hidden cursor-crosshair"
                    style={{ maxHeight: '65vh' }}>
                    <img ref={canvasRef} src={pdfImgUrl} alt="PDF preview" className="w-full" onClick={handleMapperClick} />
                    {/* Overlay dots for mapped fields */}
                    {fieldMap.filter(f => f.page === mapperPage).map((f) => {
                      const pw = f.pageWidth  || pageSizeMm.width
                      const ph = f.pageHeight || pageSizeMm.height
                      return (
                        <div key={f.key} title={`${f.label} (${f.x.toFixed(1)}, ${f.y.toFixed(1)}) mm`}
                          style={{ position:'absolute', left:`${(f.x/pw)*100}%`, top:`${(f.y/ph)*100}%`, transform:'translate(-50%,-50%)' }}
                          className="w-3 h-3 rounded-full bg-purple-500 border-2 border-white shadow-md pointer-events-none" />
                      )
                    })}
                    {sigField.page === mapperPage && (
                      <div title={`Signature (${sigField.x}, ${sigField.y}) mm`}
                        style={{
                          position:'absolute',
                          left:`${(sigField.x / (sigField.pageWidth  || pageSizeMm.width))  * 100}%`,
                          top: `${(sigField.y / (sigField.pageHeight || pageSizeMm.height)) * 100}%`,
                          transform:'translate(-50%,-50%)',
                        }}
                        className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md pointer-events-none" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setMapperOpen(false)}>Cancel</Button>
              <Button onClick={saveFieldMap} disabled={savingMap} className="bg-purple-600 hover:bg-purple-700">
                {savingMap ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Field Map</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  )
}
