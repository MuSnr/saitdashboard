import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/Layout'
import { Plus, Trash2, Upload, File, X, Shield, Edit2, Loader2, RefreshCw, Link2, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  fetchInsuranceRecords, createInsuranceRecord, updateInsuranceRecord,
  deleteInsuranceRecord, getApiError,
} from '@/services/api'
import { useCampuses } from '@/context/CampusContext'
import { Link } from 'react-router-dom'

const insuranceClasses = [
  'Fire', 'Buildings Combined', 'Business All Risk', 'Electronic Equipment',
  'Theft Section', 'Business Interruption', 'Public Liability', 'Umbrella Liability',
  'Employers Liability', 'Sasria', 'Broker Fees', 'TWK Assist / Bystand',
]
const statuses = ['Active', 'Request Removal', 'Request Addition', 'Request Update', 'Removed', 'Insured']
const categories = ['Asset Based', 'Risk Based', 'Fees']

const statusColour = {
  Active:             'bg-green-100 text-green-700',
  Insured:            'bg-green-100 text-green-700',
  'Request Removal':  'bg-red-100 text-red-700',
  'Request Addition': 'bg-blue-100 text-blue-700',
  'Request Update':   'bg-amber-100 text-amber-700',
  Removed:            'bg-gray-100 text-gray-500',
}

const blank = {
  subsidiary: '', status: 'Active', monthYrAcquisition: '', classOfInsurance: '',
  assetOrInsurableRisk: '', descriptionDetails: '', brandModel: '', serialNumber: '',
  quantity: '1', unitCost: '', monthlyPremium: '', sumInsured: '', rate: '',
  december2025Premium: '', interestNoted: '', vendor: '', notes: '',
  category: 'Asset Based', policyReference: '',
}

export default function InsuranceRegister() {
  const { campuses, loading: campusLoading } = useCampuses()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form, setForm] = useState(blank)
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setF = (k) => (e) => set(k, e.target.value)

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

  // Build campus list: DB campuses + any that appear in existing records (for legacy data)
  const campusOptions = [
    ...new Set([
      ...campuses.map((c) => c.name),
      ...records.map((r) => r.subsidiary).filter(Boolean),
    ]),
  ].sort()

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
      december2025Premium: String(r.december2025Premium || ''), interestNoted: r.interestNoted || '',
      vendor: r.vendor || '', notes: r.notes || '', category: r.category || 'Asset Based',
      policyReference: r.policyReference || '',
    })
    setFiles([])
    setDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subsidiary || !form.classOfInsurance || !form.sumInsured) {
      toast.error('Subsidiary, class, and sum insured are required')
      return
    }
    setSubmitting(true)
    const payload = {
      ...form,
      quantity: Number(form.quantity) || 1,
      unitCost: Number(form.unitCost) || 0,
      monthlyPremium: Number(form.monthlyPremium) || 0,
      sumInsured: Number(form.sumInsured),
      rate: Number(form.rate) || 0,
      december2025Premium: Number(form.december2025Premium) || 0,
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

  const totalSumInsured = records.reduce((s, r) => s + (r.sumInsured || 0), 0)
  const totalMonthly = records.reduce((s, r) => s + (r.monthlyPremium || 0), 0)

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
            <Button onClick={openCreate}><Plus size={16} /> Add Record</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          {[
            { label: 'Total Records',    value: records.length,                                               color: 'text-nova-navy dark:text-white' },
            { label: 'Linked to Assets', value: records.filter((r) => r.linkedAssetId).length,                color: 'text-green-600' },
            { label: 'Not Linked (Ghost)', value: records.filter((r) => !r.linkedAssetId).length,             color: 'text-red-600' },
            { label: 'Total Sum Insured', value: `R ${totalSumInsured.toLocaleString()}`,                     color: 'text-nova-teal' },
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
        <Card className="overflow-hidden">
          <CardHeader className="py-4 border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="text-base">
              {loading ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</span> : `Records (${records.length})`}
            </CardTitle>
          </CardHeader>
          {!loading && records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Shield size={40} className="opacity-40" />
              <p className="font-medium">No records yet — click "Add Record" to start</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['Subsidiary', 'Status', 'Class', 'Description', 'Linked Asset', 'Sum Insured', 'Monthly Premium', 'Dec 2025 Premium', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {records.map((r) => (
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
                      <td className="px-4 py-3 font-semibold text-nova-teal text-xs tabular-nums">R {(r.sumInsured || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs tabular-nums">R {(r.monthlyPremium || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs tabular-nums">R {(r.december2025Premium || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(r._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editRecord ? 'Edit Insurance Record' : 'Add Insurance Record'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Subsidiary *</Label>
                <Select value={form.subsidiary} onValueChange={(v) => set('subsidiary', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={campusLoading ? 'Loading campuses…' : 'Select campus'} />
                  </SelectTrigger>
                  <SelectContent>
                    {campusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Month/Yr Acquisition</Label>
                <Input value={form.monthYrAcquisition} onChange={setF('monthYrAcquisition')} placeholder="Jan-2025" />
              </div>
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
              <div className="space-y-1.5">
                <Label>Policy Reference</Label>
                <Input value={form.policyReference} onChange={setF('policyReference')} placeholder="PIONE002/0001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Asset / Insurable Risk</Label>
                <Input value={form.assetOrInsurableRisk} onChange={setF('assetOrInsurableRisk')} placeholder="Building, Equipment…" />
              </div>
              <div className="space-y-1.5">
                <Label>Brand – Model</Label>
                <Input value={form.brandModel} onChange={setF('brandModel')} placeholder="Dell XPS 13" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description / Details</Label>
              <Textarea value={form.descriptionDetails} onChange={setF('descriptionDetails')} placeholder="Detailed description…" rows={2} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5"><Label>Serial Number</Label><Input value={form.serialNumber} onChange={setF('serialNumber')} placeholder="Serial #" /></div>
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={setF('quantity')} min="1" /></div>
              <div className="space-y-1.5"><Label>Unit Cost (R)</Label><Input type="number" value={form.unitCost} onChange={setF('unitCost')} step="0.01" /></div>
              <div className="space-y-1.5"><Label>Sum Insured (R) *</Label><Input type="number" value={form.sumInsured} onChange={setF('sumInsured')} step="0.01" required /></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5"><Label>Monthly Premium (R)</Label><Input type="number" value={form.monthlyPremium} onChange={setF('monthlyPremium')} step="0.01" /></div>
              <div className="space-y-1.5"><Label>Rate (%)</Label><Input type="number" value={form.rate} onChange={setF('rate')} step="0.01" /></div>
              <div className="space-y-1.5"><Label>Dec 2025 Premium</Label><Input type="number" value={form.december2025Premium} onChange={setF('december2025Premium')} step="0.01" /></div>
              <div className="space-y-1.5"><Label>Vendor</Label><Input value={form.vendor} onChange={setF('vendor')} placeholder="Vendor" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Interest Noted</Label><Input value={form.interestNoted} onChange={setF('interestNoted')} /></div>
              <div className="space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={setF('notes')} /></div>
            </div>

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
