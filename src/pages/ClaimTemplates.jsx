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
    // Use proxy URL so auth token is sent — avoids Cloudinary 401
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
    // A4 = 210mm × 297mm
    const xMm = xPct * 210
    const yMm = yPct * 297

    if (activeKey === '__signature__') {
      setSigField((s) => ({ ...s, page: mapperPage, x: Math.round(xMm), y: Math.round(yMm) }))
      toast.success(`Signature placed at (${Math.round(xMm)}, ${Math.round(yMm)}) mm`)
    } else {
      const label = FIELD_KEYS.find((f) => f.key === activeKey)?.label || activeKey
      setFieldMap((prev) => {
        const filtered = prev.filter((f) => f.key !== activeKey)
        return [...filtered, { key: activeKey, label, page: mapperPage, x: Math.round(xMm), y: Math.round(yMm), fontSize: 9, fontStyle: 'normal', maxWidth: 60 }]
      })
      toast.success(`"${label}" mapped to (${Math.round(xMm)}, ${Math.round(yMm)}) mm`)
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
                  <a href={t.cloudinaryUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-nova-teal hover:underline flex items-center gap-1">
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
              <DialogDescription>Select a field, then click on the PDF where that value should appear.</DialogDescription>
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
                {pdfImgUrl ? (
                  <div className="relative border border-gray-300 rounded-lg overflow-hidden cursor-crosshair"
                    style={{ maxHeight: '65vh' }}>
                    <img ref={canvasRef} src={pdfImgUrl} alt="PDF preview" className="w-full" onClick={handleMapperClick} />
                    {/* Overlay dots for mapped fields */}
                    {fieldMap.filter(f => f.page === mapperPage).map((f) => (
                      <div key={f.key} title={f.label}
                        style={{ position:'absolute', left:`${(f.x/210)*100}%`, top:`${(f.y/297)*100}%`, transform:'translate(-50%,-50%)' }}
                        className="w-3 h-3 rounded-full bg-purple-500 border-2 border-white shadow-md pointer-events-none" />
                    ))}
                    {sigField.page === mapperPage && (
                      <div title="Signature" style={{ position:'absolute', left:`${(sigField.x/210)*100}%`, top:`${(sigField.y/297)*100}%`, transform:'translate(-50%,-50%)' }}
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
