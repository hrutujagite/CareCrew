import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

import Navbar from '../../components/shared/Navbar'
import Card, { StatCard } from '../../components/shared/Card'
import { InlineLoader } from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import Heatmap from './Heatmap'
import ForecastGraph from './ForecastGraph'

// ─── Print styles ─────────────────────────────────────────────────────────────
const printStyles = `
  @media print {
    body * { visibility: hidden !important; }
    #ward-report-modal, #ward-report-modal * { visibility: visible !important; }
    #ward-report-modal {
      position: fixed !important; left: 0 !important; top: 0 !important;
      width: 100% !important; max-width: 100% !important;
      max-height: none !important; overflow: visible !important;
      box-shadow: none !important; border-radius: 0 !important; padding: 20px !important;
    }
    #ward-report-modal button { display: none !important; }
  }
`

// ─── Disease colours ──────────────────────────────────────────────────────────
const DISEASE_COLORS = {
  Dengue: '#EF4444',
  Malaria: '#F59E0B',
  TB: '#8B5CF6',
  Typhoid: '#10B981',
  Cholera: '#3B82F6',
}
const DISEASES = Object.keys(DISEASE_COLORS)

// ─── Safe array extractor ─────────────────────────────────────────────────────
const toArray = (data, key) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (key && Array.isArray(data[key])) return data[key]
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.results)) return data.results
  return []
}

const getCases = (ward) => ward.todayCases ?? ward.activeCases ?? 0

// ─── HAI Score ────────────────────────────────────────────────────────────────
const calcHAI = (ward) => {
  const availableBeds = ward.availableBeds || 0
  const population = ward.population || 1
  const hospitals = ward.hospitals || 0
  const activeCases = ward.activeCases || ward.todayCases || 0
  const score =
    (availableBeds / population) * 100000
    + hospitals * 5
    - activeCases * 0.5
  return Math.round(Math.min(100, Math.max(0, score)))
}

const haiBg = (score) => {
  if (score > 70) return { bg: '#D1FAE5', text: '#065F46', ring: '#6EE7B7', label: 'Good' }
  if (score >= 40) return { bg: '#FEF3C7', text: '#92400E', ring: '#FDE68A', label: 'Moderate' }
  return { bg: '#FEE2E2', text: '#991B1B', ring: '#FCA5A5', label: 'Critical' }
}

// ─── Pill styles ──────────────────────────────────────────────────────────────
const pillBase = {
  display: 'inline-block', fontSize: '11px', fontWeight: 600,
  padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
}
const pillStyles = {
  green: { ...pillBase, background: '#D1FAE5', color: '#065F46' },
  yellow: { ...pillBase, background: '#FEF3C7', color: '#92400E' },
  red: { ...pillBase, background: '#FEE2E2', color: '#991B1B' },
  gray: { ...pillBase, background: '#F3F4F6', color: '#6B7280' },
}

const RiskPill = ({ value }) => {
  if (!value) return <span style={pillStyles.gray}>—</span>
  const v = value.toLowerCase()
  if (v === 'green') return <span style={pillStyles.green}>{value}</span>
  if (v === 'yellow') return <span style={pillStyles.yellow}>{value}</span>
  return <span style={pillStyles.red}>{value}</span>
}

const MedicinePill = ({ ward }) => {
  const pct = ward.medicineStockPercentage
  const str = (ward.medicineLevel || '').toLowerCase()
  if (typeof pct === 'number') {
    if (pct >= 60) return <span style={pillStyles.green}>Sufficient</span>
    if (pct >= 25) return <span style={pillStyles.yellow}>Barely Sufficient</span>
    return <span style={pillStyles.red}>Insufficient</span>
  }
  if (str === 'full') return <span style={pillStyles.green}>Sufficient</span>
  if (str === 'medium') return <span style={pillStyles.yellow}>Barely Sufficient</span>
  if (str === 'low') return <span style={pillStyles.yellow}>Barely Sufficient</span>
  if (str === 'critical') return <span style={pillStyles.red}>Insufficient</span>
  return <span style={pillStyles.gray}>—</span>
}

// ─── CSV Export — all wards ───────────────────────────────────────────────────
const exportCSV = (wards) => {
  const headers = ['Ward', 'Zone', 'Cases Today', 'Top Disease', 'Beds Available', 'ICU Available', 'Risk Level', 'Medicine Stock']
  const rows = wards.map((w) => {
    const pct = w.medicineStockPercentage
    const med = typeof pct === 'number'
      ? pct >= 60 ? 'Sufficient' : pct >= 25 ? 'Barely Sufficient' : 'Insufficient' : '—'
    return [w.wardName, w.wardCode || '', getCases(w), w.topDisease || '',
    w.availableBeds ?? 0, w.icuAvailable ?? 0, w.riskLevel || '', med]
  })
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'ward-report.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── CSV Export — alert zones only ───────────────────────────────────────────
const exportAlertZonesCSV = (wards, alerts) => {
  const alertWardNames = new Set(alerts.filter((a) => a.isActive).map((a) => a.wardName))
  const alertZones = wards.filter(
    (w) => alertWardNames.has(w.wardName) ||
      ['red', 'yellow'].includes((w.riskLevel || '').toLowerCase())
  )
  if (alertZones.length === 0) { alert('No alert zones to export.'); return }
  const headers = ['Ward', 'Zone', 'Cases', 'Top Disease', 'Beds', 'ICU', 'Risk', 'Medicine Stock', 'Alert Type', 'Severity']
  const rows = alertZones.map((w) => {
    const matched = alerts.find((a) => a.wardName === w.wardName && a.isActive)
    const pct = w.medicineStockPercentage
    const med = typeof pct === 'number'
      ? pct >= 60 ? 'Sufficient' : pct >= 25 ? 'Barely Sufficient' : 'Insufficient' : '—'
    return [w.wardName, w.wardCode || '', getCases(w), w.topDisease || '',
    w.availableBeds ?? 0, w.icuAvailable ?? 0, w.riskLevel || '', med,
    matched?.alertType || '—', matched?.severity || '—']
  })
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'alert-zones-report.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── Ward Table ───────────────────────────────────────────────────────────────
const thStyle = {
  padding: '12px 16px', textAlign: 'left', fontSize: '12px',
  fontWeight: 700, color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.4)',
  whiteSpace: 'nowrap', background: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em'
}
const td = { padding: '14px 16px', color: '#1E293B', verticalAlign: 'middle', borderBottom: '1px solid rgba(0,0,0,0.03)' }

// ✅ WardTable defined OUTSIDE Dashboard to prevent DataCloneError
const WardTable = ({ wards, onReport }) => {
  const [sortKey, setSortKey] = useState('wardName')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...wards].sort((a, b) => {
    let aVal, bVal
    switch (sortKey) {
      case 'wardName': aVal = a.wardName || ''; bVal = b.wardName || ''; break
      case 'todayCases': aVal = getCases(a); bVal = getCases(b); break
      case 'topDisease': aVal = a.topDisease || ''; bVal = b.topDisease || ''; break
      case 'availableBeds': aVal = a.availableBeds ?? 0; bVal = b.availableBeds ?? 0; break
      case 'icuAvailable': aVal = a.icuAvailable ?? 0; bVal = b.icuAvailable ?? 0; break
      case 'riskLevel': {
        const order = { red: 0, yellow: 1, green: 2 }
        aVal = order[(a.riskLevel || '').toLowerCase()] ?? 3
        bVal = order[(b.riskLevel || '').toLowerCase()] ?? 3
        break
      }
      case 'medicineStock': aVal = a.medicineStockPercentage ?? 0; bVal = b.medicineStockPercentage ?? 0; break
      default: aVal = ''; bVal = ''
    }
    if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ color: '#CBD5E1', marginLeft: '4px' }}>↕</span>
    return <span style={{ color: '#2563EB', marginLeft: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const SortableTh = ({ col, label }) => (
    <th
      onClick={() => handleSort(col)}
      style={{
        ...thStyle, cursor: 'pointer', userSelect: 'none',
        background: sortKey === col ? '#EFF6FF' : '#F8FAFC',
        color: sortKey === col ? '#2563EB' : '#64748B',
      }}
    >
      {label}<SortIcon col={col} />
    </th>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <SortableTh col='wardName' label='Ward Name' />
            <th style={thStyle}>Zone</th>
            <SortableTh col='todayCases' label='Cases Today' />
            <SortableTh col='topDisease' label='Top Disease' />
            <SortableTh col='availableBeds' label='Beds Available' />
            <SortableTh col='icuAvailable' label='ICU Available' />
            <SortableTh col='riskLevel' label='Risk Level' />
            <SortableTh col='medicineStock' label='Medicine Stock' />
            <th style={thStyle}>Last Updated</th>
            <th style={thStyle}>Report</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ward, i) => (
            <tr
              key={ward.wardName || i}
              style={{ transition: 'all 0.2s', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
            >
              <td style={td}><strong>{ward.wardName}</strong></td>
              <td style={td}>{ward.wardCode || '—'}</td>
              <td style={td}>{getCases(ward)}</td>
              <td style={td}>{ward.topDisease || '—'}</td>
              <td style={td}>{ward.availableBeds ?? '—'}</td>
              <td style={td}>{ward.icuAvailable ?? '—'}</td>
              <td style={td}><RiskPill value={ward.riskLevel} /></td>
              <td style={td}><MedicinePill ward={ward} /></td>
              <td style={{ ...td, color: '#94A3B8', fontSize: '12px' }}>
                {ward.lastUpdated ? new Date(ward.lastUpdated).toLocaleTimeString() : '—'}
              </td>
              <td style={td}>
                <button
                  onClick={() => onReport(ward)}
                  style={{
                    background: '#2563EB', color: '#fff', border: 'none',
                    borderRadius: '6px', padding: '5px 12px', fontSize: '11px',
                    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  📋 Report
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── HAI Card ─────────────────────────────────────────────────────────────────
const HAICard = ({ ward }) => {
  const score = calcHAI(ward)
  const { bg, text, ring, label } = haiBg(score)
  const barColor = score > 70 ? '#16A34A' : score >= 40 ? '#D97706' : '#DC2626'

  return (
    <div
      className="glass-card border-white/50"
      style={{
        padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px',
        borderRadius: '16px', transition: 'all 0.3s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 40px -10px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', lineHeight: 1.3, maxWidth: '110px' }}>
          {ward.wardName}
        </p>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px',
          borderRadius: '20px', whiteSpace: 'nowrap',
          background: bg, color: text, border: `1px solid ${ring}`,
        }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
        <span style={{ fontSize: '32px', fontWeight: 800, color: barColor, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>/100</span>
      </div>
      <div style={{ background: '#F1F5F9', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
        <div style={{
          width: `${score}%`, height: '6px', background: barColor,
          borderRadius: '6px', transition: 'width 0.6s ease',
        }} />
      </div>
      <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
        <span style={{ color: '#64748B', fontWeight: 600 }}>
          {ward.activeCases ?? ward.todayCases ?? 0}
        </span> active cases
      </p>
    </div>
  )
}

// ─── Ward Report Modal ────────────────────────────────────────────────────────
const WardReportModal = ({ ward, alerts, onClose }) => {
  if (!ward) return null

  const wardAlerts = alerts.filter((a) => a.wardName === ward.wardName && a.isActive)
  const hai = calcHAI(ward)
  const haiColor = hai > 70 ? '#16A34A' : hai >= 40 ? '#D97706' : '#DC2626'
  const haiLabel = hai > 70 ? 'Good' : hai >= 40 ? 'Moderate' : 'Critical'
  const bedOccupancy = ward.totalBeds
    ? Math.round(((ward.totalBeds - ward.availableBeds) / ward.totalBeds) * 100) : 0
  const icuOccupancy = ward.icuTotal
    ? Math.round(((ward.icuTotal - ward.icuAvailable) / ward.icuTotal) * 100) : 0
  const medPct = ward.medicineStockPercentage ?? 0
  const medColor = medPct >= 60 ? '#16A34A' : medPct >= 25 ? '#D97706' : '#DC2626'
  const medLabel = medPct >= 60 ? 'Sufficient' : medPct >= 25 ? 'Barely Sufficient' : 'Insufficient'
  const riskColor = ward.riskLevel === 'Green' ? '#16A34A'
    : ward.riskLevel === 'Yellow' ? '#D97706' : '#DC2626'

  const MetricRow = ({ label, value, color }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid #F1F5F9'
    }}>
      <span style={{ fontSize: '13px', color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: color || '#1E293B' }}>{value}</span>
    </div>
  )

  const ProgressBar = ({ label, value, max, color }) => {
    const pct = max ? Math.round((value / max) * 100) : 0
    return (
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>{label}</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color }}>{value} / {max} ({pct}%)</span>
        </div>
        <div style={{ background: '#F1F5F9', borderRadius: '6px', height: '8px' }}>
          <div style={{ width: `${pct}%`, background: color, height: '8px', borderRadius: '6px', transition: 'width 0.5s ease' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <style>{printStyles}</style>
      <div id='ward-report-modal' style={{
        background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#fff', zIndex: 10
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{ward.wardName}</h2>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
              Ward Code: {ward.wardCode} &nbsp;·&nbsp;
              Population: {(ward.population || 0).toLocaleString()} &nbsp;·&nbsp;
              Last updated: {ward.lastUpdated ? new Date(ward.lastUpdated).toLocaleTimeString() : '—'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#F1F5F9', border: 'none', borderRadius: '8px',
            width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748B', flexShrink: 0
          }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{
              background: ward.riskLevel === 'Green' ? '#F0FDF4' : ward.riskLevel === 'Yellow' ? '#FFFBEB' : '#FEF2F2',
              border: `1.5px solid ${riskColor}`, borderRadius: '12px', padding: '16px', textAlign: 'center'
            }}>
              <p style={{ fontSize: '11px', color: riskColor, fontWeight: 600, marginBottom: '4px' }}>RISK LEVEL</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: riskColor }}>{ward.riskLevel || '—'}</p>
              <p style={{ fontSize: '12px', color: riskColor, marginTop: '2px' }}>
                {ward.activeCases || ward.todayCases || 0} active cases
              </p>
            </div>
            <div style={{
              background: hai > 70 ? '#F0FDF4' : hai >= 40 ? '#FFFBEB' : '#FEF2F2',
              border: `1.5px solid ${haiColor}`, borderRadius: '12px', padding: '16px', textAlign: 'center'
            }}>
              <p style={{ fontSize: '11px', color: haiColor, fontWeight: 600, marginBottom: '4px' }}>HAI SCORE</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: haiColor }}>
                {hai}<span style={{ fontSize: '14px' }}>/100</span>
              </p>
              <p style={{ fontSize: '12px', color: haiColor, marginTop: '2px' }}>{haiLabel}</p>
            </div>
          </div>

          {wardAlerts.length > 0 && (
            <div style={{ background: '#FEF2F2', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', marginBottom: '8px' }}>
                ⚠️ ACTIVE ALERTS ({wardAlerts.length})
              </p>
              {wardAlerts.map((a) => (
                <div key={a._id} style={{ fontSize: '13px', color: '#7F1D1D', padding: '4px 0', borderBottom: '1px solid #FECACA' }}>
                  <strong>{a.alertType}</strong> — Severity: {a.severity}
                  {a.message ? ` — ${a.message}` : ''}
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '14px' }}>🛏️ Capacity Status</p>
            <ProgressBar label='Beds Available' value={ward.availableBeds ?? 0} max={ward.totalBeds ?? 0}
              color={ward.availableBeds < 10 ? '#DC2626' : '#16A34A'} />
            <ProgressBar label='ICU Available' value={ward.icuAvailable ?? 0} max={ward.icuTotal ?? 0}
              color={ward.icuAvailable < 3 ? '#DC2626' : '#2563EB'} />
            <ProgressBar label='Medicine Stock' value={medPct} max={100} color={medColor} />
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>📊 Key Metrics</p>
            <MetricRow label='Top Disease' value={ward.topDisease || '—'} />
            <MetricRow label='Cases Today' value={ward.todayCases ?? 0} />
            <MetricRow label='Active Cases (total)' value={ward.activeCases ?? 0} color={riskColor} />
            <MetricRow label='Hospitals in Ward' value={ward.hospitals ?? 0} />
            <MetricRow label='Total Beds' value={ward.totalBeds ?? 0} />
            <MetricRow label='Available Beds' value={ward.availableBeds ?? 0}
              color={ward.availableBeds < 10 ? '#DC2626' : '#16A34A'} />
            <MetricRow label='ICU Total' value={ward.icuTotal ?? 0} />
            <MetricRow label='ICU Available' value={ward.icuAvailable ?? 0}
              color={ward.icuAvailable < 3 ? '#DC2626' : '#16A34A'} />
            <MetricRow label='Medicine Stock' value={`${medPct}% — ${medLabel}`} color={medColor} />
            <MetricRow label='Population' value={(ward.population || 0).toLocaleString()} />
            <MetricRow label='Bed Occupancy' value={`${bedOccupancy}%`}
              color={bedOccupancy > 80 ? '#DC2626' : '#16A34A'} />
            <MetricRow label='ICU Occupancy' value={`${icuOccupancy}%`}
              color={icuOccupancy > 80 ? '#DC2626' : '#16A34A'} />
          </div>

          <button
            onClick={() => {
              const printWindow = window.open('', '_blank')
              printWindow.document.write(`
                <!DOCTYPE html><html><head><title>${ward.wardName} — Ward Report</title>
                <style>
                  * { margin:0;padding:0;box-sizing:border-box; }
                  body { font-family:Arial,sans-serif;padding:20px;color:#1E293B;font-size:12px; }
                  h1 { font-size:18px;font-weight:700;margin-bottom:2px; }
                  .sub { font-size:11px;color:#94A3B8;margin-bottom:12px; }
                  .grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px; }
                  .card { border:1.5px solid #E2E8F0;border-radius:8px;padding:10px;text-align:center; }
                  .label { font-size:10px;font-weight:600;color:#64748B;margin-bottom:4px;text-transform:uppercase; }
                  .big { font-size:24px;font-weight:700; }
                  .section { background:#F8FAFC;border-radius:8px;padding:10px;margin-bottom:10px; }
                  .section-title { font-size:12px;font-weight:600;margin-bottom:8px; }
                  .bar-label { display:flex;justify-content:space-between;font-size:11px;color:#64748B;margin-bottom:3px; }
                  .bar-track { background:#E2E8F0;border-radius:4px;height:6px;margin-bottom:8px; }
                  .bar-fill { height:6px;border-radius:4px; }
                  .row { display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #F1F5F9;font-size:12px; }
                  .row-label { color:#64748B; } .row-val { font-weight:600; }
                  @media print { body { padding:12px; } @page { margin:10mm;size:A4; } }
                </style></head><body>
                <h1>${ward.wardName}</h1>
                <p class="sub">Ward Code: ${ward.wardCode} · Population: ${(ward.population || 0).toLocaleString()} · Printed: ${new Date().toLocaleString()}</p>
                <div class="grid">
                  <div class="card" style="border-color:${ward.riskLevel === 'Green' ? '#6EE7B7' : ward.riskLevel === 'Yellow' ? '#FDE68A' : '#FCA5A5'}">
                    <div class="label">Risk Level</div>
                    <div class="big" style="color:${ward.riskLevel === 'Green' ? '#065F46' : ward.riskLevel === 'Yellow' ? '#92400E' : '#991B1B'}">${ward.riskLevel || '—'}</div>
                    <div style="font-size:13px;color:#64748B;margin-top:4px">${ward.activeCases || 0} active cases</div>
                  </div>
                  <div class="card">
                    <div class="label">HAI Score</div>
                    <div class="big">${ward.accessibilityIndex || 0}/100</div>
                  </div>
                </div>
                <div class="section">
                  <div class="section-title">🛏️ Capacity Status</div>
                  <div class="bar-label"><span>Beds Available</span><span>${ward.availableBeds || 0} / ${ward.totalBeds || 0}</span></div>
                  <div class="bar-track"><div class="bar-fill" style="width:${ward.totalBeds ? Math.round(((ward.availableBeds || 0) / (ward.totalBeds || 1)) * 100) : 0}%;background:${(ward.availableBeds || 0) < 10 ? '#DC2626' : '#16A34A'}"></div></div>
                  <div class="bar-label"><span>ICU Available</span><span>${ward.icuAvailable || 0} / ${ward.icuTotal || 0}</span></div>
                  <div class="bar-track"><div class="bar-fill" style="width:${ward.icuTotal ? Math.round(((ward.icuAvailable || 0) / (ward.icuTotal || 1)) * 100) : 0}%;background:${(ward.icuAvailable || 0) < 3 ? '#DC2626' : '#2563EB'}"></div></div>
                  <div class="bar-label"><span>Medicine Stock</span><span>${ward.medicineStockPercentage || 0}%</span></div>
                  <div class="bar-track"><div class="bar-fill" style="width:${ward.medicineStockPercentage || 0}%;background:${(ward.medicineStockPercentage || 0) >= 60 ? '#16A34A' : (ward.medicineStockPercentage || 0) >= 25 ? '#D97706' : '#DC2626'}"></div></div>
                </div>
                <div class="section">
                  <div class="section-title">📊 Key Metrics</div>
                  <div class="row"><span class="row-label">Top Disease</span><span class="row-val">${ward.topDisease || '—'}</span></div>
                  <div class="row"><span class="row-label">Cases Today</span><span class="row-val">${ward.todayCases || 0}</span></div>
                  <div class="row"><span class="row-label">Active Cases</span><span class="row-val">${ward.activeCases || 0}</span></div>
                  <div class="row"><span class="row-label">Total Beds</span><span class="row-val">${ward.totalBeds || 0}</span></div>
                  <div class="row"><span class="row-label">Available Beds</span><span class="row-val">${ward.availableBeds || 0}</span></div>
                  <div class="row"><span class="row-label">ICU Total</span><span class="row-val">${ward.icuTotal || 0}</span></div>
                  <div class="row"><span class="row-label">ICU Available</span><span class="row-val">${ward.icuAvailable || 0}</span></div>
                  <div class="row"><span class="row-label">Medicine Stock</span><span class="row-val">${ward.medicineStockPercentage || 0}%</span></div>
                  <div class="row"><span class="row-label">Population</span><span class="row-val">${(ward.population || 0).toLocaleString()}</span></div>
                  <div class="row"><span class="row-label">Bed Occupancy</span><span class="row-val">${ward.totalBeds ? Math.round(((ward.totalBeds - ward.availableBeds) / ward.totalBeds) * 100) : 0}%</span></div>
                  <div class="row"><span class="row-label">ICU Occupancy</span><span class="row-val">${ward.icuTotal ? Math.round(((ward.icuTotal - ward.icuAvailable) / ward.icuTotal) * 100) : 0}%</span></div>
                </div>
                <p style="font-size:11px;color:#94A3B8;text-align:center;margin-top:24px">
                  CareCrew — Solapur Municipal Corporation · Generated: ${new Date().toLocaleString()}
                </p>
                </body></html>
              `)
              printWindow.document.close()
              printWindow.focus()
              setTimeout(() => printWindow.print(), 500)
            }}
            style={{
              background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px',
              padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%'
            }}
          >
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { token } = useAuth()
  const [wards, setWards] = useState([])
  const [alerts, setAlerts] = useState([])
  const [charts, setCharts] = useState({ topDiseases: [], dailyCases: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dismissedIds, setDismissedIds] = useState(new Set())
  const [countdown, setCountdown] = useState(30)
  const [search, setSearch] = useState('')
  const [selectedWard, setSelectedWard] = useState(null)
  const [activeDiseases, setActiveDiseases] = useState(new Set(DISEASES))

  const authHeaders = { Authorization: `Bearer ${token}` }

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [wardsRes, alertsRes, chartsRes] = await Promise.all([
        axios.get('https://carecrew-1.onrender.com/api/dashboard/wards', { headers: authHeaders }),
        axios.get('https://carecrew-1.onrender.com/api/dashboard/alerts', { headers: authHeaders }),
        axios.get('https://carecrew-1.onrender.com/api/dashboard/charts', { headers: authHeaders }),
      ])
      setWards(toArray(wardsRes.data, 'wards'))
      setAlerts(toArray(alertsRes.data, 'alerts'))
      const cd = chartsRes.data || {}
      setCharts({
        topDiseases: toArray(cd.topDiseases, 'topDiseases'),
        dailyCases: toArray(cd.dailyCases, 'dailyCases'),
      })
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
  fetchData()
}, [fetchData])
  const toggleDisease = (disease) => {
    setActiveDiseases(prev => {
      const next = new Set(prev)
      next.has(disease) ? next.delete(disease) : next.add(disease)
      return next
    })
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalCases = wards.reduce((s, w) => s + getCases(w), 0)
  const wardsOnAlert = alerts.filter((a) => a.isActive).length
  const hospitalsReporting = [...new Set(wards.map((w) => w.hospitalName).filter(Boolean))].length
  const alertZoneCount = wards.filter(
    (w) => alerts.some((a) => a.isActive && a.wardName === w.wardName) ||
      ['red', 'yellow'].includes((w.riskLevel || '').toLowerCase())
  ).length
  const activeAlerts = alerts.filter((a) => a.isActive && !dismissedIds.has(a._id))
  const filteredWards = wards.filter((w) =>
    w.wardName.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className='min-h-screen flex flex-col'>
        <Navbar />
        <div className='flex-1 flex items-center justify-center'><InlineLoader /></div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50 relative overflow-hidden z-0'>
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary-200/30 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-brand/20 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply"></div>
      <Navbar />

      <WardReportModal ward={selectedWard} alerts={alerts} onClose={() => setSelectedWard(null)} />

      {/* Alert Banners */}
      {activeAlerts.length > 0 && (
        <div style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA', padding: '10px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#DC2626', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                🚨 {activeAlerts.length} ACTIVE ALERT{activeAlerts.length > 1 ? 'S' : ''}
              </span>
              <span style={{ fontSize: '12px', color: '#991B1B' }}>Immediate attention required</span>
            </div>
            <button
              onClick={() => setDismissedIds(new Set(activeAlerts.map(a => a._id)))}
              style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#991B1B', cursor: 'pointer', fontWeight: 600 }}
            >Dismiss All</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {activeAlerts.map((a) => {
              const isRed = a.severity?.toLowerCase() === 'red'
              return (
                <div key={a._id} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: isRed ? '#FEE2E2' : '#FEF3C7',
                  border: `1px solid ${isRed ? '#FCA5A5' : '#FDE68A'}`,
                  borderRadius: '8px', padding: '5px 10px',
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: isRed ? '#DC2626' : '#D97706', display: 'inline-block' }} />
                  <span style={{ fontSize: '12px', color: isRed ? '#7F1D1D' : '#78350F', fontWeight: 600 }}>{a.wardName}</span>
                  <span style={{ fontSize: '10px', color: isRed ? '#991B1B' : '#92400E', background: isRed ? '#FECACA' : '#FDE68A', padding: '1px 6px', borderRadius: '20px', fontWeight: 600 }}>{a.severity}</span>
                  <span style={{ fontSize: '11px', color: isRed ? '#B91C1C' : '#B45309' }}>{a.alertType}</span>
                  <span
                    onClick={() => setDismissedIds((prev) => new Set([...prev, a._id]))}
                    style={{ cursor: 'pointer', fontSize: '12px', color: isRed ? '#991B1B' : '#92400E', marginLeft: '2px', fontWeight: 700 }}
                  >✕</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6'>

        {/* ── Summary Ribbon ── */}
        {wards.length > 0 && (() => {
          const highestRiskWard = wards
            .filter(w => (w.riskLevel || '').toLowerCase() === 'red')
            .sort((a, b) => (b.activeCases || 0) - (a.activeCases || 0))[0]
            || wards.slice().sort((a, b) => (b.activeCases || 0) - (a.activeCases || 0))[0]

          const diseaseMap = {}
          wards.forEach(w => {
            if (w.topDisease && w.topDisease !== 'None')
              diseaseMap[w.topDisease] = (diseaseMap[w.topDisease] || 0) + (w.todayCases || 0)
          })
          const topDisease = Object.entries(diseaseMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

          const stats = [
            {
              icon: '🦠', label: 'Total Active Cases',
              value: totalCases.toLocaleString(),
              valueColor: totalCases > 200 ? '#DC2626' : totalCases > 100 ? '#D97706' : '#16A34A',
              bg: '#F8FAFC', border: '#E2E8F0',
            },
            {
              icon: '🚨', label: 'Highest Risk Ward',
              value: highestRiskWard?.wardName || '—',
              sub: highestRiskWard ? `${highestRiskWard.activeCases || 0} active cases` : '',
              valueColor: highestRiskWard?.riskLevel?.toLowerCase() === 'red' ? '#DC2626'
                : highestRiskWard?.riskLevel?.toLowerCase() === 'yellow' ? '#D97706' : '#16A34A',
              bg: '#FFF8F8', border: '#FCA5A5',
            },
            {
              icon: '🔬', label: 'Most Reported Disease',
              value: topDisease,
              sub: diseaseMap[topDisease] ? `${diseaseMap[topDisease]} cases today` : '',
              valueColor: '#7C3AED',
              bg: '#FAF5FF', border: '#DDD6FE',
            },
          ]

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '4px' }}>
              {stats.map(({ icon, label, value, sub, valueColor, bg, border }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', border: `1px solid rgba(255,255,255,0.4)`, borderRadius: '16px',
                  padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)'
                }}>
                  <span style={{ fontSize: '26px', lineHeight: 1 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                      {label}
                    </p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: valueColor, lineHeight: 1.1 }}>{value}</p>
                    {sub && <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Page Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div>
            <h1 className='text-3xl font-extrabold text-slate-800 tracking-tight'>Health Officer Dashboard</h1>
            <p className='text-sm font-medium text-slate-500 flex items-center gap-2 mt-1.5'>
  <span className='w-2 h-2 rounded-full bg-primary-500'></span>
  Last updated: {new Date().toLocaleTimeString()}
</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => exportCSV(wards)} disabled={wards.length === 0}
              style={{ backgroundColor: wards.length === 0 ? '#BFDBFE' : '#2563EB', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: wards.length === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 14px 0 rgba(37,99,235,0.3)', transition: 'all 0.2s', transform: 'translateY(0)' }}
              onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'translateY(0)')}>
              ⬇ Export All Wards
            </button>
            <button onClick={() => exportAlertZonesCSV(wards, alerts)} disabled={alertZoneCount === 0}
              style={{ backgroundColor: alertZoneCount === 0 ? '#FCA5A5' : '#EF4444', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: alertZoneCount === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 14px 0 rgba(239,68,68,0.3)', transition: 'all 0.2s', transform: 'translateY(0)' }}
              onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'translateY(0)')}>
              🚨 Export Alert Zones ({alertZoneCount})
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px 16px', color: '#991B1B', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* 3 Stat Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <StatCard title='Active Cases Today' value={totalCases} icon='🦠' />
          <StatCard title='Wards on Alert' value={wardsOnAlert} icon='⚠️' />
          <StatCard title='Hospitals Reporting' value={hospitalsReporting} icon='🏥' />
        </div>

        {/* Ward Table */}
        <div className="glass-panel border border-white/60 shadow-soft rounded-2xl overflow-hidden mb-6">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>Ward-wise Overview</h2>
            <input
              type='text' placeholder='Search ward...' value={search}
              style={{ padding: '8px 14px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '10px', outline: 'none', width: '220px', color: '#1E293B', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)', boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.02)' }}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filteredWards.length === 0 ? (
            <p style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>No ward data available.</p>
          ) : (
            <WardTable wards={filteredWards} onReport={(ward) => setSelectedWard(ward)} />
          )}
        </div>

        {/* Charts */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <Card>
            <div className='p-4 border-b border-gray-100'>
              <h2 className='text-base font-semibold text-gray-800'>Top 5 Diseases This Week</h2>
            </div>
            <div className='p-4'>
              {charts.topDiseases.length === 0 ? (
                <p className='text-gray-400 text-sm text-center py-10'>No data available.</p>
              ) : (
                <ResponsiveContainer width='100%' height={240}>
                  <BarChart data={charts.topDiseases.slice(0, 5)}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='disease' tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey='count' fill='#3B82F6' radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* ✅ Disease-wise daily cases — multi-line with toggle pills */}
          <Card>
            <div className='p-4 border-b border-gray-100'>
              <h2 className='text-base font-semibold text-gray-800'>Daily Cases by Disease — Last 14 Days</h2>
            </div>
            <div className='p-4'>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {DISEASES.map(disease => {
                  const isOn = activeDiseases.has(disease)
                  return (
                    <button
                      key={disease}
                      onClick={() => toggleDisease(disease)}
                      style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', border: `1.5px solid ${DISEASE_COLORS[disease]}`,
                        background: isOn ? DISEASE_COLORS[disease] : '#fff',
                        color: isOn ? '#fff' : DISEASE_COLORS[disease],
                        transition: 'all 0.15s',
                      }}
                    >
                      {disease}
                    </button>
                  )
                })}
              </div>
              {charts.dailyCases.length === 0 ? (
                <p className='text-gray-400 text-sm text-center py-10'>No data available.</p>
              ) : (
                <ResponsiveContainer width='100%' height={240}>
                  <LineChart data={charts.dailyCases.slice(-14)}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#F1F5F9' />
                    <XAxis dataKey='date' tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                      formatter={(value, name) => [value + ' cases', name]} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    {DISEASES.filter(d => activeDiseases.has(d)).map(disease => (
                      <Line key={disease} type='monotone' dataKey={disease} name={disease}
                        stroke={DISEASE_COLORS[disease]} strokeWidth={2}
                        dot={{ r: 2, fill: DISEASE_COLORS[disease] }} activeDot={{ r: 4 }}
                        connectNulls={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* HAI Score Cards */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              Healthcare Accessibility Index (HAI)
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '10px' }}>
              The <strong>HAI score</strong> measures how easily residents of a ward can access quality healthcare.
              It factors in <strong>available beds</strong>, <strong>number of hospitals</strong>, and
              <strong> active disease burden</strong> — giving a single 0–100 score per ward.
              A higher score means better access; a lower score signals overcrowding or under-resourced facilities.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {[
                { color: '#16A34A', bg: '#D1FAE5', ring: '#6EE7B7', label: '🟢 Above 70', desc: 'Good — Adequate facilities, low disease pressure' },
                { color: '#92400E', bg: '#FEF3C7', ring: '#FDE68A', label: '🟡 40 – 70', desc: 'Moderate — Some strain, monitor closely' },
                { color: '#991B1B', bg: '#FEE2E2', ring: '#FCA5A5', label: '🔴 Below 40', desc: 'Critical — Overburdened, immediate action needed' },
              ].map(({ color, bg, ring, label, desc }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  background: bg, border: `1px solid ${ring}`,
                  borderRadius: '8px', padding: '8px 12px', flex: '1 1 220px',
                }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 700, color, marginBottom: '2px' }}>{label}</p>
                    <p style={{ fontSize: '11px', color, opacity: 0.85 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', borderTop: '1px dashed #E2E8F0', paddingTop: '8px' }}>
              💡 <strong>Ideal target:</strong> All wards should maintain a score above <strong>70</strong>.
              Scores below 40 indicate critical shortage of beds or high active caseload and require
              immediate resource allocation or inter-ward patient transfer.
            </p>
          </div>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {wards.length === 0 ? (
              <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94A3B8', fontSize: '14px', padding: '24px' }}>
                No ward data available.
              </p>
            ) : (
              wards.map((ward) => <HAICard key={ward.wardName} ward={ward} />)
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>Solapur Ward Heatmap</h2>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Live case distribution across all wards</p>
          </div>
          <div style={{ padding: '16px' }}><Heatmap /></div>
        </div>

        {/* Forecast Graph */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>Disease Forecast</h2>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>14 days actual + 7 days predicted trend</p>
          </div>
          <div style={{ padding: '16px' }}><ForecastGraph /></div>
        </div>

      </div>
    </div>
  )
}
