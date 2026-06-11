import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Plus, Trash2, Upload, File, X, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const insuranceClasses = ['Fire','Buildings Combined','Business All Risk','Electronic Equipment','Theft Section','Business Interruption','Public Liability','Umbrella Liability','Employers Liability','Sasria','Broker Fees','TWK Assist / Bystand']
const statuses = ['Active','Request Removal','Request Addition','Request Update','Removed','Insured']
const categories = ['Asset Based','Risk Based','Fees']
const subsidiaries = ['Ruimsig','Paulshof','Midrand','Boksburg','North Riding','Ormonde Fonteney','Ormonde & Vumela','Midrand Matuka','Midrand Halfway Gardens']

const blank = { subsidiary:'',status:'Active',monthYrAcquisition:'',classOfInsurance:'',assetOrInsurableRisk:'',descriptionDetails:'',brandModel:'',serialNumber:'',quantity:'1',unitCost:'',monthlyPremium:'',sumInsured:'',rate:'',december2025Premium:'',interestNoted:'',vendor:'',notes:'',category:'Asset Based',policyReference:'' }

const statusVariant = { Active:'default', Insured:'default', 'Request Removal':'destructive', 'Request Addition':'info', 'Request Update':'warning', Removed:'secondary' }

export default function InsuranceRegister() {
  const [records, setRecords] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [files, setFiles] = useState([])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setF = (k) => (e) => set(k, e.target.value)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.subsidiary || !form.classOfInsurance || !form.sumInsured) {
      toast.error('Subsidiary, class, and sum insured are required')
      return
    }
    setRecords((p) => [{ ...form, id: `INS-${Date.now()}`, quantity: +form.quantity||1, unitCost: +form.unitCost||0, monthlyPremium: +form.monthlyPremium||0, sumInsured: +form.sumInsured, rate: +form.rate||0, december2025Premium: +form.december2025Premium||0 }, ...p])
    setForm(blank); setFiles([])
    setDialogOpen(false)
    toast.success('Insurance record added')
  }

  const totalSumInsured = records.reduce((s, r) => s + r.sumInsured, 0)
  const totalMonthly = records.reduce((s, r) => s + r.monthlyPremium, 0)

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Insurance Register</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage sum insured — reconcile against asset registry</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}><Plus size={16} /> Add Record</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: 'Total Records',    value: records.length,                                       color: 'text-nova-navy dark:text-white' },
            { label: 'Total Sum Insured',value: `R ${totalSumInsured.toLocaleString()}`,              color: 'text-nova-teal' },
            { label: 'Monthly Premium',  value: `R ${totalMonthly.toLocaleString('en-ZA',{maximumFractionDigits:2})}`, color: 'text-nova-green' },
          ].map(({ label, value, color }) => (
            <Card key={label}><CardContent className="p-6"><p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p><p className={`text-3xl font-bold ${color}`}>{value}</p></CardContent></Card>
          ))}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="py-4 border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="text-base">Records ({records.length})</CardTitle>
          </CardHeader>
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Shield size={40} className="opacity-40" />
              <p className="font-medium">No records yet — click "Add Record" to start</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['Subsidiary','Status','Class','Description','Sum Insured','Monthly Premium','Dec 2025 Premium',''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.subsidiary}</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant[r.status]||'secondary'}>{r.status}</Badge></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.classOfInsurance}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[180px] truncate">{r.descriptionDetails||r.assetOrInsurableRisk||'—'}</td>
                      <td className="px-4 py-3 font-semibold text-nova-teal">R {r.sumInsured.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">R {r.monthlyPremium.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">R {r.december2025Premium.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setRecords((p) => p.filter((x) => x.id !== r.id)); toast.success('Record deleted') }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Insurance Record</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Subsidiary *</Label>
                <Select value={form.subsidiary} onValueChange={(v) => set('subsidiary', v)}>
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>{subsidiaries.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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

            {/* File upload */}
            <div className="space-y-2">
              <Label>Upload Documents</Label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
                <Upload size={24} className="text-nova-green" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload or drag & drop</p>
                <p className="text-xs text-gray-400">PDF, DOC, Excel, JPG, PNG, ZIP</p>
                <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.zip" onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files||[])])} />
              </label>
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-nova-green/10 border border-nova-green/30 rounded-lg">
                  <div className="flex items-center gap-2"><File size={15} className="text-nova-green" /><span className="text-sm text-nova-navy dark:text-white truncate max-w-[220px]">{f.name}</span><span className="text-xs text-gray-400">{(f.size/1024).toFixed(1)}KB</span></div>
                  <button type="button" onClick={() => setFiles((p) => p.filter((_,j)=>j!==i))} className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"><X size={15} /></button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setForm(blank); setFiles([]) }}>Cancel</Button>
              <Button type="submit">Add Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
