import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, LineChart, Line
} from 'recharts'
import Card from '../../components/shared/Card'

// ─── Colour palette per disease ────────────────────────────────────────────────
const DISEASE_COLORS = {
  Dengue:    '#f59e0b',
  Malaria:   '#10b981',
  TB:        '#6366f1',
  'COVID-19':'#ef4444',
  Cholera:   '#0ea5e9',
  Typhoid:   '#f97316',
  Other:     '#8b5cf6',
}
const getColor = (name) => DISEASE_COLORS[name] || '#64748b'

// ─── Core data builder ─────────────────────────────────────────────────────────
const buildDiseaseMap = (reports) => {
  const map = {}
  reports.forEach((r) => {
    // Use customDiseaseName when disease is "Other" so it shows real name everywhere
    const displayName = r.diseaseName === 'Other' && r.customDiseaseName
      ? r.customDiseaseName
      : r.diseaseName

    if (!map[displayName]) {
      map[displayName] = {
        disease: displayName,
        confirmed: 0, recovered: 0, deaths: 0,
        submissionCount: 0,
        lastReported: null,
        recent7: 0,
        prev7: 0,
        weeklyData: {},   // week label → confirmed count
      }
    }
    const d = map[displayName]
    d.confirmed  += r.newConfirmed || 0
    d.recovered  += r.newRecovered || 0
    d.deaths     += r.newDeaths    || 0
    d.submissionCount += 1

    const date = new Date(r.createdAt)
    if (!d.lastReported || date > new Date(d.lastReported)) d.lastReported = r.createdAt

    const now = new Date()
    const daysAgo = (now - date) / (1000 * 60 * 60 * 24)
    if (daysAgo <= 7)       d.recent7 += r.newConfirmed || 0
    else if (daysAgo <= 14) d.prev7   += r.newConfirmed || 0

    // Weekly volume (last 6 weeks)
    const weekIdx = Math.floor(daysAgo / 7)
    if (weekIdx < 6) {
      const label = weekIdx === 0 ? 'This Week'
        : weekIdx === 1 ? 'Last Week'
        : `${weekIdx}w ago`
      d.weeklyData[label] = (d.weeklyData[label] || 0) + (r.newConfirmed || 0)
    }
  })

  return Object.values(map).map((d) => {
    const activeCases   = Math.max(0, d.confirmed - d.recovered - d.deaths)
    const recoveryRate  = d.confirmed > 0 ? Math.round((d.recovered / d.confirmed) * 100) : 0
    const mortalityRate = d.confirmed > 0 ? parseFloat(((d.deaths / d.confirmed) * 100).toFixed(1)) : 0
    const trend = d.prev7 === 0
      ? (d.recent7 > 0 ? 'new' : 'stable')
      : d.recent7 > d.prev7 * 1.1 ? 'rising'
      : d.recent7 < d.prev7 * 0.9 ? 'falling'
      : 'stable'
    const daysSinceReport = d.lastReported
      ? Math.floor((new Date() - new Date(d.lastReported)) / (1000 * 60 * 60 * 24))
      : null
    const avgCasesPerReport = d.submissionCount > 0
      ? parseFloat((d.confirmed / d.submissionCount).toFixed(1))
      : 0

    return { ...d, activeCases, recoveryRate, mortalityRate, trend, daysSinceReport, avgCasesPerReport }
  })
}

const trendConfig = {
  rising:  { icon: '↑', color: 'text-red-600',    bg: 'bg-red-50',    label: 'Rising'  },
  falling: { icon: '↓', color: 'text-green-600',  bg: 'bg-green-50',  label: 'Falling' },
  stable:  { icon: '→', color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Stable'  },
  new:     { icon: '★', color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'New'     },
}

// ─── Smart Insights generator ──────────────────────────────────────────────────
const generateInsights = (diseaseData, totalBeds) => {
  const insights = []

  // Most active disease
  const byActive = [...diseaseData].filter(d => d.activeCases > 0).sort((a, b) => b.activeCases - a.activeCases)
  if (byActive.length > 0) {
    const top = byActive[0]
    insights.push({
      type: top.activeCases > 50 ? 'critical' : top.activeCases > 20 ? 'warning' : 'info',
      title: `${top.disease} has the highest active caseload`,
      message: `${top.activeCases} active cases currently. ${top.activeCases > 50 ? 'Immediate attention and resource allocation required.' : 'Monitor closely and ensure adequate staffing.'}`
    })
  }

  // Rising diseases
  const rising = diseaseData.filter(d => d.trend === 'rising')
  rising.forEach(d => {
    insights.push({
      type: 'warning',
      title: `${d.disease} is rising`,
      message: `${d.recent7} new cases this week vs ${d.prev7} last week — a ${Math.round(((d.recent7 - d.prev7) / d.prev7) * 100)}% increase. Consider increasing testing and isolation protocols.`
    })
  })

  // High mortality
  const highMortality = diseaseData.filter(d => d.mortalityRate >= 5 && d.deaths > 0)
  highMortality.forEach(d => {
    insights.push({
      type: 'critical',
      title: `${d.disease} has a high mortality rate (${d.mortalityRate}%)`,
      message: `${d.deaths} death${d.deaths > 1 ? 's' : ''} out of ${d.confirmed} confirmed cases. Review treatment protocols and escalate to senior staff.`
    })
  })

  // Overdue reporting (no report for 3+ days)
  const overdue = diseaseData.filter(d => d.daysSinceReport !== null && d.daysSinceReport >= 3)
  overdue.forEach(d => {
    insights.push({
      type: 'warning',
      title: `${d.disease} reporting is overdue`,
      message: `Last report was ${d.daysSinceReport} day${d.daysSinceReport > 1 ? 's' : ''} ago. Regular reporting is required to keep ward risk levels accurate.`
    })
  })

  // Disease burden vs beds
  if (totalBeds > 0) {
    const totalActive = diseaseData.reduce((s, d) => s + d.activeCases, 0)
    const burdenPct = Math.round((totalActive / totalBeds) * 100)
    if (burdenPct > 80) {
      insights.push({ type: 'critical', title: 'Hospital is near capacity', message: `${totalActive} active cases against ${totalBeds} beds (${burdenPct}% capacity). Consider patient redirection.` })
    } else if (burdenPct > 50) {
      insights.push({ type: 'warning', title: 'Moderate bed pressure', message: `${totalActive} active cases are using ${burdenPct}% of your ${totalBeds} beds. Monitor admissions closely.` })
    }
  }

  // Good performers
  const excellent = diseaseData.filter(d => d.recoveryRate >= 90 && d.confirmed >= 5)
  excellent.forEach(d => {
    insights.push({
      type: 'success',
      title: `${d.disease} outcomes are excellent`,
      message: `${d.recoveryRate}% recovery rate — well above benchmark. Keep up current treatment practices.`
    })
  })

  // No active cases
  const resolved = diseaseData.filter(d => d.activeCases === 0 && d.confirmed > 0)
  if (resolved.length > 0) {
    insights.push({
      type: 'success',
      title: `${resolved.map(d => d.disease).join(', ')} — no active cases`,
      message: `All reported cases have been resolved. Continue monitoring for new cases.`
    })
  }

  return insights
}

// ─── Insight Card ──────────────────────────────────────────────────────────────
const insightStyles = {
  critical: { border: 'border-red-200',    bg: 'bg-red-50',    title: 'text-red-800',    msg: 'text-red-700'    },
  warning:  { border: 'border-orange-200', bg: 'bg-orange-50', title: 'text-orange-800', msg: 'text-orange-700' },
  info:     { border: 'border-blue-200',   bg: 'bg-blue-50',   title: 'text-blue-800',   msg: 'text-blue-700'   },
  success:  { border: 'border-green-200',  bg: 'bg-green-50',  title: 'text-green-800',  msg: 'text-green-700'  },
}

const InsightCard = ({ insight }) => {
  const s = insightStyles[insight.type] || insightStyles.info
  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${s.border} ${s.bg}`}>
      <div>
        <p className={`text-sm font-semibold ${s.title}`}>{insight.title}</p>
        <p className={`text-xs mt-0.5 leading-relaxed ${s.msg}`}>{insight.message}</p>
      </div>
    </div>
  )
}

// ─── Tab: Active Cases Chart ───────────────────────────────────────────────────
const ActiveCasesChart = ({ data }) => {
  const sorted = [...data].filter(d => d.activeCases > 0).sort((a, b) => b.activeCases - a.activeCases)

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-sm font-medium text-gray-600">No active cases right now</p>
        <p className="text-xs text-gray-400 mt-1">All reported cases have been resolved</p>
      </div>
    )
  }

  const topDisease = sorted[0]
  return (
    <>
      <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
        topDisease.activeCases > 50 ? 'bg-red-50 text-red-700 border border-red-200' :
        topDisease.activeCases > 20 ? 'bg-orange-50 text-orange-700 border border-orange-200' :
        'bg-yellow-50 text-yellow-700 border border-yellow-200'
      }`}>
        <strong>{topDisease.disease}</strong> is your biggest active burden with <strong>{topDisease.activeCases} cases</strong>.
        {topDisease.trend === 'rising' && ' This disease is rising — prioritise resources here.'}
        {topDisease.trend === 'falling' && ' Cases are trending down — continue current protocols.'}
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="disease" tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
              tickLine={false} axisLine={false} width={70} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(v) => [v, 'Active Cases']} />
            <Bar dataKey="activeCases" radius={[0, 6, 6, 0]}>
              {sorted.map((d) => <Cell key={d.disease} fill={getColor(d.disease)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

// ─── Tab: Disease Breakdown Table ─────────────────────────────────────────────
const DiseaseBreakdownTable = ({ data }) => {
  const sorted = [...data].sort((a, b) => b.confirmed - a.confirmed)
  const bestRecovery = [...data].filter(d => d.confirmed >= 5).sort((a, b) => b.recoveryRate - a.recoveryRate)[0]

  return (
    <>
      {bestRecovery && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          <strong>{bestRecovery.disease}</strong> has your best recovery rate at <strong>{bestRecovery.recoveryRate}%</strong> — keep up these treatment practices.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase">Disease</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Total</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-green-500 uppercase">Recovered</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-red-400 uppercase">Deaths</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-orange-500 uppercase">Active</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Recovery %</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Avg/Report</th>
              <th className="text-right py-2 pl-3 text-xs font-semibold text-gray-400 uppercase">7-Day Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => {
              const tc = trendConfig[d.trend]
              return (
                <tr key={d.disease} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(d.disease) }} />
                      <span className="font-medium text-gray-800">{d.disease}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-800">{d.confirmed}</td>
                  <td className="py-3 px-3 text-right text-green-600 font-medium">{d.recovered}</td>
                  <td className="py-3 px-3 text-right text-red-600 font-medium">
                    {d.deaths > 0 ? d.deaths : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`font-bold text-lg ${d.activeCases > 50 ? 'text-red-600' : d.activeCases > 20 ? 'text-orange-500' : d.activeCases > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>
                      {d.activeCases > 0 ? d.activeCases : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-14 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, d.recoveryRate)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{d.recoveryRate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-xs text-gray-500">
                    {d.avgCasesPerReport} cases/report
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>
                      {tc.icon} {tc.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Tab: Reporting Compliance ─────────────────────────────────────────────────
const ReportingCompliance = ({ data }) => {
  const sorted = [...data].sort((a, b) => (b.daysSinceReport ?? 999) - (a.daysSinceReport ?? 999))
  const overdueCount = sorted.filter(d => d.daysSinceReport !== null && d.daysSinceReport >= 3).length

  return (
    <>
      {overdueCount > 0 ? (
        <div className="mb-4 px-4 py-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-700">
          <strong>{overdueCount} disease{overdueCount > 1 ? 's' : ''}</strong> {overdueCount > 1 ? 'are' : 'is'} overdue for reporting. Consistent reporting improves the accuracy of your ward's risk level.
        </div>
      ) : (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          All diseases have been reported recently. Great reporting discipline!
        </div>
      )}
      <div className="flex flex-col gap-2">
        {sorted.map((d) => {
          const days = d.daysSinceReport
          const isOverdue = days !== null && days >= 3
          const isRecent  = days !== null && days <= 1
          return (
            <div key={d.disease} className={`flex items-center gap-3 p-3 rounded-lg border ${isOverdue ? 'border-orange-200 bg-orange-50' : isRecent ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(d.disease) }} />
              <span className="text-sm font-medium text-gray-800 flex-1">{d.disease}</span>
              <span className="text-xs text-gray-400">{d.submissionCount} total reports</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isOverdue ? 'bg-orange-200 text-orange-800' : isRecent ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                {days === 0 ? 'Reported today' : days === 1 ? '1 day ago' : days !== null ? `${days} days ago` : 'No reports yet'}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── Tab: Weekly Volume Trend ──────────────────────────────────────────────────
const WeeklyTrend = ({ data }) => {
  const weeks = ['4w ago', '3w ago', '2w ago', 'Last Week', 'This Week']
  const chartData = weeks.map(wk => {
    const point = { week: wk }
    data.forEach(d => { point[d.disease] = d.weeklyData[wk] || 0 })
    return point
  })

  const hasData = chartData.some(wk => Object.values(wk).some((v, i) => i > 0 && v > 0))

  const totalThisWeek = data.reduce((s, d) => s + (d.weeklyData['This Week'] || 0), 0)
  const totalLastWeek = data.reduce((s, d) => s + (d.weeklyData['Last Week'] || 0), 0)
  const weekChange = totalLastWeek > 0
    ? Math.round(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100)
    : null

  return (
    <>
      {weekChange !== null && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium border ${
          weekChange > 20  ? 'bg-red-50 text-red-700 border-red-200' :
          weekChange > 0   ? 'bg-orange-50 text-orange-700 border-orange-200' :
          weekChange < -10 ? 'bg-green-50 text-green-700 border-green-200' :
                             'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          This week has <strong>{totalThisWeek} new confirmed cases</strong>
          {weekChange > 0
            ? ` — ${weekChange}% more than last week. Increase vigilance.`
            : weekChange < 0
            ? ` — ${Math.abs(weekChange)}% fewer than last week. Situation improving.`
            : ` — same as last week.`}
        </div>
      )}
      {hasData ? (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />
              {data.map(d => (
                <Line key={d.disease} type="monotone" dataKey={d.disease}
                  stroke={getColor(d.disease)} strokeWidth={2}
                  dot={{ r: 3, fill: getColor(d.disease) }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-sm text-gray-400">Not enough data for weekly trend analysis yet</p>
        </div>
      )}
    </>
  )
}

// ─── Tab: High Risk (Mortality) ────────────────────────────────────────────────
const HighRiskTable = ({ data }) => {
  const sorted = [...data].filter(d => d.confirmed > 0).sort((a, b) => b.mortalityRate - a.mortalityRate)
  const highRiskCount = sorted.filter(d => d.mortalityRate >= 5).length

  return (
    <>
      <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
        highRiskCount > 0
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-green-50 border-green-200 text-green-700'
      }`}>
        {highRiskCount > 0
          ? `${highRiskCount} disease${highRiskCount > 1 ? 's' : ''} with mortality rate ≥5%. Review treatment protocols and escalate to senior staff.`
          : 'No diseases have crossed the high-risk mortality threshold (5%). Outcomes are under control.'}
        <span className="block text-xs mt-1 opacity-75">
          Mortality Rate = Deaths ÷ Confirmed Cases × 100. It shows how lethal a disease is at your hospital.
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map((d, idx) => {
          const isHigh = d.mortalityRate >= 5
          const isMed  = d.mortalityRate >= 2
          return (
            <div key={d.disease} className={`flex items-center justify-between p-4 rounded-xl border ${isHigh ? 'border-red-200 bg-red-50' : isMed ? 'border-orange-100 bg-orange-50' : 'border-gray-100 bg-gray-50 hover:bg-white transition-colors'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-bold w-6 h-6 flex justify-center items-center rounded-full ${isHigh ? 'text-red-700 bg-red-200' : isMed ? 'text-orange-700 bg-orange-200' : 'text-green-700 bg-green-200'}`}>{idx + 1}</span>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(d.disease) }} />
                <div>
                  <span className="text-base font-bold text-gray-900 block tracking-tight">{d.disease}</span>
                  <span className="text-xs text-gray-500 font-medium">{d.deaths} death{d.deaths !== 1 ? 's' : ''} / {d.confirmed} cases</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`block text-3xl font-black tracking-tighter ${isHigh ? 'text-red-600' : isMed ? 'text-orange-600' : 'text-green-600'}`}>{d.mortalityRate}%</span>
                <span className={`block text-[10px] uppercase tracking-widest font-bold ${isHigh ? 'text-red-400' : isMed ? 'text-orange-400' : 'text-green-500'}`}>Mortality</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

const DiseaseAnalytics = ({ diseaseHistory, latestCapacity }) => {
  const lastFetched = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  if (!diseaseHistory || diseaseHistory.length === 0) {
    return (
      <Card title="Disease Analytics">
        <div className="h-40 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-sm font-medium text-gray-500">No disease data yet</p>
          <p className="text-xs text-gray-400 mt-1">Submit your first disease report to see analytics and insights here</p>
        </div>
      </Card>
    )
  }

  const diseaseData = buildDiseaseMap(diseaseHistory)

  const totalConfirmed = diseaseData.reduce((s, d) => s + d.confirmed, 0)
  const totalRecovered = diseaseData.reduce((s, d) => s + d.recovered, 0)
  const totalDeaths    = diseaseData.reduce((s, d) => s + d.deaths,    0)
  const totalActive    = diseaseData.reduce((s, d) => s + d.activeCases, 0)

  const insights = generateInsights(diseaseData, latestCapacity)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 font-medium mt-1">Live updates as of {lastFetched}</p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases',  value: totalConfirmed, color: 'text-gray-900',   bg: 'bg-white border-2 border-gray-100'    },
          { label: 'Recovered',    value: totalRecovered, color: 'text-green-600',  bg: 'bg-green-50 border-2 border-green-100'   },
          { label: 'Deaths',       value: totalDeaths,    color: 'text-gray-600',    bg: 'bg-white border-2 border-gray-100'     },
          { label: 'Active Now',   value: totalActive,    color: 'text-red-600',    bg: 'bg-red-50 border-2 border-red-100'  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-2xl px-5 py-4 shadow-sm flex flex-col justify-center ${bg}`}>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Single Page Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <h4 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wide">Key Insights</h4>
          <div className="flex flex-col gap-3 flex-1">
            {insights.length > 0
              ? insights.map((ins, i) => <InsightCard key={i} insight={ins} />)
              : (
                <div className="h-full min-h-[160px] flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500 font-medium">No critical insights at this time.</p>
                </div>
              )}
          </div>
        </div>
        
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <h4 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wide">High Risk Diseases</h4>
          <div className="flex-1">
            <HighRiskTable data={diseaseData} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
          <h4 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wide">Active Cases Trend</h4>
          <ActiveCasesChart data={diseaseData} />
        </div>
        
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
          <h4 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wide">Weekly Volume</h4>
          <WeeklyTrend data={diseaseData} />
        </div>
      </div>

      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wide">Overall Breakdown</h4>
        <DiseaseBreakdownTable data={diseaseData} />
      </div>

      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wide">Reporting Compliance</h4>
        <ReportingCompliance data={diseaseData} />
      </div>

    </div>
  )
}

export default DiseaseAnalytics