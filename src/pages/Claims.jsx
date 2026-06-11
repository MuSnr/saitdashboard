import { Layout } from '@/components/Layout'
import { Plus, Trash2, ExternalLink, FileText, Upload, File, X, Loader2, Filter } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { fetchClaims, createClaim, deleteClaim } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const statusVariant = { 'Paid Out': 'default', Pending: 'warning', Rejected: 'destructive', Withdrawn: 'secondary' }
const campuses = ['Ruimsig','Paulshof','Midrand','Boksburg','North Riding']

export default function Claims() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({ subsidiary: '', dateOfIncident: '', dateOfSubmission: '', description: '' })
  const [filters, setFilters] = useState({ status: 'all', subsidiary: 'all', year: 'all' })

  useEffect(() => {
    fetchClaims().then((d) => { setClaims(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const years = useMemo(() => [...new Set(claims.map((c) => new Date(c.dateOfIncident).getFullYear().toString()))].sort().reverse(), [claims])

  const filtered = useMemo(() => claims.filter((c) => {
    const yr = new Date(c.dateOfIncident).getFullYear().toString()
    return (filters.status === 'all' || c.claimStatus === filters.status)
      && (filters.subsidiary === 'all' || c.subsidiary === filters.subsidiary)
      && (filters.year === 'all' || yr === filters.year)
  }), [claims, filters])

  const stats = useMemo(() => ({
    total: filtered.length,
    paidOut: filtered.filter((c) => c.claimStatus === 'Paid Out').length,
    rejected: filtered.filter((c) => c.claimStatus === 'Rejected').length,
    pending: filtered.filter((c) => c.claimStatus === 'Pending').length,
    totalValue: filtered.reduce((s, c) => s + (c.claimValue || 0), 0),
    paidOutValue: filtered.filter((c) => c.claimStatus === 'Paid Out').reduce((s, c) => s + c.claimValue, 0),
  }), [filtered])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subsidiary || !form.dateOfIncident || !form.dateOfSubmission || !form.description) {
      toast.error('All fields are required'); return
    }
    const claim = {
      id: `${claims.length + 1}`,
      claimId: `CLM-${new Date(form.dateOfIncident).getFullYear()}-${String(claims.length + 1).padStart(3,'0')}`,
      claimStatus: 'Pending',
      subsidiary: form.subsidiary,
      dateOfIncident: form.dateOfIncident,
      dateOfSubmission: form.dateOfSubmission,
      dateOfSettlement: null,
      claimValue: 0,
      description: form.description,
      notes: '', incidentFormLink: '', claimFormLink: '', dischargeVoucherLink: '', folderLink: '',
    }
    try {
      await createClaim(claim)
    } catch { /* backend not connected */ }
    setClaims((p) => [claim, ...p])
    setForm({ subsidiary: '', dateOfIncident: '', dateOfSubmission: '', description: '' })
    setFiles([]); setDialogOpen(false)
    toast.success('Claim submitted successfully')
  }

  const handleDelete = async (id) => {
    try { await deleteClaim(id) } catch { /* backend not connected */ }
    setClaims((p) => p.filter((c) => c.id !== id))
    toast.success('Claim deleted')
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Claims Pipeline</h1>
            <p className="text-gray-500 dark:text-gray-400">Track and manage insurance claims end-to-end</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}><Plus size={16} /> New Claim</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Claims',  value: stats.total,     sub: `R ${stats.totalValue.toLocaleString()}`,    color: 'text-nova-navy dark:text-white' },
            { label: 'Paid Out',      value: stats.paidOut,   sub: `R ${stats.paidOutValue.toLocaleString()}`,  color: 'text-nova-green' },
            { label: 'Rejected',      value: stats.rejected,  sub: 'Not approved',                              color: 'text-red-600' },
            { label: 'Pending',       value: stats.pending,   sub: 'In progress',                               color: 'text-yellow-600' },
          ].map(({ label, value, sub, color }) => (
            <Card key={label}><CardContent className="p-5"><p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p><p className={`text-3xl font-bold ${color}`}>{value}</p><p className="text-xs text-gray-400 mt-1">{sub}</p></CardContent></Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><Filter size={16} className="text-gray-500" /><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter Claims</span></div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem>{['Paid Out','Withdrawn','Rejected','Pending'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.subsidiary} onValueChange={(v) => setFilters((p) => ({ ...p, subsidiary: v }))}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Subsidiary" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Campuses</SelectItem>{campuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.year} onValueChange={(v) => setFilters((p) => ({ ...p, year: v }))}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Years</SelectItem>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
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
                  {['Claim ID','Status','Campus','Incident Date','Submission','Description','Value','Docs',''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    {claims.length === 0 ? 'No claims yet — submit your first claim' : 'No claims match your filters'}
                  </td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-nova-navy dark:text-white">{c.claimId}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant[c.claimStatus]||'secondary'}>{c.claimStatus}</Badge></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.subsidiary}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{c.dateOfIncident}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{c.dateOfSubmission}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[180px] truncate text-xs">{c.description||c.notes}</td>
                    <td className="px-4 py-3 font-semibold text-nova-navy dark:text-white">{c.claimValue > 0 ? `R ${c.claimValue.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {c.incidentFormLink && <a href={c.incidentFormLink} target="_blank" rel="noopener noreferrer" className="p-1 text-nova-teal hover:bg-nova-teal/10 rounded transition-colors" title="Incident Form"><FileText size={14} /></a>}
                        {c.folderLink && <a href={c.folderLink} target="_blank" rel="noopener noreferrer" className="p-1 text-nova-teal hover:bg-nova-teal/10 rounded transition-colors" title="Folder"><ExternalLink size={14} /></a>}
                        {!c.incidentFormLink && !c.folderLink && <span className="text-gray-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submit New Claim</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campus *</Label>
                <Select value={form.subsidiary} onValueChange={(v) => setForm((p) => ({ ...p, subsidiary: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>{campuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Incident *</Label>
                <Input type="date" value={form.dateOfIncident} onChange={(e) => setForm((p) => ({ ...p, dateOfIncident: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Submission *</Label>
              <Input type="date" value={form.dateOfSubmission} onChange={(e) => setForm((p) => ({ ...p, dateOfSubmission: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe the claim…" rows={3} required />
            </div>
            {/* File upload */}
            <div className="space-y-2">
              <Label>Claim Documents</Label>
              <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-5 cursor-pointer hover:border-nova-green transition-colors bg-gray-50 dark:bg-gray-800/30">
                <Upload size={22} className="text-nova-green" /><p className="text-sm text-gray-500 dark:text-gray-400">Click to upload</p>
                <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xlsx,.jpg,.png,.zip" onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files||[])])} />
              </label>
              {files.map((f,i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-nova-green/10 border border-nova-green/30 rounded-lg">
                  <div className="flex items-center gap-2"><File size={14} className="text-nova-green" /><span className="text-xs truncate max-w-[200px]">{f.name}</span></div>
                  <button type="button" onClick={() => setFiles((p) => p.filter((_,j)=>j!==i))} className="text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors"><X size={14} /></button>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Claim</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
