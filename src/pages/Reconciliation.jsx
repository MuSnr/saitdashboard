import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/Layout'
import {
  RefreshCw, Loader2, Link2, Unlink, Zap, AlertTriangle,
  CheckCircle2, ShieldOff, Search, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  fetchReconciliation, linkRecords, unlinkRecord,
  runAutoLink, fetchLinkSuggestions, getApiError,
} from '@/services/api'
import { useCampuses } from '@/context/CampusContext'
import { useAuth } from '@/context/AuthContext'

const fmt = (n) => Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const INSURANCE_CLASSES = [
  'Fire', 'Buildings Combined', 'Business All Risk', 'Electronic Equipment',
  'Theft Section', 'Business Interruption', 'Public Liability', 'Umbrella Liability',
  'Employers Liability', 'Sasria', 'Broker Fees', 'TWK Assist / Bystand',
]

const statusColour = {
  'Insured':          'bg-green-100 text-green-700',
  'Request Removal':  'bg-red-100 text-red-700',
  'Request Addition': 'bg-blue-100 text-blue-700',
  'Not Insured':      'bg-gray-100 text-gray-500',
  'Stolen':           'bg-red-200 text-red-800',
  'Active':           'bg-green-100 text-green-700',
  'Removed':          'bg-gray-100 text-gray-500',
}

// ── Section toggle card ───────────────────────────────────────────────────────
function Section({ title, icon: Icon, count, accent, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
            <Icon size={16} className="text-white" />
          </div>
          <span className="font-semibold text-nova-navy dark:text-white text-sm">{title}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {count}
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 dark:border-gray-800">{children}</div>}
    </Card>
  )
}

export default function Reconciliation() {
  const { isAdmin } = useAuth()
  const { campuses } = useCampuses()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subsidiary, setSubsidiary] = useState('all')
  const [insuranceClass, setInsuranceClass] = useState('all')

  // Link dialog
  const [linkDialog, setLinkDialog] = useState({ open: false, asset: null })
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [linking, setLinking] = useState(false)

  // Auto-link
  const [autoLinking, setAutoLinking] = useState(false)

  // Search within sections
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (subsidiary !== 'all') params.subsidiary = subsidiary
      if (insuranceClass !== 'all') params.insuranceClass = insuranceClass
      const result = await fetchReconciliation(params)
      setData(result)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [subsidiary, insuranceClass])

  useEffect(() => { load() }, [load])

  // ── Open the link dialog for an uninsured asset ───────────────────────────
  const openLinkDialog = async (asset) => {
    setLinkDialog({ open: true, asset })
    setLoadingSuggestions(true)
    setSuggestions([])
    try {
      const result = await fetchLinkSuggestions(asset.assetId)
      setSuggestions(result)
    } catch {
      setSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }

  // ── Manually link ─────────────────────────────────────────────────────────
  const handleLink = async (insuranceRecordId) => {
    if (!linkDialog.asset) return
    setLinking(true)
    try {
      await linkRecords(linkDialog.asset.assetId, insuranceRecordId)
      toast.success('Linked successfully — insurance status updated on the asset')
      setLinkDialog({ open: false, asset: null })
      await load()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLinking(false)
    }
  }

  // ── Unlink ────────────────────────────────────────────────────────────────
  const handleUnlink = async (assetId, assetCode) => {
    if (!window.confirm(`Unlink Asset ${assetCode} from its insurance record? The asset status will become "Not Insured".`)) return
    try {
      await unlinkRecord(assetId)
      toast.success('Records unlinked')
      await load()
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  // ── Auto-link all ─────────────────────────────────────────────────────────
  const handleAutoLink = async () => {
    setAutoLinking(true)
    try {
      const result = await runAutoLink()
      toast.success(result.message)
      await load()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setAutoLinking(false)
    }
  }

  const q = search.toLowerCase()
  const filterRow = (row) => {
    if (!q) return true
    return [
      row.assetCode, row.description, row.assetDescription, row.subsidiary,
      row.serialNumber, row.insuranceClass,
    ].some((f) => f?.toLowerCase().includes(q))
  }

  const matched         = (data?.matched          || []).filter(filterRow)
  const ghostItems      = (data?.ghostItems        || []).filter(filterRow)
  const uninsuredAssets = (data?.uninsuredAssets   || []).filter(filterRow)

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Reconciliation</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Match your asset register against what the insurer has on record — find gaps and ghost items
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} />
            </Button>
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAutoLink}
                disabled={autoLinking || loading}
              >
                {autoLinking
                  ? <><Loader2 size={14} className="animate-spin" /> Linking…</>
                  : <><Zap size={14} /> Auto-Link All</>}
              </Button>
            )}
          </div>
        </div>

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={subsidiary} onValueChange={setSubsidiary}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Campuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                {campuses.map((c) => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={insuranceClass} onValueChange={setInsuranceClass}>
              <SelectTrigger className="w-56"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {INSURANCE_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search by description, serial, campus…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ── Summary stats ─────────────────────────────────────────────── */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Matched',                value: data.summary.matchedCount,         colour: 'text-green-600',  sub: 'Linked both sides' },
              { label: 'Ghost Items',             value: data.summary.ghostItemsCount,      colour: 'text-red-600',    sub: 'Insurance only — no asset' },
              { label: 'Uninsured Assets',        value: data.summary.uninsuredAssetsCount, colour: 'text-amber-600',  sub: 'Asset only — no cover' },
              { label: 'Monthly Premiums at Risk',value: `R ${fmt(data.summary.totalMonthlyAtRisk)}`, colour: 'text-red-600', sub: 'Paid for ghost items' },
              { label: 'Uninsured Asset Value',   value: `R ${fmt(data.summary.totalUninsuredValue)}`, colour: 'text-amber-600', sub: 'Assets with no cover' },
            ].map(({ label, value, colour, sub }) => (
              <Card key={label}><CardContent className="p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className={`text-xl font-bold ${colour}`}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
              </CardContent></Card>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={32} className="animate-spin text-nova-green" />
            <p className="text-sm font-medium">Loading reconciliation data…</p>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-4">

            {/* ── GHOST ITEMS: Insurance but no Asset ─────────────────── */}
            <Section
              title="Ghost Items — You're paying insurance for these but they're NOT in your asset register"
              icon={AlertTriangle}
              count={ghostItems.length}
              accent="bg-red-500"
              defaultOpen={true}
            >
              {ghostItems.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">No ghost items — all insurance records have a matching asset.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-red-50 dark:bg-red-900/10 border-b border-gray-100 dark:border-gray-800">
                        {['Campus', 'Class', 'Description', 'Serial #', 'Sum Insured', 'Monthly Premium', 'Status', 'Action'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {ghostItems.map((g) => (
                        <tr key={g.insuranceRecordId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{g.subsidiary}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{g.insuranceClass}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[180px] truncate" title={g.description}>{g.description || '—'}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{g.serialNumber || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-nova-teal text-xs tabular-nums">R {fmt(g.sumInsured)}</td>
                          <td className="px-4 py-3 text-red-600 font-semibold text-xs tabular-nums">R {fmt(g.monthlyPremium)}/mo</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColour[g.status] || 'bg-gray-100 text-gray-600'}`}>
                              {g.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] text-gray-400 italic">Add asset to register to link</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* ── UNINSURED ASSETS: Asset but no Insurance ────────────── */}
            <Section
              title="Uninsured Assets — These are in your asset register but have NO insurance cover"
              icon={ShieldOff}
              count={uninsuredAssets.length}
              accent="bg-amber-500"
              defaultOpen={true}
            >
              {uninsuredAssets.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">All assets have insurance coverage.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-amber-50 dark:bg-amber-900/10 border-b border-gray-100 dark:border-gray-800">
                        {['Asset ID', 'Campus', 'Class', 'Description', 'Serial #', 'Asset Value', 'Status', 'Action'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {uninsuredAssets.map((a) => (
                        <tr key={a.assetId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{a.assetCode}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{a.subsidiary}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{a.insuranceClass}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[180px] truncate" title={a.description}>{a.description}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{a.serialNumber || '—'}</td>
                          <td className="px-4 py-3 font-semibold text-nova-navy dark:text-white text-xs tabular-nums">R {fmt(a.assetValue)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColour[a.insuranceStatus] || 'bg-gray-100 text-gray-600'}`}>
                              {a.insuranceStatus || 'Not Insured'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5"
                              onClick={() => openLinkDialog(a)}
                            >
                              <Link2 size={12} /> Link to Insurance
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* ── MATCHED: Both sides linked ───────────────────────────── */}
            <Section
              title="Matched — Assets linked to insurance records"
              icon={CheckCircle2}
              count={matched.length}
              accent="bg-green-500"
              defaultOpen={false}
            >
              {matched.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">No matched records yet. Use "Auto-Link All" or manually link items above.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-green-50 dark:bg-green-900/10 border-b border-gray-100 dark:border-gray-800">
                        {['Asset ID', 'Campus', 'Class', 'Description', 'Serial #', 'Asset Value', 'Sum Insured', 'Difference', 'Asset Status', 'Ins. Status', 'Action'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {matched.map((m) => (
                        <tr key={m.assetId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{m.assetCode}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{m.subsidiary}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{m.insuranceClass}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[160px] truncate" title={m.assetDescription}>{m.assetDescription}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{m.serialNumber || '—'}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs tabular-nums">R {fmt(m.assetValue)}</td>
                          <td className="px-4 py-3 text-nova-teal font-semibold text-xs tabular-nums">R {fmt(m.sumInsured)}</td>
                          <td className={`px-4 py-3 font-semibold text-xs tabular-nums ${m.valueDifference < 0 ? 'text-red-500' : m.valueDifference > 0 ? 'text-nova-green' : 'text-gray-400'}`}>
                            {m.valueDifference === 0 ? '—' : `${m.valueDifference > 0 ? '+' : ''}R ${fmt(Math.abs(m.valueDifference))}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColour[m.assetStatus] || 'bg-gray-100 text-gray-600'}`}>
                              {m.assetStatus || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColour[m.insuranceStatus] || 'bg-gray-100 text-gray-600'}`}>
                              {m.insuranceStatus || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleUnlink(m.assetId, m.assetCode)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Unlink"
                            >
                              <Unlink size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

          </div>
        )}
      </div>

      {/* ── Link Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={linkDialog.open} onOpenChange={(v) => !v && setLinkDialog({ open: false, asset: null })}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Asset to Insurance Record</DialogTitle>
            <DialogDescription>
              {linkDialog.asset && (
                <>
                  Asset: <strong>{linkDialog.asset.assetCode}</strong> — {linkDialog.asset.description}
                  <br />
                  <span className="text-xs text-gray-400">
                    {linkDialog.asset.subsidiary} · {linkDialog.asset.insuranceClass}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2 space-y-4">
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
                <Loader2 size={24} className="animate-spin text-nova-green" />
                <p className="text-sm">Finding best matches…</p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-10">
                <ShieldOff size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No matching insurance records found for this campus and class.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add an insurance record for this item first, then come back to link it.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Top {suggestions.length} match{suggestions.length > 1 ? 'es' : ''} found based on campus, class, serial number and description. Select one to link.
                </p>
                <div className="space-y-2">
                  {suggestions.map(({ record, score }) => (
                    <div
                      key={record._id}
                      className="flex items-center justify-between gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-nova-green hover:bg-nova-green/5 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            score >= 80 ? 'bg-green-100 text-green-700' :
                            score >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {score}% match
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColour[record.status] || 'bg-gray-100 text-gray-600'}`}>
                            {record.status}
                          </span>
                        </div>
                        <p className="font-medium text-nova-navy dark:text-white text-sm truncate">
                          {record.descriptionDetails || record.assetOrInsurableRisk || '—'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {record.classOfInsurance}
                          {record.serialNumber ? ` · SN: ${record.serialNumber}` : ''}
                          {record.policyReference ? ` · Ref: ${record.policyReference}` : ''}
                        </p>
                        <p className="text-xs text-nova-teal font-semibold mt-1">
                          Sum Insured: R {fmt(record.sumInsured)}
                          {record.monthlyPremium ? ` · Premium: R ${fmt(record.monthlyPremium)}/mo` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={linking}
                        onClick={() => handleLink(record._id)}
                        className="flex-shrink-0"
                      >
                        {linking
                          ? <Loader2 size={13} className="animate-spin" />
                          : <><Link2 size={13} /> Link</>}
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog({ open: false, asset: null })}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
