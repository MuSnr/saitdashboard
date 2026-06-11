import { Layout } from '@/components/Layout'
import {
  TrendingUp, AlertTriangle, CheckCircle, BarChart3,
  Loader2, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchDashboardAnalytics } from '@/services/api'

// ── Dummy data shown until backend is connected ────────────────────────────
const DUMMY = {
  globalReplacementValue: 368543200,
  currentSumInsured:      312100000,
  underInsuredAmount:     56443200,
  coverageRatio:          84.7,
  replacementValueChange: 5.0,
  sumInsuredChange:       2.3,
  subsidiaries: [
    { name: 'Ruimsig',      shortName: 'NPR', totalAssets: 18420, underInsured: -12340000, status: 'At Risk',  verificationStatus: 62 },
    { name: 'Paulshof',     shortName: 'NPP', totalAssets: 14320, underInsured: -9870000,  status: 'At Risk',  verificationStatus: 78 },
    { name: 'Midrand',      shortName: 'NPM', totalAssets: 21100, underInsured: 4186800,   status: 'On Track', verificationStatus: 91 },
    { name: 'Boksburg',     shortName: 'NPB', totalAssets: 9870,  underInsured: -6540000,  status: 'At Risk',  verificationStatus: 55 },
    { name: 'North Riding', shortName: 'NPN', totalAssets: 11830, underInsured: -3200000,  status: 'At Risk',  verificationStatus: 70 },
  ],
  insuranceClasses: [
    { name: 'Fire',                 description: 'Furniture, Fixtures & Stock',            totalValue: 170730000, insuredValue: 160040000, variance: -10690000, status: 'Under-Insured' },
    { name: 'Buildings Combined',   description: 'Building structures & Solar Panels',     totalValue: 125600000, insuredValue: 118900000, variance: -6700000,  status: 'Under-Insured' },
    { name: 'Business All Risk',    description: 'Mobility equipment & Laptops',           totalValue: 130500000, insuredValue: 111050000, variance: -19450000, status: 'Critical' },
    { name: 'Electronic Equipment', description: 'Chromebooks, Laptops & Projectors',      totalValue: 38313200,  insuredValue: 42500000,  variance: 4186800,  status: 'Over-Insured' },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-ZA')
const fmtM = (n) => `R ${(Number(n || 0) / 1e6).toFixed(1)}M`
const safe = (n) => Number(n) || 0

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, change, changeLabel, icon: Icon, accent, trend }) {
  const isUp = trend === 'up'
  const isDown = trend === 'down'
  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Top row */}
      <div className="flex items-start justify-between mb-5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isUp   ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
          isDown ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                   'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
        }`}>
          <TrendIcon size={11} />
          {changeLabel}
        </div>
      </div>

      {/* Value */}
      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1.5">{label}</p>
      <p className="text-2xl font-bold text-nova-navy dark:text-white leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{sub}</p>}
    </div>
  )
}

// ── Progress Bar Card ─────────────────────────────────────────────────────
function VarianceCard({ cls }) {
  const total   = safe(cls.totalValue)
  const insured = safe(cls.insuredValue)
  const variance = safe(cls.variance)
  const pct = total > 0 ? Math.min((insured / total) * 100, 100) : 0
  const isCritical = cls.status === 'Critical'
  const isOver     = cls.status === 'Over-Insured'

  const barColor = isCritical ? 'bg-red-500' : isOver ? 'bg-nova-teal' : 'bg-nova-green'
  const statusStyle = isCritical
    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    : isOver
    ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-semibold text-nova-navy dark:text-white text-sm">{cls.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{cls.description}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle}`}>
          {cls.status}
        </span>
      </div>

      {/* Coverage bar */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">Coverage</span>
            <span className="text-xs font-bold text-nova-navy dark:text-white">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Values row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Target</p>
            <p className="text-xs font-semibold text-nova-navy dark:text-white">{fmtM(total)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Insured</p>
            <p className="text-xs font-semibold text-nova-teal">{fmtM(insured)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Gap</p>
            <p className={`text-xs font-semibold ${variance < 0 ? 'text-red-500' : 'text-nova-green'}`}>
              {fmtM(Math.abs(variance))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Paginated Table ───────────────────────────────────────────────────────
const PAGE_SIZE = 3

function CampusTable({ rows }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const visible = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Table header bar */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <p className="font-semibold text-nova-navy dark:text-white text-sm">Campus Verification Status</p>
          <p className="text-xs text-gray-400 mt-0.5">{rows.length} campuses tracked</p>
        </div>
        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-nova-green hover:text-nova-green disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
          >‹</button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-nova-green hover:text-nova-green disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
          >›</button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {['Campus', 'Code', 'Assets', 'Variance', 'Status', 'Verification'].map((h) => (
              <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((s, i) => {
            const isRisk = s.status === 'At Risk'
            return (
              <tr
                key={s.name}
                className={`border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nova-navy/10 dark:bg-nova-navy/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-nova-navy dark:text-white">{s.shortName}</span>
                    </div>
                    <span className="font-medium text-nova-navy dark:text-white text-sm">{s.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{s.shortName}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{safe(s.totalAssets).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`font-semibold text-sm ${safe(s.underInsured) < 0 ? 'text-red-500' : 'text-nova-green'}`}>
                    {safe(s.underInsured) < 0 ? '-' : '+'}R {Math.abs(safe(s.underInsured) / 1e6).toFixed(1)}M
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    isRisk
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isRisk ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    {s.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full min-w-[80px]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          safe(s.verificationStatus) > 80 ? 'bg-nova-green' :
                          safe(s.verificationStatus) > 50 ? 'bg-nova-orange' : 'bg-red-500'
                        }`}
                        style={{ width: `${safe(s.verificationStatus)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-nova-navy dark:text-white w-8 text-right tabular-nums">
                      {safe(s.verificationStatus)}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Page dots */}
      <div className="flex items-center justify-center gap-1.5 py-3">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={`rounded-full transition-all ${i === page ? 'w-5 h-1.5 bg-nova-green' : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700 hover:bg-nova-green/50'}`}
          />
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardAnalytics()
      .then((d) => setData(d || null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-nova-green" />
            <p className="text-sm text-gray-400">Loading dashboard…</p>
          </div>
        </div>
      </Layout>
    )
  }

  const base = data || DUMMY
  const d = {
    ...DUMMY,
    ...base,
    globalReplacementValue: safe(base.globalReplacementValue),
    currentSumInsured:      safe(base.currentSumInsured),
    underInsuredAmount:     safe(base.underInsuredAmount),
    coverageRatio:          safe(base.coverageRatio),
    replacementValueChange: safe(base.replacementValueChange),
    sumInsuredChange:       safe(base.sumInsuredChange),
    subsidiaries:     Array.isArray(base.subsidiaries)     ? base.subsidiaries     : DUMMY.subsidiaries,
    insuranceClasses: Array.isArray(base.insuranceClasses) ? base.insuranceClasses : DUMMY.insuranceClasses,
  }

  const stats = [
    {
      label: 'Global Replacement Value',
      value: `R ${fmt(d.globalReplacementValue)}`,
      sub: '2025 replacement cost across all campuses',
      changeLabel: `+${d.replacementValueChange.toFixed(1)}% escalation`,
      trend: 'up',
      icon: TrendingUp,
      accent: 'bg-nova-navy',
    },
    {
      label: 'Current Sum Insured',
      value: `R ${fmt(d.currentSumInsured)}`,
      sub: 'Active policy coverage total',
      changeLabel: `+${d.sumInsuredChange.toFixed(1)}% vs last year`,
      trend: 'up',
      icon: CheckCircle,
      accent: 'bg-nova-teal',
    },
    {
      label: 'Under-Insured Amount',
      value: `R ${fmt(d.underInsuredAmount)}`,
      sub: 'Coverage gap requiring attention',
      changeLabel: 'High Risk',
      trend: 'down',
      icon: AlertTriangle,
      accent: 'bg-nova-orange',
    },
    {
      label: 'Coverage Ratio',
      value: `${d.coverageRatio.toFixed(1)}%`,
      sub: 'Target: 100% coverage',
      changeLabel: 'Below Target',
      trend: 'neutral',
      icon: BarChart3,
      accent: 'bg-nova-green',
    },
  ]

  return (
    <Layout>
      <div className="space-y-8">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-nova-navy dark:text-white mb-0.5">Executive Dashboard</h1>
            <p className="text-sm text-gray-400">Real-time asset reconciliation · All campuses</p>
          </div>
          {!data && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Demo data — backend not connected
            </span>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Two-column: variance cards + quick summary */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Variance cards — 2/3 width */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-nova-navy dark:text-white">Variance by Insurance Class</h2>
              <span className="text-xs text-gray-400">{d.insuranceClasses.length} classes</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {d.insuranceClasses.map((cls) => (
                <VarianceCard key={cls.name} cls={cls} />
              ))}
            </div>
          </div>

          {/* Quick stats panel — 1/3 width */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-col">
            <h2 className="text-sm font-bold text-nova-navy dark:text-white mb-5">Portfolio Overview</h2>

            {/* Coverage donut-style summary */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                {/* SVG ring */}
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="12" className="text-gray-100 dark:text-gray-800" />
                  <circle
                    cx="60" cy="60" r="48" fill="none"
                    stroke="currentColor" strokeWidth="12"
                    strokeDasharray={`${(d.coverageRatio / 100) * 301.6} 301.6`}
                    strokeLinecap="round"
                    className="text-nova-green transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-nova-navy dark:text-white leading-none">{d.coverageRatio.toFixed(0)}%</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">covered</span>
                </div>
              </div>
            </div>

            {/* Legend rows */}
            <div className="space-y-3 flex-1">
              {[
                { label: 'Replacement Value', value: fmtM(d.globalReplacementValue), color: 'bg-nova-navy' },
                { label: 'Sum Insured',        value: fmtM(d.currentSumInsured),      color: 'bg-nova-green' },
                { label: 'Coverage Gap',       value: fmtM(d.underInsuredAmount),     color: 'bg-nova-orange' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  </div>
                  <span className="text-xs font-semibold text-nova-navy dark:text-white tabular-nums">{value}</span>
                </div>
              ))}
            </div>

            {/* Campus at-risk count */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Campuses at risk</span>
                <span className="text-lg font-bold text-red-500">
                  {d.subsidiaries.filter((s) => s.status === 'At Risk').length}
                  <span className="text-xs text-gray-400 font-normal ml-1">/ {d.subsidiaries.length}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                <div
                  className="h-full bg-red-400 rounded-full transition-all duration-700"
                  style={{ width: `${(d.subsidiaries.filter((s) => s.status === 'At Risk').length / d.subsidiaries.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Campus paginated table */}
        <CampusTable rows={d.subsidiaries} />

      </div>
    </Layout>
  )
}
