import { Layout } from '@/components/Layout'
import { Download, Filter, BarChart3, TrendingDown, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { fetchVarianceReport, fetchClaimsReport, fetchAssetsReport, getApiError } from '@/services/api'
import { useCampuses } from '@/context/CampusContext'
import { useAuth } from '@/context/AuthContext'

const fmt  = (n) => Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (n) => Number(n || 0).toLocaleString('en-ZA')

const INSURANCE_CLASSES = [
  'Fire', 'Buildings Combined', 'Business All Risk', 'Electronic Equipment',
  'Theft Section', 'Business Interruption', 'Public Liability', 'Umbrella Liability',
  'Employers Liability', 'Sasria', 'Broker Fees', 'TWK Assist / Bystand',
]

const CLAIM_STATUSES = ['Pending', 'Paid Out', 'Rejected', 'Withdrawn', 'Lodged']

const DATE_RANGES = [
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 60 Days', value: '60' },
  { label: 'Last 90 Days', value: '90' },
  { label: 'Year to Date', value: 'ytd' },
  { label: 'All Time',     value: 'all' },
]

const reportTypes = [
  { value: 'variance', label: 'Variance Report',  icon: BarChart3,    desc: 'Asset value vs sum insured, by campus & class' },
  { value: 'claims',   label: 'Claims History',   icon: AlertCircle,  desc: 'Historical claims pipeline with settlement data' },
  { value: 'assets',   label: 'Asset Register',   icon: TrendingDown, desc: 'Full asset register export by campus and class' },
]

// ── Status badge helpers ──────────────────────────────────────────────────────
const varianceBadge = (status) => {
  if (status === 'Critical')      return 'bg-red-100 text-red-700'
  if (status === 'Under-Insured') return 'bg-amber-100 text-amber-700'
  if (status === 'Over-Insured')  return 'bg-sky-100 text-sky-700'
  return 'bg-green-100 text-green-700'
}

const claimBadge = {
  'Paid Out':  'bg-green-100 text-green-700',
  'Pending':   'bg-yellow-100 text-yellow-700',
  'Rejected':  'bg-red-100 text-red-700',
  'Withdrawn': 'bg-gray-100 text-gray-600',
  'Lodged':    'bg-blue-100 text-blue-700',
}

const insuranceBadge = {
  'Insured':          'bg-green-100 text-green-700',
  'Request Removal':  'bg-red-100 text-red-700',
  'Request Addition': 'bg-blue-100 text-blue-700',
  'Stolen':           'bg-red-200 text-red-800',
  'Not Insured':      'bg-gray-100 text-gray-600',
}

// ── CSV export helper ─────────────────────────────────────────────────────────
const exportCSV = (reportType, rows) => {
  if (!rows?.length) return

  let csv = ''
  let filename = ''

  if (reportType === 'variance') {
    csv = 'Campus,Insurance Class,Asset Value (R),Insured Value (R),Variance (R),Variance %,Items,Status\n'
    rows.forEach((r) => {
      csv += `"${r.campus}","${r.class}",${r.targetValue},${r.insuredValue},${r.variance},${r.variancePercent}%,${r.itemCount},"${r.status}"\n`
    })
    filename = `variance-report-${Date.now()}.csv`
  } else if (reportType === 'claims') {
    csv = 'Claim ID,Campus,Amount (R),Incident Date,Submitted,Settled,Status,Days Open,Description\n'
    rows.forEach((r) => {
      csv += `"${r.claimId}","${r.campus}",${r.amount},"${r.date}","${r.dateSubmitted}","${r.dateSettled || ''}","${r.stage}",${r.daysOpen},"${r.description?.replace(/"/g, '""')}"\n`
    })
    filename = `claims-report-${Date.now()}.csv`
  } else {
    csv = 'Asset ID,Campus,Sub-Campus,Insurance Class,Description,Serial #,Qty,Unit Price (R),Sum Insured (R),Status,Year\n'
    rows.forEach((r) => {
      csv += `"${r.assetId}","${r.subsidiary}","${r.subLocation || ''}","${r.insuranceClass}","${r.description?.replace(/"/g, '""')}","${r.serialNumber || ''}",${r.quantity},${r.unitPrice},${r.sumInsured},"${r.insuranceStatus || ''}",${r.year || ''}\n`
    })
    filename = `asset-register-${Date.now()}.csv`
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const { campuses } = useCampuses()
  const { currencySymbol } = useAuth()

  // Filters
  const [reportType,    setReportType]    = useState('variance')
  const [subsidiary,    setSubsidiary]    = useState('all')
  const [insuranceClass,setInsuranceClass]= useState('all')
  const [claimStatus,   setClaimStatus]   = useState('all')
  const [dateRange,     setDateRange]     = useState('all')

  // Results
  const [rows,       setRows]       = useState(null)   // null = not yet run
  const [generating, setGenerating] = useState(false)

  const generate = useCallback(async () => {
    setGenerating(true)
    setRows(null)
    try {
      const params = { subsidiary, dateRange }
      let data = []

      if (reportType === 'variance') {
        params.insuranceClass = insuranceClass
        data = await fetchVarianceReport(params)
      } else if (reportType === 'claims') {
        params.status = claimStatus
        data = await fetchClaimsReport(params)
      } else {
        params.insuranceClass  = insuranceClass
        params.insuranceStatus = claimStatus
        data = await fetchAssetsReport(params)
      }

      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(getApiError(err))
      setRows([])
    } finally {
      setGenerating(false)
    }
  }, [reportType, subsidiary, insuranceClass, claimStatus, dateRange])

  const handleTypeChange = (t) => {
    setReportType(t)
    setRows(null)
    setSubsidiary('all')
    setInsuranceClass('all')
    setClaimStatus('all')
    setDateRange('all')
  }

  // ── Summary stats for variance ────────────────────────────────────────────
  const varianceSummary = reportType === 'variance' && rows?.length > 0 ? {
    totalAssetValue:   rows.reduce((s, r) => s + r.targetValue, 0),
    totalInsuredValue: rows.reduce((s, r) => s + r.insuredValue, 0),
    criticalCount:     rows.filter((r) => r.status === 'Critical').length,
    underCount:        rows.filter((r) => r.status === 'Under-Insured').length,
  } : null

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Reports</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Generate and export live reconciliation reports from the database
            </p>
          </div>
          {rows !== null && (
            <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
              <RefreshCw size={14} /> Refresh
            </Button>
          )}
        </div>

        {/* ── Type picker ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reportTypes.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => handleTypeChange(value)}
              className={`text-left p-5 rounded-xl border-2 transition-all ${
                reportType === value
                  ? 'border-nova-green bg-nova-green/5 dark:bg-nova-green/10'
                  : 'border-gray-200 dark:border-gray-800 hover:border-nova-green/50'
              }`}
            >
              <Icon size={22} className={`mb-3 ${reportType === value ? 'text-nova-green' : 'text-gray-400'}`} />
              <p className="font-semibold text-nova-navy dark:text-white text-sm">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={15} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3 items-end">

            {/* Campus */}
            <Select value={subsidiary} onValueChange={setSubsidiary}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Campuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                {campuses.map((c) => (
                  <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Insurance Class — shown for variance and assets */}
            {(reportType === 'variance' || reportType === 'assets') && (
              <Select value={insuranceClass} onValueChange={setInsuranceClass}>
                <SelectTrigger className="w-56"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {INSURANCE_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Claim status — for claims report */}
            {reportType === 'claims' && (
              <Select value={claimStatus} onValueChange={setClaimStatus}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {CLAIM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Insurance status — for assets report */}
            {reportType === 'assets' && (
              <Select value={claimStatus} onValueChange={setClaimStatus}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {['Insured', 'Request Removal', 'Request Addition', 'Stolen', 'Not Insured'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Date Range" /></SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={generate} disabled={generating} className="ml-auto">
              {generating
                ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                : 'Generate Report'}
            </Button>
          </div>
        </Card>

        {/* ── Variance summary stats ────────────────────────────────────── */}
        {varianceSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Asset Value',   value: `${currencySymbol} ${fmt(varianceSummary.totalAssetValue)}`,   colour: 'text-nova-navy dark:text-white' },
              { label: 'Total Insured Value', value: `${currencySymbol} ${fmt(varianceSummary.totalInsuredValue)}`, colour: 'text-nova-teal' },
              { label: 'Critical Lines',      value: varianceSummary.criticalCount,                 colour: 'text-red-600' },
              { label: 'Under-Insured Lines', value: varianceSummary.underCount,                    colour: 'text-amber-600' },
            ].map(({ label, value, colour }) => (
              <Card key={label}>
                <div className="p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className={`text-xl font-bold ${colour}`}>{value}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Export bar ────────────────────────────────────────────────── */}
        {rows?.length > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 bg-nova-green/10 border border-nova-green/30 rounded-xl flex-wrap">
            <div>
              <p className="font-semibold text-nova-navy dark:text-white text-sm">Export as CSV</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{rows.length} records ready</p>
            </div>
            <Button onClick={() => exportCSV(reportType, rows)} size="sm">
              <Download size={15} /> Download CSV
            </Button>
          </div>
        )}

        {/* ── Loading state ─────────────────────────────────────────────── */}
        {generating && (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={32} className="animate-spin text-nova-green" />
            <p className="text-sm font-medium">Generating report…</p>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!generating && rows === null && (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl gap-3 text-gray-400">
            <BarChart3 size={40} className="opacity-40" />
            <p className="font-medium">Select filters and click "Generate Report"</p>
          </div>
        )}

        {/* ── No results ───────────────────────────────────────────────── */}
        {!generating && rows !== null && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl gap-3 text-gray-400">
            <BarChart3 size={36} className="opacity-40" />
            <p className="font-medium">No data matches your filters</p>
            <p className="text-xs text-gray-400">Try broadening your filters or adding data first</p>
          </div>
        )}

        {/* ── Results table ─────────────────────────────────────────────── */}
        {!generating && rows?.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <span className="font-semibold text-nova-navy dark:text-white text-sm">
                {reportTypes.find((t) => t.value === reportType)?.label} — {rows.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">

                    {/* ── Variance columns ── */}
                    {reportType === 'variance' && [
                      'Campus', 'Insurance Class', 'Items', 'Asset Value', 'Insured Value', 'Variance', 'Variance %', 'Status',
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}

                    {/* ── Claims columns ── */}
                    {reportType === 'claims' && [
                      'Ref', 'Campus', 'Amount', 'Incident', 'Submitted', 'Settled', 'Status', 'Days Open', 'Description',
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}

                    {/* ── Assets columns ── */}
                    {reportType === 'assets' && [
                      'Asset ID', 'Campus', 'Sub-Campus', 'Class', 'Description', 'Serial #', 'Qty', 'Unit Price', 'Sum Insured', 'Status', 'Year',
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                      {/* ── Variance row ── */}
                      {reportType === 'variance' && (<>
                        <td className="px-4 py-3 font-medium text-nova-navy dark:text-white text-xs whitespace-nowrap">{r.campus}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{r.class}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">{fmtN(r.itemCount)}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs tabular-nums whitespace-nowrap">R {fmt(r.targetValue)}</td>
                        <td className="px-4 py-3 text-nova-teal font-medium text-xs tabular-nums whitespace-nowrap">R {fmt(r.insuredValue)}</td>
                        <td className={`px-4 py-3 font-semibold text-xs tabular-nums whitespace-nowrap ${r.variance < 0 ? 'text-red-600' : 'text-nova-green'}`}>
                          {r.variance < 0 ? '-' : '+'}R {fmt(Math.abs(r.variance))}
                        </td>
                        <td className={`px-4 py-3 font-semibold text-xs tabular-nums ${r.variancePercent < 0 ? 'text-red-600' : 'text-nova-green'}`}>
                          {r.variancePercent > 0 ? '+' : ''}{r.variancePercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${varianceBadge(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                      </>)}

                      {/* ── Claims row ── */}
                      {reportType === 'claims' && (<>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-nova-navy dark:text-white whitespace-nowrap">{r.claimId}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{r.campus}</td>
                        <td className="px-4 py-3 font-semibold text-nova-navy dark:text-white text-xs tabular-nums whitespace-nowrap">
                          {r.amount > 0 ? `${currencySymbol} ${fmt(r.amount)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.dateSubmitted}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {r.dateSettled
                            ? <span className="text-green-600 font-medium">{r.dateSettled}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${claimBadge[r.stage] || 'bg-gray-100 text-gray-600'}`}>
                            {r.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs tabular-nums">{r.daysOpen}d</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate" title={r.description}>
                          {r.description}
                        </td>
                      </>)}

                      {/* ── Assets row ── */}
                      {reportType === 'assets' && (<>
                        <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{r.assetId}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">{r.subsidiary}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.subLocation || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{r.insuranceClass}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs max-w-[180px] truncate" title={r.description}>
                          {r.description}
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-gray-500 max-w-[110px] truncate">
                          {r.serialNumber || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs tabular-nums">{r.quantity}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs tabular-nums whitespace-nowrap">R {fmt(r.unitPrice)}</td>
                        <td className="px-4 py-3 font-semibold text-nova-teal text-xs tabular-nums whitespace-nowrap">R {fmt(r.sumInsured)}</td>
                        <td className="px-4 py-3">
                          {r.insuranceStatus
                            ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${insuranceBadge[r.insuranceStatus] || 'bg-gray-100 text-gray-600'}`}>
                                {r.insuranceStatus}
                              </span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{r.year || '—'}</td>
                      </>)}

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </div>
    </Layout>
  )
}
