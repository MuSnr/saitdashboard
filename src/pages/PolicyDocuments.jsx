import { Layout } from '@/components/Layout'
import { Plus, Download, Trash2, Search, Upload, File, X, Loader2, RefreshCw, FileSpreadsheet } from 'lucide-react'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  fetchPolicies, createPolicy, deletePolicy,
  bulkImportPolicies, downloadPoliciesTemplate, getApiError,
} from '@/services/api'
import { useCampuses } from '@/context/CampusContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const blankForm = { ref: '', version: '', subsidiary: '', policyReference: '', effectiveDate: '', anniversary: '', documentLink: '', premiumValue: '', notes: '' }

export default function PolicyDocuments() {
  const { campuses: campusList } = useCampuses()
  const [policies, setPolicies]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch]       = useState('')
  const [subFilter, setSubFilter] = useState('all')
  const [files, setFiles]         = useState([])
  const [form, setForm]           = useState(blankForm)
  const [submitting, setSubmitting] = useState(false)

  // bulk
  const [bulkFile,      setBulkFile]      = useState(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult,    setBulkResult]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await fetchPolicies(); setPolicies(Array.isArray(data) ? data : []) }
    catch (err) { toast.error(getApiError(err)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return policies.filter((p) => {
      const matchSearch = !q || [p.ref, p.policyReference, p.subsidiary, p.notes].some((f) => f?.toLowerCase().includes(q))
      return matchSearch && (subFilter === 'all' || p.subsidiary === subFilter)
    })
  }, [policies, search, subFilter])

  const totalPremium = filtered.reduce((s, p) => s + (p.premiumValue || 0), 0)
  const avgPremium   = filtered.length ? totalPremium / filtered.length : 0

  const openCreate = () => { setForm(blankForm); setFiles([]); setDialogOpen(true) }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.ref || !form.version || !form.subsidiary || !form.premiumValue) {
      toast.error('Ref, version, campus and premium are required'); return
    }
    setSubmitting(true)
    try {
      const data = await createPolicy({ ...form, premiumValue: Number(form.premiumValue) })
      setPolicies((p) => [data.policy, ...p])
      setForm(blankForm); setFiles([]); setDialogOpen(false)
      toast.success('Policy document added')
    } catch (err) { toast.error(getApiError(err)) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this policy document?')) return
    try { await deletePolicy(id); setPolicies((p) => p.filter((x) => x._id !== id)); toast.success('Policy deleted') }
    catch (err) { toast.error(getApiError(err)) }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadPoliciesTemplate()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'policies-template.xlsx'; a.click(); URL.revokeObjectURL(url)
    } catch (err) { toast.error(getApiError(err)) }
  }

  const handleBulkUpload = async () => {
    if (!bulkFile) { toast.error('Please select a file'); return }
    setBulkUploading(true); setBulkResult(null)
    try {
      const fd = new FormData(); fd.append('file', bulkFile)
      const result = await bulkImportPolicies(fd)
      setBulkResult(result)
      if (result.inserted > 0) { toast.success(`${result.inserted} polic${result.inserted !== 1 ? 'ies' : 'y'} imported`); await load() }
      if (result.errors > 0)   toast.warning(`${result.errors} row${result.errors !== 1 ? 's' : ''} had errors`)
    } catch (err) { toast.error(getApiError(err)) }
    finally { setBulkFile(null); setBulkUploading(false) }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA') : '—'

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={40} className="animate-spin text-nova-green" />
          <p className="text-gray-500 dark:text-gray-400">Loading policies…</p>
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
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Policy Documents</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage insurance policy documents and premium valuations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
            <Button onClick={openCreate}><Plus size={16} /> Add Policy</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Policies',   value: filtered.length, color: 'text-nova-navy dark:text-white' },
            { label: 'Total Premium',    value: `R ${totalPremium.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`, color: 'text-nova-green' },
            { label: 'Average Premium',  value: `R ${avgPremium.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`,   color: 'text-nova-teal' },
          ].map(({ label, value, color }) => (
            <Card key={label}><CardContent className="p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">Policy List</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>

          {/* List tab */}
          <TabsContent value="list" className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input className="pl-9" placeholder="Search by ref, policy reference, or campus…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={subFilter} onValueChange={setSubFilter}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Campus" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campuses</SelectItem>
                    {campusList.map((c) => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
                <span className="font-semibold text-nova-navy dark:text-white text-sm">Policy Documents ({filtered.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      {['Ref','Version','Campus','Policy Ref','Effective','Anniversary','Premium','Doc','Notes',''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                        {policies.length === 0 ? 'No policies yet — add your first policy document' : 'No results for your filters'}
                      </td></tr>
                    ) : filtered.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-nova-navy dark:text-white">{p.ref}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.version}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.subsidiary}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{p.policyReference || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{formatDate(p.effectiveDate)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{formatDate(p.anniversary)}</td>
                        <td className="px-4 py-3 font-semibold text-nova-green">R {(p.premiumValue || 0).toLocaleString('en-ZA', { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3">
                          {p.documentLink
                            ? <a href={p.documentLink} target="_blank" rel="noopener noreferrer" className="p-1.5 text-nova-teal hover:bg-nova-teal/10 rounded inline-flex"><Download size={15} /></a>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{p.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDelete(p._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
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
                    <CardTitle>Bulk Import Policies</CardTitle>
                    <CardDescription>Upload an Excel or CSV file to import multiple policy records at once.</CardDescription>
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

                <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Required columns</p>
                  <div className="grid grid-cols-2 gap-x-4">
                    {[['Ref # *','required'],['Version *','required'],['Campus *','required'],['Premium Value (R) *','required'],['Policy Reference','optional'],['Effective Date','YYYY-MM-DD'],['Anniversary Date','YYYY-MM-DD'],['Document Link','optional URL'],['Notes','optional']].map(([col, hint]) => (
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
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">{bulkResult.inserted} imported</span>
                      </div>
                      {bulkResult.errors > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-sm font-semibold text-red-700 dark:text-red-400">{bulkResult.errors} errors</span>
                        </div>
                      )}
                    </div>
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

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Policy Document</DialogTitle>
            <DialogDescription>All fields marked * are required.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Reference # *</Label><Input value={form.ref} onChange={(e) => setForm((p) => ({ ...p, ref: e.target.value }))} placeholder="001" required /></div>
              <div className="space-y-1.5"><Label>Version *</Label><Input value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} placeholder="V001" required /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Campus *</Label>
              <Select value={form.subsidiary} onValueChange={(v) => setForm((p) => ({ ...p, subsidiary: v }))}>
                <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                <SelectContent>{campusList.map((c) => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Policy Reference</Label><Input value={form.policyReference} onChange={(e) => setForm((p) => ({ ...p, policyReference: e.target.value }))} placeholder="POL-2025-001" /></div>
              <div className="space-y-1.5"><Label>Premium Value (R) *</Label><Input type="number" value={form.premiumValue} onChange={(e) => setForm((p) => ({ ...p, premiumValue: e.target.value }))} step="0.01" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Effective Date</Label><Input type="date" value={form.effectiveDate} onChange={(e) => setForm((p) => ({ ...p, effectiveDate: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Anniversary Date</Label><Input type="date" value={form.anniversary} onChange={(e) => setForm((p) => ({ ...p, anniversary: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Document Link</Label><Input type="url" value={form.documentLink} onChange={(e) => setForm((p) => ({ ...p, documentLink: e.target.value }))} placeholder="https://drive.google.com/…" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            <div className="space-y-2">
              <Label>Upload Documents</Label>
              <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-5 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
                <Upload size={22} className="text-nova-green" /><p className="text-sm text-gray-500">Click to upload</p>
                <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xlsx,.jpg,.png" onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files || [])])} />
              </label>
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-nova-green/10 border border-nova-green/30 rounded-lg">
                  <div className="flex items-center gap-2"><File size={14} className="text-nova-green" /><span className="text-xs truncate max-w-[200px]">{f.name}</span></div>
                  <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-red-500 p-0.5 rounded hover:bg-red-50"><X size={14} /></button>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Add Policy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
