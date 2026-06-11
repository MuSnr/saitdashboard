import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Plus, Upload, X, Trash2, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const campuses = ['Ruimsig', 'Paulshof', 'Midrand', 'Boksburg', 'North Riding']
const classes  = ['Fire', 'Buildings Combined', 'Business All Risk', 'Electronic Equipment']

const blank = { subsidiary: '', class: '', description: '', serialNumber: '', unitCost: '', quantity: '1' }

export default function DataEntry() {
  const [assets, setAssets] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.subsidiary || !form.class || !form.description || !form.serialNumber || !form.unitCost) {
      toast.error('Please fill in all required fields')
      return
    }
    setAssets((p) => [{
      id: `AST-${Date.now()}`,
      subsidiary: form.subsidiary,
      class: form.class,
      description: form.description,
      serialNumber: form.serialNumber,
      unitCost: Number(form.unitCost),
      quantity: Number(form.quantity) || 1,
    }, ...p])
    setForm(blank)
    setDialogOpen(false)
    toast.success('Asset added successfully')
  }

  const handleBulkUpload = async () => {
    if (!uploadFile) { toast.error('Please select a file'); return }
    setUploading(true)
    await new Promise((r) => setTimeout(r, 1500))
    setAssets((p) => [
      { id: 'AST-BULK-001', subsidiary: 'Ruimsig',   class: 'Electronic Equipment', description: 'Dell Laptop XPS 13',   serialNumber: 'DL-XPS-2025-001', unitCost: 25000, quantity: 50 },
      { id: 'AST-BULK-002', subsidiary: 'Paulshof',   class: 'Electronic Equipment', description: 'Google Chromebook',    serialNumber: 'CH-GB-2025-001',  unitCost: 8500,  quantity: 100 },
      { id: 'AST-BULK-003', subsidiary: 'Midrand',    class: 'Business All Risk',    description: 'Wheelchair – Motorized', serialNumber: 'WH-MOT-2025-001', unitCost: 65000, quantity: 5 },
      ...p,
    ])
    setUploadFile(null)
    setUploading(false)
    toast.success('Imported 3 sample assets from spreadsheet')
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Data Entry</h1>
            <p className="text-gray-500 dark:text-gray-400">Add new assets manually or import via spreadsheet</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} /> Add Asset
          </Button>
        </div>

        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>

          {/* Manual tab */}
          <TabsContent value="manual">
            {assets.length === 0 ? (
              <Card
                className="border-dashed border-2 cursor-pointer hover:border-nova-green transition-colors"
                onClick={() => setDialogOpen(true)}
              >
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 bg-nova-green/10 rounded-2xl flex items-center justify-center">
                    <Plus size={32} className="text-nova-green" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-nova-navy dark:text-white mb-1">Click to add your first asset</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter asset details manually</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <CardHeader className="flex-row items-center justify-between py-4">
                  <CardTitle className="text-base">Recent Assets ({assets.length})</CardTitle>
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus size={14} /> Add More
                  </Button>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        {['Asset ID', 'Campus', 'Class', 'Description', 'Serial #', 'Unit Cost', 'Qty', ''].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {assets.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-nova-navy dark:text-white">{a.id}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.subsidiary}</td>
                          <td className="px-4 py-3"><Badge variant="info">{a.class}</Badge></td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[180px] truncate">{a.description}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.serialNumber}</td>
                          <td className="px-4 py-3 font-semibold text-nova-navy dark:text-white">R {a.unitCost.toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.quantity}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setAssets((p) => p.filter((x) => x.id !== a.id)); toast.success('Asset removed') }}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Bulk tab */}
          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Import Spreadsheet</CardTitle>
                <CardDescription>Upload an Excel or CSV file with your assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
                  <FileSpreadsheet size={36} className="text-nova-green" />
                  <div className="text-center">
                    <p className="font-medium text-nova-navy dark:text-white">
                      {uploadFile ? uploadFile.name : 'Click to select file or drag & drop'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Excel (.xlsx, .xls) and CSV supported</p>
                  </div>
                  {uploadFile && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setUploadFile(null) }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                  <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <strong>Expected columns:</strong> Subsidiary, Class, Description, Serial Number, Unit Cost, Quantity
                </p>
                <Button onClick={handleBulkUpload} disabled={!uploadFile || uploading} variant="secondary" className="w-full">
                  {uploading ? <><span className="animate-spin mr-2">⏳</span> Importing…</> : <><Upload size={16} /> Upload & Import</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add asset dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campus *</Label>
                <Select value={form.subsidiary} onValueChange={(v) => set('subsidiary', v)}>
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>{campuses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Insurance Class *</Label>
                <Select value={form.class} onValueChange={(v) => set('class', v)}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Item Description *</Label>
              <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g., Dell Laptop XPS 13" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Serial Number *</Label>
                <Input value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} placeholder="SN-2025-001" required />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Cost (R) *</Label>
                <Input type="number" value={form.unitCost} onChange={(e) => set('unitCost', e.target.value)} placeholder="0.00" step="0.01" min="0" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} min="1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Asset</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
