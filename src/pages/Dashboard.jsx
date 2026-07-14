import { Layout } from '@/components/Layout'
import { TrendingUp, AlertTriangle, CheckCircle, BarChart3, Loader2, ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Clock, Link2, Shield } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { fetchDashboardAnalytics } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

const fmt  = (n) => Number(n || 0).toLocaleString('en-ZA')
const safe = (n) => Number(n) || 0

// Currency-aware compact formatter — default to 'R' so it always works
const makeFmtM = (symbol = 'R') => (n) => {
  const v = Number(n || 0)
  if (v >= 1e9) return `${symbol} ${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${symbol} ${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${symbol} ${(v / 1e3).toFixed(0)}K`
  return `${symbol} ${v.toFixed(0)}`
}

const VARIANCE_PAGE_SIZE = 6
const CAMPUS_PAGE_SIZE   = 5

function StatCard({ label, value, sub, changeLabel, icon: Icon, accent, trend }) {
  const isUp = trend === 'up', isDown = trend === 'down'
  const TrendIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isUp ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : isDown ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
          <TrendIcon size={11} />{changeLabel}
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1.5">{label}</p>
      <p className="text-2xl font-bold text-nova-navy dark:text-white leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{sub}</p>}
    </div>
  )
}

function VarianceCard({ cls }) {
  const { currencySymbol } = useAuth()
  const fmtM = makeFmtM(currencySymbol)
  const total = safe(cls.totalValue), insured = safe(cls.insuredValue), variance = safe(cls.variance)
  const pct = total > 0 ? Math.min((insured / total) * 100, 100) : (insured > 0 ? 100 : 0)
  const isCritical = cls.status === 'Critical', isOver = cls.status === 'Over-Insured', isOnTrack = cls.status === 'On Track'
  const barColor = isCritical ? 'bg-red-500' : isOver ? 'bg-nova-teal' : isOnTrack ? 'bg-nova-green' : 'bg-amber-400'
  const statusStyle = isCritical ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    : isOver ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
    : isOnTrack ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-nova-navy dark:text-white text-sm truncate">{cls.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{cls.description}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ml-2 flex-shrink-0 ${statusStyle}`}>{cls.status}</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">Coverage</span>
            <span className="text-xs font-bold text-nova-navy dark:text-white">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 pt-1">
          <div><p className="text-[10px] text-gray-400 mb-0.5">Assets</p><p className="text-xs font-semibold text-nova-navy dark:text-white">{fmtM(total)}</p></div>
          <div><p className="text-[10px] text-gray-400 mb-0.5">Insured</p><p className="text-xs font-semibold text-nova-teal">{fmtM(insured)}</p></div>
          <div><p className="text-[10px] text-gray-400 mb-0.5">Gap</p>
            <p className={`text-xs font-semibold ${variance < 0 ? 'text-red-500' : variance > 0 ? 'text-nova-green' : 'text-gray-400'}`}>
              {variance === 0 ? '—' : fmtM(Math.abs(variance))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function VarianceGrid({ classes }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(classes.length / VARIANCE_PAGE_SIZE))
  const visible = classes.slice(page * VARIANCE_PAGE_SIZE, page * VARIANCE_PAGE_SIZE + VARIANCE_PAGE_SIZE)
  if (classes.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl gap-3 text-gray-400">
      <BarChart3 size={32} className="opacity-40" />
      <p className="text-sm font-medium">No asset or insurance data yet</p>
      <p className="text-xs">Add assets and insurance records to see variance</p>
    </div>
  )
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          Showing {page * VARIANCE_PAGE_SIZE + 1}–{Math.min((page + 1) * VARIANCE_PAGE_SIZE, classes.length)} of {classes.length} classes
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-nova-green hover:text-nova-green disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs">‹</button>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-nova-green hover:text-nova-green disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs">›</button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((cls) => <VarianceCard key={cls.name} cls={cls} />)}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`rounded-full transition-all ${i === page ? 'w-5 h-1.5 bg-nova-green' : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700 hover:bg-nova-green/50'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function CampusTable({ rows }) {
  const [page, setPage] = useState(0)
  const { currencySymbol } = useAuth()
  const fmtM = makeFmtM(currencySymbol)
  const totalPages = Math.max(1, Math.ceil(rows.length / CAMPUS_PAGE_SIZE))
  const visible = rows.slice(page * CAMPUS_PAGE_SIZE, page * CAMPUS_PAGE_SIZE + CAMPUS_PAGE_SIZE)
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <p className="font-semibold text-nova-navy dark:text-white text-sm">Campus Coverage Status</p>
          <p className="text-xs text-gray-400 mt-0.5">{rows.length} campuses tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-nova-green hover:text-nova-green disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs">‹</button>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:border-nova-green hover:text-nova-green disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs">›</button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {['Campus','Code','Asset Value','Insured Value','Gap','Status','Coverage %'].map((h) => (
              <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">No campus data yet</td></tr>
          ) : visible.map((s) => {
            const isRisk = s.status === 'At Risk'
            const verif = safe(s.verificationStatus)
            const gap   = safe(s.underInsured)
            return (
              <tr key={s.name} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nova-navy/10 dark:bg-nova-navy/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-nova-navy dark:text-white">{s.shortName}</span>
                    </div>
                    <span className="font-medium text-nova-navy dark:text-white text-sm">{s.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-400 font-mono text-xs">{s.shortName}</td>
                <td className="px-5 py-4 text-gray-700 dark:text-gray-300 text-xs tabular-nums">{fmtM(safe(s.totalValue))}</td>
                <td className="px-5 py-4 text-nova-teal font-semibold text-xs tabular-nums">{fmtM(safe(s.insuredValue))}</td>
                <td className="px-5 py-4 text-xs tabular-nums">
                  <span className={`font-semibold ${gap < 0 ? 'text-red-500' : gap > 0 ? 'text-nova-green' : 'text-gray-400'}`}>
                    {gap === 0 ? '—' : `${gap < 0 ? '-' : '+'}${fmtM(Math.abs(gap))}`}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${isRisk ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isRisk ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    {s.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full min-w-[60px]">
                      <div className={`h-full rounded-full transition-all duration-700 ${verif > 80 ? 'bg-nova-green' : verif > 50 ? 'bg-nova-orange' : 'bg-red-400'}`} style={{ width: `${verif}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-nova-navy dark:text-white w-8 text-right tabular-nums">{verif}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`rounded-full transition-all ${i === page ? 'w-5 h-1.5 bg-nova-green' : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700 hover:bg-nova-green/50'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [showAll, setShowAll] = useState(false)
  const { isAdmin, isKenya: rawIsKenya, currencySymbol: rawCurrency, isSuperAdmin, region } = useAuth()
  const navigate = useNavigate()
  const isKenya        = rawIsKenya  ?? false
  const currencySymbol = rawCurrency ?? 'R'
  const fmtM = makeFmtM(currencySymbol)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    // Pass ?region for super_admin so backend scopes correctly to active profile
    const params = isSuperAdmin ? { region } : undefined
    fetchDashboardAnalytics(params)
      .then((d) => { setData(d || null) })
      .catch((e) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [isSuperAdmin, region])

  // Reload when region changes (super_admin profile switch)
  useEffect(() => { load() }, [load])

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-nova-green" />
          <p className="text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    </Layout>
  )

  if (error) return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle size={36} className="text-nova-orange" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        <button onClick={load} className="flex items-center gap-2 text-sm text-nova-teal hover:underline">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </Layout>
  )

  const d = {
    globalReplacementValue: safe(data?.globalReplacementValue),
    currentSumInsured:      safe(data?.currentSumInsured),
    underInsuredAmount:     safe(data?.underInsuredAmount),
    coverageRatio:          safe(data?.coverageRatio),
    replacementValueChange: data?.replacementValueChange,
    sumInsuredChange:       data?.sumInsuredChange,
    totalMonthlyPremium:    safe(data?.totalMonthlyPremium),
    pendingReviewCount:     safe(data?.pendingReviewCount),
    openIncidentsCount:     safe(data?.openIncidentsCount),
    matchedByDesignCount:   safe(data?.matchedByDesignCount),
    keUnifiedTotals:        data?.keUnifiedTotals || null,
    claimsByStatus:         Array.isArray(data?.claimsByStatus) ? data.claimsByStatus : [],
    subsidiaries:           Array.isArray(data?.subsidiaries)   ? data.subsidiaries   : [],
    insuranceClasses:       Array.isArray(data?.insuranceClasses) ? data.insuranceClasses : [],
  }

  const classesWithData    = d.insuranceClasses.filter((c) => c.hasData)
  const classesWithoutData = d.insuranceClasses.filter((c) => !c.hasData)
  const visibleClasses     = showAll ? d.insuranceClasses : classesWithData

  // Kenya: Unified Register stats replace SA variance stats
  const keStats = isKenya ? [
    { label: 'Total Assets Registered', value: fmt(d.keUnifiedTotals?.assetCount ?? 0),
      sub: 'All assets in the Unified Register',
      changeLabel: 'Unified Register', trend: 'neutral', icon: BarChart3, accent: 'bg-nova-navy' },
    { label: 'Insured Items', value: fmt(d.keUnifiedTotals?.insuredCount ?? 0),
      sub: '1:1 matched by design — zero variance',
      changeLabel: '100% covered', trend: 'up', icon: CheckCircle, accent: 'bg-nova-green' },
    { label: 'Total Insured Value', value: `${currencySymbol} ${fmt(d.currentSumInsured)}`,
      sub: `Asset value = insured value`,
      changeLabel: 'Zero gap', trend: 'up', icon: Shield, accent: 'bg-nova-teal' },
    { label: 'Matched This Month', value: fmt(d.matchedByDesignCount),
      sub: 'New assets auto-synced this month',
      changeLabel: 'Auto-linked', trend: 'up', icon: Link2, accent: 'bg-emerald-500' },
  ] : []

  const saStats = !isKenya ? [
    { label: 'Global Replacement Value', value: `${currencySymbol} ${fmt(d.globalReplacementValue)}`,
      sub: 'Total asset value across all campuses',
      changeLabel: d.replacementValueChange != null ? `+${Number(d.replacementValueChange).toFixed(1)}% escalation` : 'No historical data',
      trend: 'neutral', icon: TrendingUp, accent: 'bg-nova-navy' },
    { label: 'Current Sum Insured', value: `${currencySymbol} ${fmt(d.currentSumInsured)}`,
      sub: `Monthly premium: ${currencySymbol} ${fmt(d.totalMonthlyPremium)}/mo`,
      changeLabel: d.sumInsuredChange != null ? `+${Number(d.sumInsuredChange).toFixed(1)}% vs last year` : 'No historical data',
      trend: 'neutral', icon: CheckCircle, accent: 'bg-nova-teal' },
    { label: 'Under-Insured Amount', value: `${currencySymbol} ${fmt(d.underInsuredAmount)}`,
      sub: 'Coverage gap requiring attention',
      changeLabel: d.underInsuredAmount > 0 ? 'High Risk' : 'Fully Covered',
      trend: d.underInsuredAmount > 0 ? 'down' : 'up', icon: AlertTriangle, accent: 'bg-nova-orange' },
    { label: 'Coverage Ratio', value: `${d.coverageRatio.toFixed(1)}%`,
      sub: 'Target: 100% coverage',
      changeLabel: d.coverageRatio >= 100 ? 'Fully Covered' : d.coverageRatio >= 80 ? 'Near Target' : 'Below Target',
      trend: d.coverageRatio >= 100 ? 'up' : d.coverageRatio >= 80 ? 'neutral' : 'down', icon: BarChart3, accent: 'bg-nova-green' },
  ] : []

  const stats = isKenya ? keStats : saStats

  return (
    <Layout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-nova-navy dark:text-white mb-0.5">Executive Dashboard</h1>
            <p className="text-sm text-gray-400">Real-time asset reconciliation · All campuses</p>
          </div>
          <div className="flex items-center gap-3">
            {!data && (
              <span className="flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                No data yet — add assets and insurance records
              </span>
            )}
            <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400" title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Pending Review badge — SA admin only */}
        {isAdmin && !isKenya && (
          <button
            onClick={() => navigate('/insurance-register?status=Pending+Review')}
            className="w-full text-left"
          >
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Clock size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-0.5">Pending Review</p>
                  <p className="text-2xl font-bold text-nova-navy dark:text-white leading-none">{fmt(d.pendingReviewCount)}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {d.pendingReviewCount > 0
                      ? 'Auto-created insurance records awaiting admin completion'
                      : 'All auto-created records have been reviewed'}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${d.pendingReviewCount > 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                {d.pendingReviewCount > 0 ? 'Needs attention →' : 'All clear ✓'}
              </div>
            </div>
          </button>
        )}

        {/* Open Incidents badge — all admins */}
        {isAdmin && (
          <button onClick={() => navigate('/incidents')} className="w-full text-left">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-0.5">Open Incidents</p>
                  <p className="text-2xl font-bold text-nova-navy dark:text-white leading-none">{fmt(d.openIncidentsCount)}</p>
                  <p className="text-xs text-gray-400 mt-1">Notifications awaiting review or conversion to claim</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${d.openIncidentsCount > 0 ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                {d.openIncidentsCount > 0 ? 'View incidents →' : 'All clear ✓'}
              </div>
            </div>
          </button>
        )}

        {/* Variance by class + Portfolio overview — SA only */}
        {!isKenya && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Variance grid — 2/3 width, 6 per page */}
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-nova-navy dark:text-white">Variance by Insurance Class</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {classesWithData.length} of {d.insuranceClasses.length} classes active
                </span>
                {classesWithoutData.length > 0 && (
                  <button onClick={() => setShowAll((v) => !v)} className="text-xs text-nova-teal hover:underline">
                    {showAll ? 'Active only' : `Show all ${d.insuranceClasses.length}`}
                  </button>
                )}
              </div>
            </div>
            <VarianceGrid classes={visibleClasses} />
          </div>

          {/* Portfolio overview — 1/3 width */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-col">
            <h2 className="text-sm font-bold text-nova-navy dark:text-white mb-5">Portfolio Overview</h2>

            {/* Coverage ring */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="12" className="text-gray-100 dark:text-gray-800" />
                  <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="12"
                    strokeDasharray={`${(d.coverageRatio / 100) * 301.6} 301.6`}
                    strokeLinecap="round" className="text-nova-green transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-nova-navy dark:text-white leading-none">{d.coverageRatio.toFixed(0)}%</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">covered</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3 flex-1">
              {[
                { label: 'Asset Value',     value: fmtM(d.globalReplacementValue), color: 'bg-nova-navy' },
                { label: 'Sum Insured',     value: fmtM(d.currentSumInsured),      color: 'bg-nova-green' },
                { label: 'Coverage Gap',    value: fmtM(d.underInsuredAmount),     color: 'bg-nova-orange' },
                { label: 'Monthly Premium', value: fmtM(d.totalMonthlyPremium),    color: 'bg-nova-teal' },
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

            {/* Bottom stats */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Campuses at risk</span>
                <span className="text-lg font-bold text-red-500">
                  {d.subsidiaries.filter((s) => s.status === 'At Risk').length}
                  <span className="text-xs text-gray-400 font-normal ml-1">/ {d.subsidiaries.length}</span>
                </span>
              </div>
              {d.subsidiaries.length > 0 && (
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <div className="h-full bg-red-400 rounded-full transition-all duration-700"
                    style={{ width: `${(d.subsidiaries.filter((s) => s.status === 'At Risk').length / d.subsidiaries.length) * 100}%` }} />
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">Active classes</span>
                <span className="text-xs font-semibold text-nova-navy dark:text-white">
                  {classesWithData.length} / {d.insuranceClasses.length}
                </span>
              </div>
            </div>
          </div>
        </div>
        )} {/* end !isKenya variance section */}

        {/* Campus coverage table */}
        <CampusTable rows={d.subsidiaries} />

      </div>
    </Layout>
  )
}
