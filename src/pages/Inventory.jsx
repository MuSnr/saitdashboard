import { Layout } from '@/components/Layout'
import { Search, Loader2 } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { fetchAssets } from '@/services/api'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const statusVariant = { Insured: 'default', 'Request Removal': 'orange', 'Request Addition': 'info', Stolen: 'destructive' }

export default function Inventory() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [campus, setCampus] = useState('all')
  const [cls, setCls] = useState('all')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    fetchAssets().then((d) => { setAssets(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const filtered = useMemo(() => assets.filter((a) => {
    const q = search.toLowerCase()
    const matchSearch = !q || [a.serialNumber, a.assetId, a.description, a.campus].some((f) => f?.toLowerCase().includes(q))
    return matchSearch
      && (campus === 'all' || a.campus === campus)
      && (cls === 'all' || a.class === cls)
      && (status === 'all' || a.status === status)
  }), [assets, search, campus, cls, status])

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={40} className="animate-spin text-nova-green" />
          <p className="text-gray-500 dark:text-gray-400">Loading inventory…</p>
        </div>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Asset Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400">Serial-level inventory tracking for all equipment</p>
        </div>

        {/* Filters */}
        <Card className="p-5">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input className="pl-9" placeholder="Search by serial, asset ID, campus…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={campus} onValueChange={setCampus}>
              <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Campus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                {['Ruimsig','Paulshof','Midrand','Boksburg','North Riding'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cls} onValueChange={setCls}>
              <SelectTrigger className="w-full lg:w-52"><SelectValue placeholder="Insurance Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {['Fire','Buildings Combined','Business All Risk','Electronic Equipment'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full lg:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {['Insured','Request Removal','Request Addition','Stolen'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-nova-navy dark:text-white text-sm">Results</h2>
            <span className="text-xs text-gray-400">{filtered.length} {filtered.length === 1 ? 'item' : 'items'}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Search size={40} className="opacity-40" />
              <p className="font-medium">{assets.length === 0 ? 'No assets yet — connect backend or add via Data Entry' : 'No results for your filters'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['Asset ID','Serial #','Description','Campus','Class','Status','Unit Cost','Qty','Last Verified'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-nova-navy dark:text-white">{a.assetId}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{a.serialNumber}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[180px] truncate">{a.description}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.campus}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.class}</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant[a.status] || 'secondary'}>{a.status}</Badge></td>
                      <td className="px-4 py-3 font-semibold text-nova-navy dark:text-white">R {a.unitCost?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.quantity}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{a.lastVerified || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
