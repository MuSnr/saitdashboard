import { Layout } from '@/components/Layout'
import { Download, Filter, BarChart3, TrendingDown, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const varianceData = [
  { id:'1', campus:'Ruimsig',      class:'Fire',                targetValue:45230000,  insuredValue:40120000,  variance:-5110000,  variancePercent:-11.3, status:'Under-Insured' },
  { id:'2', campus:'Ruimsig',      class:'Buildings Combined',  targetValue:125600000, insuredValue:118900000, variance:-6700000,  variancePercent:-5.3,  status:'Under-Insured' },
  { id:'3', campus:'Paulshof',     class:'Business All Risk',   targetValue:78400000,  insuredValue:62150000,  variance:-16250000, variancePercent:-20.7, status:'Critical' },
  { id:'4', campus:'Midrand',      class:'Electronic Equipment',targetValue:38313200,  insuredValue:42500000,  variance:4186800,   variancePercent:10.9,  status:'Over-Insured' },
  { id:'5', campus:'Boksburg',     class:'Fire',                targetValue:28900000,  insuredValue:25340000,  variance:-3560000,  variancePercent:-12.3, status:'Under-Insured' },
  { id:'6', campus:'North Riding', class:'Business All Risk',   targetValue:52100000,  insuredValue:48900000,  variance:-3200000,  variancePercent:-6.1,  status:'Under-Insured' },
]
const savingsData = [
  { id:'1', assetId:'AST-045', description:'Dell Laptop – Damaged',          campus:'Ruimsig',      class:'Electronic Equipment', totalValue:75000,  annualPremium:3750,  status:'Damaged' },
  { id:'2', assetId:'AST-089', description:'Office Chair – Beyond Repair',   campus:'Paulshof',     class:'Fire',                  totalValue:22400,  annualPremium:1120,  status:'Beyond Repair' },
  { id:'3', assetId:'AST-156', description:'Projector – Stolen',             campus:'Midrand',      class:'Electronic Equipment', totalValue:36000,  annualPremium:1800,  status:'Stolen' },
  { id:'4', assetId:'AST-234', description:'Server – Non-functional',        campus:'Boksburg',     class:'Business All Risk',     totalValue:250000, annualPremium:12500, status:'Damaged' },
]
const claimsData = [
  { id:'1', claimId:'CLM-2024-001', campus:'Ruimsig',      amount:125400, date:'Dec 15, 2024', stage:'Paid Out',  daysOpen:45 },
  { id:'2', claimId:'CLM-2024-002', campus:'Paulshof',     amount:87500,  date:'Dec 10, 2024', stage:'Paid Out',  daysOpen:50 },
  { id:'3', claimId:'CLM-2024-003', campus:'Midrand',      amount:203200, date:'Nov 20, 2024', stage:'Rejected',  daysOpen:70 },
  { id:'4', claimId:'CLM-2024-004', campus:'Boksburg',     amount:45600,  date:'Nov 15, 2024', stage:'Paid Out',  daysOpen:75 },
]

const reportTypes = [
  { value:'variance', label:'Variance Report',  icon:BarChart3,    desc:'Breakdown by campus and class' },
  { value:'savings',  label:'Savings Audit',    icon:TrendingDown, desc:'Cost reduction opportunities' },
  { value:'claims',   label:'Claims History',   icon:AlertCircle,  desc:'Historical trends analysis' },
]

export default function Reports() {
  const [reportType, setReportType] = useState('variance')
  const [campus, setCampus] = useState('all')
  const [cls, setCls] = useState('all')
  const [dateRange, setDateRange] = useState('Last 30 Days')
  const [exportFmt, setExportFmt] = useState('csv')
  const [result, setResult] = useState(null)
  const [generating, setGenerating] = useState(false)

  const generate = async () => {
    setGenerating(true)
    await new Promise((r) => setTimeout(r, 1000))
    let data = reportType === 'variance' ? varianceData : reportType === 'savings' ? savingsData : claimsData
    if (campus !== 'all') data = data.filter((r) => r.campus === campus)
    if (reportType === 'variance' && cls !== 'all') data = data.filter((r) => r.class === cls)
    setResult(data)
    setGenerating(false)
  }

  const handleExport = () => {
    if (!result?.length) return
    if (exportFmt === 'csv') {
      let csv = ''
      if (reportType === 'variance') {
        csv = 'Campus,Class,Target Value,Insured Value,Variance,Variance %,Status\n'
        result.forEach((r) => { csv += `${r.campus},${r.class},${r.targetValue},${r.insuredValue},${r.variance},${r.variancePercent}%,${r.status}\n` })
      } else if (reportType === 'savings') {
        csv = 'Asset ID,Description,Campus,Total Value,Annual Premium,Status\n'
        result.forEach((r) => { csv += `${r.assetId},${r.description},${r.campus},${r.totalValue},${r.annualPremium},${r.status}\n` })
      } else {
        csv = 'Claim ID,Campus,Amount,Date,Stage,Days Open\n'
        result.forEach((r) => { csv += `${r.claimId},${r.campus},${r.amount},${r.date},${r.stage},${r.daysOpen}\n` })
      }
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `sait-${reportType}-${Date.now()}.csv`; a.click()
      URL.revokeObjectURL(url)
    }
  }

  const varianceBadge = (v) => v < -20 ? 'destructive' : v < 0 ? 'warning' : 'default'

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">Generate and export reconciliation reports</p>
        </div>

        {/* Type picker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reportTypes.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => { setReportType(value); setResult(null) }}
              className={`text-left p-5 rounded-xl border-2 transition-all ${reportType === value ? 'border-nova-green bg-nova-green/5' : 'border-gray-200 dark:border-gray-800 hover:border-nova-green/50'}`}
            >
              <Icon size={22} className={`mb-3 ${reportType === value ? 'text-nova-green' : 'text-gray-500'}`} />
              <p className="font-semibold text-nova-navy dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><Filter size={16} className="text-gray-500" /><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</span></div>
          <div className="flex flex-wrap gap-3 items-end">
            <Select value={campus} onValueChange={setCampus}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Campus" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Campuses</SelectItem>{['Ruimsig','Paulshof','Midrand','Boksburg','North Riding'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            {reportType === 'variance' && (
              <Select value={cls} onValueChange={setCls}>
                <SelectTrigger className="w-52"><SelectValue placeholder="Insurance Class" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Classes</SelectItem>{['Fire','Buildings Combined','Business All Risk','Electronic Equipment'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{['Last 30 Days','Last 60 Days','Last 90 Days','Year to Date','All Time'].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={generate} disabled={generating}>
              {generating ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : 'Generate Report'}
            </Button>
          </div>
        </Card>

        {/* Export bar */}
        {result && result.length > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 bg-nova-green/10 border border-nova-green/30 rounded-xl flex-wrap">
            <div><p className="font-semibold text-nova-navy dark:text-white text-sm">Export Report</p><p className="text-xs text-gray-500 dark:text-gray-400">{result.length} records</p></div>
            <div className="flex items-center gap-3">
              <Select value={exportFmt} onValueChange={setExportFmt}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="csv">CSV</SelectItem><SelectItem value="pdf">PDF</SelectItem><SelectItem value="xlsx">Excel</SelectItem></SelectContent>
              </Select>
              <Button onClick={handleExport} variant="default" size="sm"><Download size={15} /> Download</Button>
            </div>
          </div>
        )}

        {/* Results */}
        {result ? (
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
              <span className="font-semibold text-nova-navy dark:text-white text-sm">{reportTypes.find((t) => t.value === reportType)?.label} ({result.length} records)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {reportType === 'variance' && ['Campus','Class','Target Value','Insured Value','Variance','%','Status'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                    {reportType === 'savings'  && ['Asset ID','Description','Campus','Total Value','Annual Premium','Status'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                    {reportType === 'claims'   && ['Claim ID','Campus','Amount','Date','Stage','Days Open'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {result.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      {reportType === 'variance' && (<>
                        <td className="px-4 py-3 font-medium text-nova-navy dark:text-white">{r.campus}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.class}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">R {r.targetValue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">R {r.insuredValue.toLocaleString()}</td>
                        <td className={`px-4 py-3 font-semibold ${r.variance < 0 ? 'text-red-600' : 'text-nova-green'}`}>R {r.variance.toLocaleString()}</td>
                        <td className={`px-4 py-3 font-semibold ${r.variancePercent < 0 ? 'text-red-600' : 'text-nova-green'}`}>{r.variancePercent.toFixed(1)}%</td>
                        <td className="px-4 py-3"><Badge variant={r.status === 'Critical' ? 'destructive' : r.status === 'Over-Insured' ? 'info' : 'warning'}>{r.status}</Badge></td>
                      </>)}
                      {reportType === 'savings' && (<>
                        <td className="px-4 py-3 font-mono text-xs text-nova-navy dark:text-white">{r.assetId}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.description}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.campus}</td>
                        <td className="px-4 py-3 font-semibold text-nova-navy dark:text-white">R {r.totalValue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-600 font-semibold">R {r.annualPremium.toLocaleString()}</td>
                        <td className="px-4 py-3"><Badge variant="destructive">{r.status}</Badge></td>
                      </>)}
                      {reportType === 'claims' && (<>
                        <td className="px-4 py-3 font-mono text-xs text-nova-navy dark:text-white">{r.claimId}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.campus}</td>
                        <td className="px-4 py-3 font-semibold text-nova-navy dark:text-white">R {r.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{r.date}</td>
                        <td className="px-4 py-3"><Badge variant={r.stage === 'Paid Out' ? 'default' : r.stage === 'Rejected' ? 'destructive' : 'warning'}>{r.stage}</Badge></td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.daysOpen}d</td>
                      </>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl gap-3 text-gray-400">
            <BarChart3 size={40} className="opacity-40" />
            <p className="font-medium">Select filters and click "Generate Report"</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
