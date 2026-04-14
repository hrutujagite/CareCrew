import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
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
const PIE_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6']

// ─── Green zone generic recommendations ──────────────────────────────────────
const GREEN_ZONE_RECOMMENDATIONS = [
  { icon: '✅', title: 'Maintain Surveillance', text: 'Continue routine weekly disease surveillance reporting. Ensure all hospitals submit data on time.' },
  { icon: '💉', title: 'Preventive Outreach', text: 'Schedule monthly community health camps for preventive checkups and vaccinations.' },
  { icon: '🧹', title: 'Sanitation Checks', text: 'Conduct fortnightly sanitation inspections in high-density residential areas.' },
  { icon: '📋', title: 'Stock Monitoring', text: 'Review medicine stock levels monthly and pre-order before stocks drop below 60%.' },
  { icon: '👥', title: 'Community Awareness', text: 'Run awareness drives on vector-borne disease prevention — mosquito nets, clean water, waste disposal.' },
]

// ─── Alert thresholds & recommendations ──────────────────────────────────────
const ALERT_THRESHOLDS = [
  {
    id: 'cases_critical', type: 'Case Surge', severity: 'Critical', priority: 1,
    check: (w) => (w.activeCases || w.todayCases || 0) > 100,
    message: (w) => `Active cases exceed 100 (currently ${w.activeCases || w.todayCases || 0})`,
    recommendation: 'Deploy mobile health units immediately. Coordinate with district health office for surge response team.',
    icon: '🦺', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5',
  },
  {
    id: 'cases_warning', type: 'Case Surge', severity: 'High', priority: 2,
    check: (w) => { const c = w.activeCases || w.todayCases || 0; return c > 50 && c <= 100 },
    message: (w) => `Active cases rising (currently ${w.activeCases || w.todayCases || 0})`,
    recommendation: 'Increase surveillance frequency. Alert local PHC staff. Prepare additional isolation capacity.',
    icon: '📈', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A',
  },
  {
    id: 'bed_critical', type: 'Bed Capacity', severity: 'Critical', priority: 1,
    check: (w) => { if (!w.totalBeds || !w.availableBeds) return false; return ((w.totalBeds - w.availableBeds) / w.totalBeds) * 100 > 80 },
    message: (w) => { const occ = w.totalBeds ? Math.round(((w.totalBeds - w.availableBeds) / w.totalBeds) * 100) : 0; return `Bed occupancy at ${occ}% — only ${w.availableBeds} beds available` },
    recommendation: 'Activate overflow beds protocol. Contact neighbouring hospitals for patient transfer arrangements.',
    icon: '🛏️', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5',
  },
  {
    id: 'icu_critical', type: 'ICU Capacity', severity: 'Critical', priority: 1,
    check: (w) => { if (!w.icuTotal || w.icuAvailable == null) return false; return ((w.icuTotal - w.icuAvailable) / w.icuTotal) * 100 > 80 },
    message: (w) => { const occ = w.icuTotal ? Math.round(((w.icuTotal - w.icuAvailable) / w.icuTotal) * 100) : 0; return `ICU occupancy at ${occ}% — only ${w.icuAvailable} ICU beds available` },
    recommendation: 'Escalate to district medical officer. Evaluate critical patient transfers. Mobilise additional ventilators.',
    icon: '🏥', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5',
  },
  {
    id: 'medicine_critical', type: 'Medicine Stock', severity: 'Critical', priority: 1,
    check: (w) => typeof w.medicineStockPercentage === 'number' && w.medicineStockPercentage < 25,
    message: (w) => `Medicine stock critically low at ${w.medicineStockPercentage}%`,
    recommendation: 'Issue emergency procurement request. Contact district supply chain. Prioritise essential medicines list.',
    icon: '💊', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5',
  },
  {
    id: 'medicine_warning', type: 'Medicine Stock', severity: 'Medium', priority: 3,
    check: (w) => { const p = w.medicineStockPercentage; return typeof p === 'number' && p >= 25 && p < 50 },
    message: (w) => `Medicine stock below 50% (at ${w.medicineStockPercentage}%)`,
    recommendation: 'Place restocking order within 48 hours. Review consumption patterns for top 5 medicines.',
    icon: '💊', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A',
  },
  {
    id: 'risk_red', type: 'Risk Level', severity: 'High', priority: 2,
    check: (w) => (w.riskLevel || '').toLowerCase() === 'red',
    message: () => 'Ward is in Red risk zone',
    recommendation: 'Schedule immediate field inspection. Brief ward medical officer. Activate community health workers.',
    icon: '🚨', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5',
  },
]

const computeThresholdAlerts = (wards) => {
  const alerts = []
  wards.forEach((ward) => {
    ALERT_THRESHOLDS.forEach((threshold) => {
      if (threshold.check(ward)) {
        alerts.push({
          _id: `threshold_${ward.wardName}_${threshold.id}`,
          wardName: ward.wardName,
          alertType: threshold.type,
          severity: threshold.severity,
          priority: threshold.priority,
          message: threshold.message(ward),
          recommendation: threshold.recommendation,
          icon: threshold.icon,
          color: threshold.color,
          bg: threshold.bg,
          border: threshold.border,
          isActive: true,
          isThreshold: true,
          status: 'pending',
          triggeredAt: new Date().toISOString(),
        })
      }
    })
  })
  const seen = new Map()
  const deduped = []
  alerts.sort((a, b) => a.priority - b.priority)
  alerts.forEach((a) => {
    const key = `${a.wardName}_${a.alertType}`
    if (!seen.has(key)) { seen.set(key, true); deduped.push(a) }
  })
  return deduped
}

const computeWardRecommendations = (ward) => {
  const triggered = []
  ALERT_THRESHOLDS.forEach((threshold) => {
    if (threshold.check(ward)) {
      triggered.push({ icon: threshold.icon, title: threshold.type, text: threshold.recommendation, severity: threshold.severity, color: threshold.color, bg: threshold.bg, border: threshold.border })
    }
  })
  const seen = new Set()
  const deduped = []
  triggered.forEach((r) => { if (!seen.has(r.title)) { seen.add(r.title); deduped.push(r) } })
  if (deduped.length === 0) return { isGreen: true, items: GREEN_ZONE_RECOMMENDATIONS }
  return { isGreen: false, items: deduped }
}

const toArray = (data, key) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (key && Array.isArray(data[key])) return data[key]
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.results)) return data.results
  return []
}

// ─── Derive hospital view from already-fetched ward data ──────────────────────
const deriveHospitalsFromWards = (wards, allAlerts) => {
  const map = {}
  wards.forEach((ward) => {
    const name = ward.hospitalName
    if (!name) return
    if (!map[name]) {
      map[name] = {
        hospitalName: name,
        wardNames: [],
        type: name.toLowerCase().includes('uphc') ? 'UPHC' : 'General Hospital',
        totalBeds: 0,
        availableBeds: 0,
        icuTotal: 0,
        icuAvailable: 0,
        medicineStockPercentage: null,
        todayCases: 0,
        activeCases: 0,
        topDisease: ward.topDisease || 'None',
        appointmentsToday: 0,
        lastUpdated: ward.lastUpdated,
        alerts: [],
        activeAlerts: 0,
        riskLevel: 'Green',
        wardBreakdown: [],
        diseaseCounts: {},
        bedOccupancy: 0,
        icuOccupancy: 0,
      }
    }
    const h = map[name]
    if (!h.wardNames.includes(ward.wardName)) h.wardNames.push(ward.wardName)
    h.totalBeds += ward.totalBeds || 0
    h.availableBeds += ward.availableBeds || 0
    h.icuTotal += ward.icuTotal || 0
    h.icuAvailable += ward.icuAvailable || 0
    h.todayCases += ward.todayCases || 0
    h.activeCases += ward.activeCases || 0
    h.appointmentsToday += ward.appointmentsToday || 0
    const riskOrder = { Red: 0, Yellow: 1, Green: 2 }
    if ((riskOrder[ward.riskLevel] ?? 3) < (riskOrder[h.riskLevel] ?? 3)) h.riskLevel = ward.riskLevel
    if (ward.medicineStockPercentage != null) {
      if (h.medicineStockPercentage == null || ward.medicineStockPercentage < h.medicineStockPercentage) {
        h.medicineStockPercentage = ward.medicineStockPercentage
      }
    }
    h.wardBreakdown.push({
      wardName: ward.wardName,
      wardCode: ward.wardCode || '',
      riskLevel: ward.riskLevel || 'Green',
      activeCases: ward.activeCases || 0,
      population: ward.population || 0,
    })
  })

  return Object.values(map).map((h) => {
    const wardAlerts = allAlerts.filter(
      (a) => a.isActive && h.wardNames.includes(a.wardName) && a.status !== 'resolved'
    )
    h.alerts = wardAlerts
    h.activeAlerts = wardAlerts.length
    h.bedOccupancy = h.totalBeds ? Math.round(((h.totalBeds - h.availableBeds) / h.totalBeds) * 100) : 0
    h.icuOccupancy = h.icuTotal ? Math.round(((h.icuTotal - h.icuAvailable) / h.icuTotal) * 100) : 0
    return h
  })
}

const getCases = (ward) => ward.todayCases ?? ward.activeCases ?? 0

const calcHAI = (ward) => {
  const availableBeds = ward.availableBeds || 0
  const population = ward.population || 1
  const hospitals = ward.hospitals || 0
  const activeCases = ward.activeCases || ward.todayCases || 0
  const score = (availableBeds / population) * 100000 + hospitals * 5 - activeCases * 0.5
  return Math.round(Math.min(100, Math.max(0, score)))
}

const STORAGE_KEY = 'carecrew_dismissed_alerts'
const loadDismissedIds = () => { try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return new Set(); const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return new Set(parsed); return new Set() } catch { return new Set() } }
const saveDismissedIds = (set) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])) } catch {} }

// ─── Pill styles ──────────────────────────────────────────────────────────────
const pillBase = { display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }
const pillStyles = {
  green: { ...pillBase, background: '#D1FAE5', color: '#065F46' },
  yellow: { ...pillBase, background: '#FEF3C7', color: '#92400E' },
  red: { ...pillBase, background: '#FEE2E2', color: '#991B1B' },
  gray: { ...pillBase, background: '#F3F4F6', color: '#6B7280' },
  orange: { ...pillBase, background: '#FFF7ED', color: '#9A3412' },
  purple: { ...pillBase, background: '#F3E8FF', color: '#6B21A8' },
  blue: { ...pillBase, background: '#EFF6FF', color: '#1D4ED8' },
  teal: { ...pillBase, background: '#ECFDF5', color: '#065F46' },
}

const RiskPill = ({ value }) => {
  if (!value) return <span style={pillStyles.gray}>—</span>
  const v = value.toLowerCase()
  if (v === 'green') return <span style={pillStyles.green}>{value}</span>
  if (v === 'yellow') return <span style={pillStyles.yellow}>{value}</span>
  return <span style={pillStyles.red}>{value}</span>
}

const SeverityPill = ({ severity }) => {
  if (!severity) return null
  const s = severity.toLowerCase()
  if (s === 'critical') return <span style={pillStyles.red}>{severity}</span>
  if (s === 'high') return <span style={pillStyles.orange}>{severity}</span>
  if (s === 'medium') return <span style={pillStyles.yellow}>{severity}</span>
  return <span style={pillStyles.gray}>{severity}</span>
}

const StatusPill = ({ status }) => {
  if (!status || status === 'pending') return <span style={pillStyles.gray}>Pending</span>
  if (status === 'acknowledged') return <span style={pillStyles.blue}>Acknowledged</span>
  if (status === 'resolved') return <span style={pillStyles.green}>Resolved</span>
  return null
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
  if (str === 'medium' || str === 'low') return <span style={pillStyles.yellow}>Barely Sufficient</span>
  if (str === 'critical') return <span style={pillStyles.red}>Insufficient</span>
  return <span style={pillStyles.gray}>—</span>
}

// ─── Broadcast pill helpers ────────────────────────────────────────────────────
const BROADCAST_TYPE_STYLES = {
  'General Info':      { bg: '#EFF6FF', color: '#1D4ED8', icon: 'ℹ️' },
  'Health Advisory':   { bg: '#F0FDF4', color: '#16A34A', icon: '🩺' },
  'Disease Alert':     { bg: '#FEF3C7', color: '#92400E', icon: '🦠' },
  'Vaccination Drive': { bg: '#F3E8FF', color: '#6B21A8', icon: '💉' },
  'Emergency':         { bg: '#FEE2E2', color: '#991B1B', icon: '🚨' },
}
const BROADCAST_PRIORITY_STYLES = {
  Low:    { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  Medium: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  High:   { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
  Urgent: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
}

// ─── CSV Export helpers ───────────────────────────────────────────────────────
const exportCSV = (wards) => {
  const headers = ['Ward', 'Zone', 'Cases Today', 'Top Disease', 'Beds Available', 'ICU Available', 'Risk Level', 'Medicine Stock']
  const rows = wards.map((w) => {
    const pct = w.medicineStockPercentage
    const med = typeof pct === 'number' ? pct >= 60 ? 'Sufficient' : pct >= 25 ? 'Barely Sufficient' : 'Insufficient' : '—'
    return [w.wardName, w.wardCode || '', getCases(w), w.topDisease || '', w.availableBeds ?? 0, w.icuAvailable ?? 0, w.riskLevel || '', med]
  })
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'ward-report.csv'; a.click()
  URL.revokeObjectURL(url)
}

const exportAlertZonesCSV = (wards, alerts) => {
  const alertWardNames = new Set(alerts.filter((a) => a.isActive).map((a) => a.wardName))
  const alertZones = wards.filter((w) => alertWardNames.has(w.wardName) || ['red', 'yellow'].includes((w.riskLevel || '').toLowerCase()))
  if (alertZones.length === 0) { alert('No alert zones to export.'); return }
  const headers = ['Ward', 'Zone', 'Cases', 'Top Disease', 'Beds', 'ICU', 'Risk', 'Medicine Stock', 'Alert Type', 'Severity']
  const rows = alertZones.map((w) => {
    const matched = alerts.find((a) => a.wardName === w.wardName && a.isActive)
    const pct = w.medicineStockPercentage
    const med = typeof pct === 'number' ? pct >= 60 ? 'Sufficient' : pct >= 25 ? 'Barely Sufficient' : 'Insufficient' : '—'
    return [w.wardName, w.wardCode || '', getCases(w), w.topDisease || '', w.availableBeds ?? 0, w.icuAvailable ?? 0, w.riskLevel || '', med, matched?.alertType || '—', matched?.severity || '—']
  })
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'alert-zones-report.csv'; a.click()
  URL.revokeObjectURL(url)
}

const exportHospitalsCSV = (hospitals) => {
  const headers = ['Hospital', 'Type', 'Wards Served', 'Cases Today', 'Top Disease', 'Total Beds', 'Available Beds', 'Bed Occupancy %', 'ICU Total', 'ICU Available', 'ICU Occupancy %', 'Medicine Stock', 'Appointments Today', 'Active Alerts', 'Risk Level']
  const rows = hospitals.map((h) => {
    const pct = h.medicineStockPercentage
    const med = typeof pct === 'number' ? pct >= 60 ? 'Sufficient' : pct >= 25 ? 'Barely Sufficient' : 'Insufficient' : '—'
    return [h.hospitalName, h.type || '—', (h.wardNames || []).join('; '), h.todayCases ?? 0, h.topDisease || '—', h.totalBeds ?? 0, h.availableBeds ?? 0, h.bedOccupancy ?? 0, h.icuTotal ?? 0, h.icuAvailable ?? 0, h.icuOccupancy ?? 0, med, h.appointmentsToday ?? 0, h.activeAlerts ?? 0, h.riskLevel || '—']
  })
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'hospital-report.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── Shared table styles ──────────────────────────────────────────────────────
const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.4)', whiteSpace: 'nowrap', background: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const td = { padding: '14px 16px', color: '#1E293B', verticalAlign: 'middle', borderBottom: '1px solid rgba(0,0,0,0.03)' }

// ─── Ward Table ───────────────────────────────────────────────────────────────
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
      case 'riskLevel': { const order = { red: 0, yellow: 1, green: 2 }; aVal = order[(a.riskLevel || '').toLowerCase()] ?? 3; bVal = order[(b.riskLevel || '').toLowerCase()] ?? 3; break }
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
    <th onClick={() => handleSort(col)} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none', background: sortKey === col ? '#EFF6FF' : '#F8FAFC', color: sortKey === col ? '#2563EB' : '#64748B' }}>
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
            <tr key={ward.wardName || i} style={{ transition: 'all 0.2s', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}>
              <td style={td}><strong>{ward.wardName}</strong></td>
              <td style={td}>{ward.wardCode || '—'}</td>
              <td style={td}>{getCases(ward)}</td>
              <td style={td}>{ward.topDisease || '—'}</td>
              <td style={td}>{ward.availableBeds ?? '—'}</td>
              <td style={td}>{ward.icuAvailable ?? '—'}</td>
              <td style={td}><RiskPill value={ward.riskLevel} /></td>
              <td style={td}><MedicinePill ward={ward} /></td>
              <td style={{ ...td, color: '#94A3B8', fontSize: '12px' }}>{ward.lastUpdated ? new Date(ward.lastUpdated).toLocaleTimeString() : '—'}</td>
              <td style={td}>
                <button onClick={() => onReport(ward)} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
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

// ─── Hospital Table ───────────────────────────────────────────────────────────
const HospitalTable = ({ hospitals, onDetail }) => {
  const [sortKey, setSortKey] = useState('hospitalName')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...hospitals].sort((a, b) => {
    let aVal, bVal
    switch (sortKey) {
      case 'hospitalName': aVal = a.hospitalName || ''; bVal = b.hospitalName || ''; break
      case 'todayCases': aVal = a.todayCases ?? 0; bVal = b.todayCases ?? 0; break
      case 'availableBeds': aVal = a.availableBeds ?? 0; bVal = b.availableBeds ?? 0; break
      case 'bedOccupancy': aVal = a.bedOccupancy ?? 0; bVal = b.bedOccupancy ?? 0; break
      case 'icuAvailable': aVal = a.icuAvailable ?? 0; bVal = b.icuAvailable ?? 0; break
      case 'medicineStock': aVal = a.medicineStockPercentage ?? 0; bVal = b.medicineStockPercentage ?? 0; break
      case 'activeAlerts': aVal = a.activeAlerts ?? 0; bVal = b.activeAlerts ?? 0; break
      case 'riskLevel': { const order = { red: 0, yellow: 1, green: 2 }; aVal = order[(a.riskLevel || '').toLowerCase()] ?? 3; bVal = order[(b.riskLevel || '').toLowerCase()] ?? 3; break }
      default: aVal = ''; bVal = ''
    }
    if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ color: '#CBD5E1', marginLeft: '4px' }}>↕</span>
    return <span style={{ color: '#7C3AED', marginLeft: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const SortableTh = ({ col, label }) => (
    <th onClick={() => handleSort(col)} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none', background: sortKey === col ? '#F3E8FF' : '#F8FAFC', color: sortKey === col ? '#7C3AED' : '#64748B' }}>
      {label}<SortIcon col={col} />
    </th>
  )

  const OccupancyBar = ({ value }) => {
    const color = value > 80 ? '#DC2626' : value > 60 ? '#D97706' : '#16A34A'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ flex: 1, background: '#F1F5F9', borderRadius: '4px', height: '6px', minWidth: '50px' }}>
          <div style={{ width: `${Math.min(value, 100)}%`, background: color, height: '6px', borderRadius: '4px', transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color, minWidth: '30px' }}>{value}%</span>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            <SortableTh col='hospitalName' label='Hospital Name' />
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Wards Served</th>
            <SortableTh col='todayCases' label='Cases Today' />
            <SortableTh col='availableBeds' label='Beds Available' />
            <SortableTh col='bedOccupancy' label='Bed Occupancy' />
            <SortableTh col='icuAvailable' label='ICU Available' />
            <SortableTh col='medicineStock' label='Medicine Stock' />
            <SortableTh col='activeAlerts' label='Alerts' />
            <SortableTh col='riskLevel' label='Risk Level' />
            <th style={thStyle}>Detail</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((hosp, i) => (
            <tr key={hosp.hospitalName || i} style={{ transition: 'all 0.2s', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}>
              <td style={td}>
                <div>
                  <strong>{hosp.hospitalName}</strong>
                  {hosp.activeAlerts > 0 && (
                    <span style={{ marginLeft: '6px', background: '#FEE2E2', color: '#991B1B', fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '20px' }}>
                      {hosp.activeAlerts} alert{hosp.activeAlerts > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </td>
              <td style={td}><span style={{ ...pillBase, background: '#EFF6FF', color: '#1D4ED8' }}>{hosp.type || 'General'}</span></td>
              <td style={td}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {(hosp.wardNames || []).slice(0, 3).map(w => (
                    <span key={w} style={{ ...pillBase, background: '#F1F5F9', color: '#475569', fontSize: '10px', padding: '2px 6px' }}>{w}</span>
                  ))}
                  {(hosp.wardNames || []).length > 3 && (
                    <span style={{ ...pillBase, background: '#F1F5F9', color: '#94A3B8', fontSize: '10px', padding: '2px 6px' }}>+{hosp.wardNames.length - 3}</span>
                  )}
                </div>
              </td>
              <td style={td}>{hosp.todayCases ?? '—'}</td>
              <td style={td}>{hosp.availableBeds ?? '—'} / {hosp.totalBeds ?? '—'}</td>
              <td style={{ ...td, minWidth: '120px' }}><OccupancyBar value={hosp.bedOccupancy ?? 0} /></td>
              <td style={td}>{hosp.icuAvailable ?? '—'} / {hosp.icuTotal ?? '—'}</td>
              <td style={td}><MedicinePill ward={hosp} /></td>
              <td style={td}>
                {hosp.activeAlerts > 0
                  ? <span style={{ ...pillBase, background: '#FEE2E2', color: '#991B1B' }}>⚠️ {hosp.activeAlerts}</span>
                  : <span style={{ ...pillBase, background: '#F0FDF4', color: '#065F46' }}>✅ 0</span>}
              </td>
              <td style={td}><RiskPill value={hosp.riskLevel} /></td>
              <td style={td}>
                <button onClick={() => onDetail(hosp)} style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  🏥 Detail
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Hospital Performance Cards ───────────────────────────────────────────────
const HospitalPerformanceCards = ({ hospitals }) => {
  if (!hospitals.length) return null

  const totalBeds = hospitals.reduce((s, h) => s + (h.totalBeds || 0), 0)
  const totalAvailBeds = hospitals.reduce((s, h) => s + (h.availableBeds || 0), 0)
  const totalIcu = hospitals.reduce((s, h) => s + (h.icuTotal || 0), 0)
  const totalIcuAvail = hospitals.reduce((s, h) => s + (h.icuAvailable || 0), 0)
  const totalCases = hospitals.reduce((s, h) => s + (h.todayCases || 0), 0)
  const totalAlerts = hospitals.reduce((s, h) => s + (h.activeAlerts || 0), 0)
  const avgBedOcc = hospitals.length ? Math.round(hospitals.reduce((s, h) => s + (h.bedOccupancy || 0), 0) / hospitals.length) : 0

  const metrics = [
    { icon: '🏥', label: 'Total Hospitals', value: hospitals.length, color: '#7C3AED' },
    { icon: '🛏️', label: 'Beds Available', value: `${totalAvailBeds} / ${totalBeds}`, color: totalAvailBeds < totalBeds * 0.2 ? '#DC2626' : '#16A34A' },
    { icon: '🏨', label: 'ICU Available', value: `${totalIcuAvail} / ${totalIcu}`, color: totalIcuAvail < totalIcu * 0.2 ? '#DC2626' : '#2563EB' },
    { icon: '📊', label: 'Avg Bed Occupancy', value: `${avgBedOcc}%`, color: avgBedOcc > 80 ? '#DC2626' : avgBedOcc > 60 ? '#D97706' : '#16A34A' },
    { icon: '🦺', label: 'Cases Today (All)', value: totalCases, color: totalCases > 200 ? '#DC2626' : '#475569' },
    { icon: '🚨', label: 'Active Alerts', value: totalAlerts, color: totalAlerts > 0 ? '#DC2626' : '#16A34A' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '16px' }}>
      {metrics.map(({ icon, label, value, color }) => (
        <div key={label} style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(255,255,255,0.6)' }}>
          <span style={{ fontSize: '22px' }}>{icon}</span>
          <div>
            <p style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</p>
            <p style={{ fontSize: '17px', fontWeight: 700, color, lineHeight: 1.1 }}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Hospital Detail Modal ────────────────────────────────────────────────────
const HospitalDetailModal = ({ hospital, onClose }) => {
  if (!hospital) return null

  const medPct = hospital.medicineStockPercentage ?? 0
  const medColor = medPct >= 60 ? '#16A34A' : medPct >= 25 ? '#D97706' : '#DC2626'
  const medLabel = medPct >= 60 ? 'Sufficient' : medPct >= 25 ? 'Barely Sufficient' : 'Insufficient'
  const riskColor = (hospital.riskLevel || '').toLowerCase() === 'red' ? '#DC2626' : (hospital.riskLevel || '').toLowerCase() === 'yellow' ? '#D97706' : '#16A34A'
  const riskBg = (hospital.riskLevel || '').toLowerCase() === 'red' ? '#FEF2F2' : (hospital.riskLevel || '').toLowerCase() === 'yellow' ? '#FFFBEB' : '#F0FDF4'

  const bedPct = hospital.totalBeds ? Math.round(((hospital.totalBeds - (hospital.availableBeds || 0)) / hospital.totalBeds) * 100) : 0
  const icuPct = hospital.icuTotal ? Math.round(((hospital.icuTotal - (hospital.icuAvailable || 0)) / hospital.icuTotal) * 100) : 0

  const bedPieData = [
    { name: 'Available', value: hospital.availableBeds || 0 },
    { name: 'Occupied', value: (hospital.totalBeds || 0) - (hospital.availableBeds || 0) },
  ]
  const icuPieData = [
    { name: 'Available', value: hospital.icuAvailable || 0 },
    { name: 'Occupied', value: (hospital.icuTotal || 0) - (hospital.icuAvailable || 0) },
  ]

  const diseasePieData = Object.entries(hospital.diseaseCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  const ProgressBar = ({ label, value, max, color }) => {
    const pct = max ? Math.round((value / max) * 100) : 0
    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>{label}</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color }}>{value} / {max} ({pct}%)</span>
        </div>
        <div style={{ background: '#F1F5F9', borderRadius: '6px', height: '8px' }}>
          <div style={{ width: `${pct}%`, background: color, height: '8px', borderRadius: '6px', transition: 'width 0.5s ease' }} />
        </div>
      </div>
    )
  }

  const MetricRow = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: '13px', color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: color || '#1E293B' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '740px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0,0,0,0.22)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>🏥 {hospital.hospitalName}</h2>
              <span style={{ ...pillBase, background: '#EFF6FF', color: '#1D4ED8' }}>{hospital.type || 'General'}</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8' }}>
              Serving: {(hospital.wardNames || []).join(', ') || '—'} &nbsp;·&nbsp;
              Last updated: {hospital.lastUpdated ? new Date(hospital.lastUpdated).toLocaleTimeString() : '—'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748B', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {[
              { label: 'RISK LEVEL', value: hospital.riskLevel || 'Green', color: riskColor, bg: riskBg },
              { label: 'CASES TODAY', value: hospital.todayCases ?? 0, color: '#DC2626', bg: '#FEF2F2' },
              { label: 'ACTIVE ALERTS', value: hospital.activeAlerts ?? 0, color: hospital.activeAlerts > 0 ? '#DC2626' : '#16A34A', bg: hospital.activeAlerts > 0 ? '#FEF2F2' : '#F0FDF4' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, border: `1.5px solid ${color}30`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color, fontWeight: 700, marginBottom: '4px', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '14px' }}>🛏️ Capacity Breakdown</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
              <div>
                <ProgressBar label='General Beds Available' value={hospital.availableBeds ?? 0} max={hospital.totalBeds ?? 0} color={bedPct > 80 ? '#DC2626' : '#16A34A'} />
                <ProgressBar label='ICU Beds Available' value={hospital.icuAvailable ?? 0} max={hospital.icuTotal ?? 0} color={icuPct > 80 ? '#DC2626' : '#2563EB'} />
                <ProgressBar label='Medicine Stock' value={medPct} max={100} color={medColor} />
              </div>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <ResponsiveContainer width={90} height={90}>
                    <PieChart>
                      <Pie data={bedPieData} cx='50%' cy='50%' innerRadius={28} outerRadius={42} dataKey='value' startAngle={90} endAngle={-270}>
                        <Cell fill='#16A34A' />
                        <Cell fill='#FCA5A5' />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>General Beds</p>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: bedPct > 80 ? '#DC2626' : '#16A34A' }}>{100 - bedPct}% free</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <ResponsiveContainer width={90} height={90}>
                    <PieChart>
                      <Pie data={icuPieData} cx='50%' cy='50%' innerRadius={28} outerRadius={42} dataKey='value' startAngle={90} endAngle={-270}>
                        <Cell fill='#2563EB' />
                        <Cell fill='#FCA5A5' />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>ICU Beds</p>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: icuPct > 80 ? '#DC2626' : '#2563EB' }}>{100 - icuPct}% free</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>📊 Key Metrics</p>
            <MetricRow label='Hospital Type' value={hospital.type || '—'} />
            <MetricRow label='Wards Served' value={(hospital.wardNames || []).length} />
            <MetricRow label='Top Disease Today' value={hospital.topDisease || '—'} />
            <MetricRow label='Total Beds' value={hospital.totalBeds ?? 0} />
            <MetricRow label='Available Beds' value={hospital.availableBeds ?? 0} color={(hospital.availableBeds ?? 0) < 5 ? '#DC2626' : '#16A34A'} />
            <MetricRow label='Bed Occupancy' value={`${bedPct}%`} color={bedPct > 80 ? '#DC2626' : '#16A34A'} />
            <MetricRow label='ICU Total' value={hospital.icuTotal ?? 0} />
            <MetricRow label='ICU Available' value={hospital.icuAvailable ?? 0} color={(hospital.icuAvailable ?? 0) < 2 ? '#DC2626' : '#16A34A'} />
            <MetricRow label='ICU Occupancy' value={`${icuPct}%`} color={icuPct > 80 ? '#DC2626' : '#2563EB'} />
            <MetricRow label='Medicine Stock' value={`${medPct}% — ${medLabel}`} color={medColor} />
            <MetricRow label='Staff Count' value={hospital.staffCount || '—'} />
          </div>

          {diseasePieData.length > 0 && (
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '12px' }}>🔬 Disease Distribution Today</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={diseasePieData} cx='50%' cy='50%' outerRadius={62} dataKey='value'>
                      {diseasePieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} cases`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {diseasePieData.map((d, idx) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#1E293B', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{d.value} cases</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(hospital.wardBreakdown || []).length > 0 && (
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '10px' }}>🗺️ Wards Served</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {hospital.wardBreakdown.map((w) => {
                  const rc = (w.riskLevel || '').toLowerCase()
                  const wColor = rc === 'red' ? '#DC2626' : rc === 'yellow' ? '#D97706' : '#16A34A'
                  const wBg = rc === 'red' ? '#FEF2F2' : rc === 'yellow' ? '#FFFBEB' : '#F0FDF4'
                  return (
                    <div key={w.wardName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: wBg, border: `1px solid ${wColor}30`, borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{w.wardName}</span>
                        {w.wardCode && <span style={{ ...pillBase, background: '#F1F5F9', color: '#64748B', fontSize: '10px', padding: '1px 6px' }}>{w.wardCode}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>{w.activeCases || 0} cases</span>
                        <RiskPill value={w.riskLevel} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(hospital.alerts || []).length > 0 && (
            <div style={{ background: '#FEF2F2', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>⚠️ ACTIVE ALERTS ({hospital.alerts.length})</p>
              {hospital.alerts.map((a) => (
                <div key={a._id} style={{ fontSize: '13px', color: '#7F1D1D', padding: '6px 0', borderBottom: '1px solid #FECACA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <strong>{a.wardName}</strong> — <strong>{a.alertType}</strong>
                    <SeverityPill severity={a.severity} />
                  </div>
                  {a.message && <p style={{ fontSize: '12px', color: '#991B1B', margin: '2px 0' }}>{a.message}</p>}
                </div>
              ))}
            </div>
          )}


          <button
            onClick={() => {
              const printWindow = window.open('', '_blank')
              printWindow.document.write(`<!DOCTYPE html><html><head><title>${hospital.hospitalName} — Hospital Report</title>
              <style>* {margin:0;padding:0;box-sizing:border-box;} body{font-family:Arial,sans-serif;padding:20px;color:#1E293B;font-size:12px;}
              h1{font-size:18px;font-weight:700;margin-bottom:2px;} .sub{font-size:11px;color:#94A3B8;margin-bottom:12px;}
              .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;}
              .card{border:1.5px solid #E2E8F0;border-radius:8px;padding:10px;text-align:center;}
              .label{font-size:10px;font-weight:600;color:#64748B;margin-bottom:4px;text-transform:uppercase;}
              .big{font-size:20px;font-weight:700;}
              .section{background:#F8FAFC;border-radius:8px;padding:10px;margin-bottom:10px;}
              .section-title{font-size:12px;font-weight:600;margin-bottom:8px;}
              .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #F1F5F9;font-size:12px;}
              .row-label{color:#64748B;} .row-val{font-weight:600;}
              .bar-label{display:flex;justify-content:space-between;font-size:11px;color:#64748B;margin-bottom:3px;}
              .bar-track{background:#E2E8F0;border-radius:4px;height:6px;margin-bottom:8px;}
              .bar-fill{height:6px;border-radius:4px;}
              @media print{body{padding:12px;} @page{margin:10mm;size:A4;}}
              </style></head><body>
              <h1>🏥 ${hospital.hospitalName}</h1>
              <p class="sub">Type: ${hospital.type || 'General'} ┬╖ Wards: ${(hospital.wardNames || []).join(', ')} ┬╖ Printed: ${new Date().toLocaleString()}</p>
              <div class="grid" style="grid-template-columns: repeat(3, 1fr);">
                <div class="card"><div class="label">Risk Level</div><div class="big">${hospital.riskLevel || '—'}</div></div>
                <div class="card"><div class="label">Cases Today</div><div class="big">${hospital.todayCases ?? 0}</div></div>
                <div class="card"><div class="label">Active Alerts</div><div class="big">${hospital.activeAlerts ?? 0}</div></div>
              </div>
              <div class="section">
                <div class="section-title">🛏️ Capacity</div>
                <div class="bar-label"><span>General Beds</span><span>${hospital.availableBeds ?? 0}/${hospital.totalBeds ?? 0} available</span></div>
                <div class="bar-track"><div class="bar-fill" style="width:${hospital.totalBeds ? Math.round(((hospital.availableBeds||0)/(hospital.totalBeds||1))*100) : 0}%;background:#16A34A"></div></div>
                <div class="bar-label"><span>ICU Beds</span><span>${hospital.icuAvailable ?? 0}/${hospital.icuTotal ?? 0} available</span></div>
                <div class="bar-track"><div class="bar-fill" style="width:${hospital.icuTotal ? Math.round(((hospital.icuAvailable||0)/(hospital.icuTotal||1))*100) : 0}%;background:#2563EB"></div></div>
                <div class="bar-label"><span>Medicine Stock</span><span>${medPct}%</span></div>
                <div class="bar-track"><div class="bar-fill" style="width:${medPct}%;background:${medColor}"></div></div>
              </div>
              <div class="section">
                <div class="section-title">📊 Key Metrics</div>
                <div class="row"><span class="row-label">Top Disease</span><span class="row-val">${hospital.topDisease || '—'}</span></div>
                <div class="row"><span class="row-label">Total Beds</span><span class="row-val">${hospital.totalBeds ?? 0}</span></div>
                <div class="row"><span class="row-label">Available Beds</span><span class="row-val">${hospital.availableBeds ?? 0}</span></div>
                <div class="row"><span class="row-label">ICU Total</span><span class="row-val">${hospital.icuTotal ?? 0}</span></div>
                <div class="row"><span class="row-label">ICU Available</span><span class="row-val">${hospital.icuAvailable ?? 0}</span></div>
                <div class="row"><span class="row-label">Medicine Stock</span><span class="row-val">${medPct}% (${medLabel})</span></div>
              </div>
              <p style="font-size:11px;color:#94A3B8;text-align:center;margin-top:24px">CareCrew — Solapur Municipal Corporation · Generated: ${new Date().toLocaleString()}</p>
              </body></html>`)
              printWindow.document.close()
              printWindow.focus()
              setTimeout(() => printWindow.print(), 500)
            }}
            style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' }}
          >
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>
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
  const bedOccupancy = ward.totalBeds ? Math.round(((ward.totalBeds - ward.availableBeds) / ward.totalBeds) * 100) : 0
  const icuOccupancy = ward.icuTotal ? Math.round(((ward.icuTotal - ward.icuAvailable) / ward.icuTotal) * 100) : 0
  const medPct = ward.medicineStockPercentage ?? 0
  const medColor = medPct >= 60 ? '#16A34A' : medPct >= 25 ? '#D97706' : '#DC2626'
  const medLabel = medPct >= 60 ? 'Sufficient' : medPct >= 25 ? 'Barely Sufficient' : 'Insufficient'
  const riskColor = ward.riskLevel === 'Green' ? '#16A34A' : ward.riskLevel === 'Yellow' ? '#D97706' : '#DC2626'
  const { isGreen, items: recItems } = computeWardRecommendations(ward)

  const MetricRow = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{printStyles}</style>
      <div id='ward-report-modal' style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>{ward.wardName}</h2>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
              Ward Code: {ward.wardCode} &nbsp;┬╖&nbsp; Population: {(ward.population || 0).toLocaleString()} &nbsp;┬╖&nbsp; Last updated: {ward.lastUpdated ? new Date(ward.lastUpdated).toLocaleTimeString() : '—'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748B', flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: ward.riskLevel === 'Green' ? '#F0FDF4' : ward.riskLevel === 'Yellow' ? '#FFFBEB' : '#FEF2F2', border: `1.5px solid ${riskColor}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: riskColor, fontWeight: 600, marginBottom: '4px' }}>RISK LEVEL</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: riskColor }}>{ward.riskLevel || '—'}</p>
              <p style={{ fontSize: '12px', color: riskColor, marginTop: '2px' }}>{ward.activeCases || ward.todayCases || 0} active cases</p>
            </div>
            <div style={{ background: hai > 70 ? '#F0FDF4' : hai >= 40 ? '#FFFBEB' : '#FEF2F2', border: `1.5px solid ${haiColor}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: haiColor, fontWeight: 600, marginBottom: '4px' }}>HAI SCORE</p>
              <p style={{ fontSize: '28px', fontWeight: 700, color: haiColor }}>{hai}<span style={{ fontSize: '14px' }}>/100</span></p>
              <p style={{ fontSize: '12px', color: haiColor, marginTop: '2px' }}>{haiLabel}</p>
            </div>
          </div>
          {wardAlerts.length > 0 && (
            <div style={{ background: '#FEF2F2', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', marginBottom: '8px' }}>⚠️ ACTIVE ALERTS ({wardAlerts.length})</p>
              {wardAlerts.map((a) => (
                <div key={a._id} style={{ fontSize: '13px', color: '#7F1D1D', padding: '6px 0', borderBottom: '1px solid #FECACA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <strong>{a.alertType}</strong><SeverityPill severity={a.severity} /><StatusPill status={a.status} />
                  </div>
                  {a.message && <p style={{ fontSize: '12px', color: '#991B1B', margin: '2px 0' }}>{a.message}</p>}
                  {a.recommendation && (
                    <p style={{ fontSize: '12px', color: '#1E293B', background: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: '6px', padding: '6px 10px', margin: '6px 0 0' }}>
                      💡 <strong>Action:</strong> {a.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '14px' }}>🛏️ Capacity Status</p>
            <ProgressBar label='Beds Available' value={ward.availableBeds ?? 0} max={ward.totalBeds ?? 0} color={ward.availableBeds < 10 ? '#DC2626' : '#16A34A'} />
            <ProgressBar label='ICU Available' value={ward.icuAvailable ?? 0} max={ward.icuTotal ?? 0} color={ward.icuAvailable < 3 ? '#DC2626' : '#2563EB'} />
            <ProgressBar label='Medicine Stock' value={medPct} max={100} color={medColor} />
          </div>
          <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>📊 Key Metrics</p>
            <MetricRow label='Top Disease' value={ward.topDisease || '—'} />
            <MetricRow label='Cases Today' value={ward.todayCases ?? 0} />
            <MetricRow label='Active Cases (total)' value={ward.activeCases ?? 0} color={riskColor} />
            <MetricRow label='Hospitals in Ward' value={ward.hospitals ?? 0} />
            <MetricRow label='Total Beds' value={ward.totalBeds ?? 0} />
            <MetricRow label='Available Beds' value={ward.availableBeds ?? 0} color={ward.availableBeds < 10 ? '#DC2626' : '#16A34A'} />
            <MetricRow label='ICU Total' value={ward.icuTotal ?? 0} />
            <MetricRow label='ICU Available' value={ward.icuAvailable ?? 0} color={ward.icuAvailable < 3 ? '#DC2626' : '#16A34A'} />
            <MetricRow label='Medicine Stock' value={`${medPct}% — ${medLabel}`} color={medColor} />
            <MetricRow label='Population' value={(ward.population || 0).toLocaleString()} />
            <MetricRow label='Bed Occupancy' value={`${bedOccupancy}%`} color={bedOccupancy > 80 ? '#DC2626' : '#16A34A'} />
            <MetricRow label='ICU Occupancy' value={`${icuOccupancy}%`} color={icuOccupancy > 80 ? '#DC2626' : '#16A34A'} />
          </div>
          <div style={{ background: isGreen ? '#F0FDF4' : '#FFFBEB', border: `1.5px solid ${isGreen ? '#6EE7B7' : '#FDE68A'}`, borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '16px' }}>{isGreen ? '✅' : '📋'}</span>
              <p style={{ fontSize: '13px', fontWeight: 700, color: isGreen ? '#065F46' : '#78350F' }}>
                {isGreen ? 'Recommendations — Green Zone (Stable)' : 'Action Recommendations'}
              </p>
              <span style={{ fontSize: '10px', background: isGreen ? '#D1FAE5' : '#FEF3C7', color: isGreen ? '#065F46' : '#92400E', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, border: `1px solid ${isGreen ? '#6EE7B7' : '#FDE68A'}` }}>
                {isGreen ? 'PREVENTIVE' : `${recItems.length} ACTION${recItems.length > 1 ? 'S' : ''} REQUIRED`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recItems.map((rec, idx) => (
                <div key={idx} style={{ background: isGreen ? 'rgba(255,255,255,0.7)' : (rec.bg || '#FFF7ED'), border: `1px solid ${isGreen ? '#A7F3D0' : (rec.border || '#FDE68A')}`, borderRadius: '8px', padding: '12px 14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>{rec.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: isGreen ? '#065F46' : (rec.color || '#92400E') }}>{rec.title}</p>
                      {!isGreen && rec.severity && <SeverityPill severity={rec.severity} />}
                    </div>
                    <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>{rec.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {isGreen && <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '12px', textAlign: 'center', fontStyle: 'italic' }}>Ward is currently stable. Continue routine monitoring and preventive measures.</p>}
          </div>
          <button
            onClick={() => {
              const recHtml = recItems.map(rec => `<div style="display:flex;gap:10px;align-items:flex-start;background:${isGreen ? '#F0FDF4' : (rec.bg||'#FFF7ED')};border:1px solid ${isGreen ? '#A7F3D0' : (rec.border||'#FDE68A')};border-radius:6px;padding:10px;margin-bottom:8px;"><span style="font-size:16px;flex-shrink:0">${rec.icon}</span><div><p style="font-size:11px;font-weight:700;color:${isGreen ? '#065F46' : (rec.color||'#92400E')};margin-bottom:3px">${rec.title}${rec.severity ? ` — ${rec.severity}` : ''}</p><p style="font-size:11px;color:#374151;line-height:1.5">${rec.text}</p></div></div>`).join('')
              const printWindow = window.open('', '_blank')
              printWindow.document.write(`<!DOCTYPE html><html><head><title>${ward.wardName} — Ward Report</title><style>* { margin:0;padding:0;box-sizing:border-box; } body { font-family:Arial,sans-serif;padding:20px;color:#1E293B;font-size:12px; } h1 { font-size:18px;font-weight:700;margin-bottom:2px; } .sub { font-size:11px;color:#94A3B8;margin-bottom:12px; } .grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px; } .card { border:1.5px solid #E2E8F0;border-radius:8px;padding:10px;text-align:center; } .label { font-size:10px;font-weight:600;color:#64748B;margin-bottom:4px;text-transform:uppercase; } .big { font-size:24px;font-weight:700; } .section { background:#F8FAFC;border-radius:8px;padding:10px;margin-bottom:10px; } .section-title { font-size:12px;font-weight:600;margin-bottom:8px; } .bar-label { display:flex;justify-content:space-between;font-size:11px;color:#64748B;margin-bottom:3px; } .bar-track { background:#E2E8F0;border-radius:4px;height:6px;margin-bottom:8px; } .bar-fill { height:6px;border-radius:4px; } .row { display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #F1F5F9;font-size:12px; } .row-label { color:#64748B; } .row-val { font-weight:600; } .rec-section { background:${isGreen ? '#F0FDF4' : '#FFFBEB'};border:1.5px solid ${isGreen ? '#6EE7B7' : '#FDE68A'};border-radius:8px;padding:12px;margin-bottom:10px; } .rec-title { font-size:12px;font-weight:700;color:${isGreen ? '#065F46' : '#78350F'};margin-bottom:10px; } @media print { body { padding:12px; } @page { margin:10mm;size:A4; } }</style></head><body>
              <h1>${ward.wardName}</h1><p class="sub">Ward Code: ${ward.wardCode} · Population: ${(ward.population || 0).toLocaleString()} · Printed: ${new Date().toLocaleString()}</p>
              <div class="grid"><div class="card"><div class="label">Risk Level</div><div class="big">${ward.riskLevel || '—'}</div></div><div class="card"><div class="label">HAI Score</div><div class="big">${hai}/100</div></div></div>
              <div class="section"><div class="section-title">📊 Key Metrics</div>
              <div class="row"><span class="row-label">Top Disease</span><span class="row-val">${ward.topDisease || '—'}</span></div>
              <div class="row"><span class="row-label">Cases Today</span><span class="row-val">${ward.todayCases ?? 0}</span></div>
              <div class="row"><span class="row-label">Available Beds</span><span class="row-val">${ward.availableBeds ?? 0} / ${ward.totalBeds ?? 0}</span></div>
              <div class="row"><span class="row-label">ICU Available</span><span class="row-val">${ward.icuAvailable ?? 0} / ${ward.icuTotal ?? 0}</span></div>
              <div class="row"><span class="row-label">Medicine Stock</span><span class="row-val">${medPct}%</span></div></div>
              <div class="rec-section"><div class="rec-title">${isGreen ? '✅ Green Zone — Preventive Measures' : '📋 Action Recommendations'}</div>${recHtml}</div>
              <p style="font-size:11px;color:#94A3B8;text-align:center;margin-top:24px">CareCrew — Solapur Municipal Corporation · Generated: ${new Date().toLocaleString()}</p>
              </body></html>`)
              printWindow.document.close()
              printWindow.focus()
              setTimeout(() => printWindow.print(), 500)
            }}
            style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' }}
          >
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Alert Command Center Modal ───────────────────────────────────────────────
const AlertCommandCenter = ({ allAlerts, dismissedIds, onDismiss, onDismissAll, onClose, token, onAlertStatusChange }) => {
  const [filterSeverity, setFilterSeverity] = useState('All')
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('active')
  const [expandedId, setExpandedId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [actionError, setActionError] = useState(null)

  const PRIORITY_ORDER = { Critical: 1, High: 2, Medium: 3, Low: 4 }
  const SEVERITY_COLORS = {
    Critical: { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B', dot: '#DC2626' },
    High: { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', dot: '#EA580C' },
    Medium: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', dot: '#D97706' },
    Low: { bg: '#F0FDF4', border: '#BBF7D0', text: '#065F46', dot: '#16A34A' },
  }

  const authHeaders = { Authorization: `Bearer ${token}` }

  const handleAcknowledge = async (e, alert) => {
    e.stopPropagation()
    if (alert.isThreshold) { onAlertStatusChange(alert._id, 'acknowledged'); return }
    setActionLoading(alert._id); setActionError(null)
    try {
      await axios.patch(`https://carecrew-1.onrender.com/api/alerts/${alert._id}/acknowledge`, {}, { headers: authHeaders })
      onAlertStatusChange(alert._id, 'acknowledged')
    } catch (err) {
      setActionError(`Failed to acknowledge: ${err.response?.data?.message || err.message}`)
    } finally { setActionLoading(null) }
  }

  const handleResolve = async (e, alert) => {
    e.stopPropagation()
    if (alert.isThreshold) { onAlertStatusChange(alert._id, 'resolved'); onDismiss(alert._id); return }
    setActionLoading(alert._id); setActionError(null)
    try {
      await axios.patch(`https://carecrew-1.onrender.com/api/alerts/${alert._id}/resolve`, {}, { headers: authHeaders })
      onAlertStatusChange(alert._id, 'resolved'); onDismiss(alert._id)
    } catch (err) {
      setActionError(`Failed to resolve: ${err.response?.data?.message || err.message}`)
    } finally { setActionLoading(null) }
  }

  const activeAlerts = allAlerts.filter((a) => a.isActive && !dismissedIds.has(a._id) && a.status !== 'resolved')
  const acknowledgedCount = allAlerts.filter((a) => a.status === 'acknowledged').length
  const resolvedCount = allAlerts.filter((a) => a.status === 'resolved' || dismissedIds.has(a._id)).length
  const criticalCount = activeAlerts.filter((a) => a.severity === 'Critical').length
  const highCount = activeAlerts.filter((a) => a.severity === 'High').length

  const statusTabs = [
    { key: 'active', label: 'Active', count: activeAlerts.length, color: '#DC2626', bg: '#FEE2E2' },
    { key: 'acknowledged', label: 'Acknowledged', count: acknowledgedCount, color: '#1D4ED8', bg: '#EFF6FF' },
    { key: 'resolved', label: 'Resolved', count: resolvedCount, color: '#16A34A', bg: '#F0FDF4' },
    { key: 'all', label: 'All', count: allAlerts.length, color: '#475569', bg: '#F1F5F9' },
  ]

  const baseFiltered = allAlerts
    .filter((a) => {
      if (filterStatus === 'active') return a.isActive && !dismissedIds.has(a._id) && a.status !== 'resolved'
      if (filterStatus === 'acknowledged') return a.status === 'acknowledged'
      if (filterStatus === 'resolved') return a.status === 'resolved' || dismissedIds.has(a._id)
      return true
    })
    .sort((a, b) => (PRIORITY_ORDER[a.severity] || 5) - (PRIORITY_ORDER[b.severity] || 5))

  const alertTypes = ['All', ...new Set(allAlerts.map((a) => a.alertType))]
  const severities = ['All', 'Critical', 'High', 'Medium', 'Low']
  const filtered = baseFiltered.filter((a) => {
    const matchSev = filterSeverity === 'All' || a.severity === filterSeverity
    const matchType = filterType === 'All' || a.alertType === filterType
    return matchSev && matchType
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '820px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', position: 'sticky', top: 0, background: '#fff', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>🚨 Alert Command Center</h2>
              {criticalCount > 0 && <span style={{ background: '#DC2626', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>{criticalCount} CRITICAL</span>}
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
              {activeAlerts.length} active · {criticalCount} critical · {highCount} high · {acknowledgedCount} acknowledged · {resolvedCount} resolved
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeAlerts.length > 0 && (
              <button onClick={onDismissAll} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Dismiss All</button>
            )}
            <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '34px', height: '34px', fontSize: '16px', cursor: 'pointer', color: '#64748B' }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '12px 24px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {['Critical', 'High', 'Medium'].map((sev) => {
            const c = activeAlerts.filter((a) => a.severity === sev).length
            const col = SEVERITY_COLORS[sev]
            return (
              <div key={sev} style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '110px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.dot, display: 'inline-block', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: col.text, lineHeight: 1 }}>{c}</p>
                  <p style={{ fontSize: '10px', color: col.text, fontWeight: 600 }}>{sev}</p>
                </div>
              </div>
            )
          })}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
            <span>Last checked:</span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        <div style={{ padding: '0 24px', borderBottom: '1px solid #F1F5F9', display: 'flex' }}>
          {statusTabs.map((tab) => (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key)} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', borderBottom: filterStatus === tab.key ? `2px solid ${tab.color}` : '2px solid transparent', background: 'none', color: filterStatus === tab.key ? tab.color : '#64748B', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
              {tab.label}
              <span style={{ background: filterStatus === tab.key ? tab.bg : '#F1F5F9', color: filterStatus === tab.key ? tab.color : '#94A3B8', fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px' }}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div style={{ padding: '10px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Filter:</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {severities.map((s) => (
              <button key={s} onClick={() => setFilterSeverity(s)} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: `1.5px solid ${filterSeverity === s ? '#2563EB' : '#E2E8F0'}`, background: filterSeverity === s ? '#EFF6FF' : '#fff', color: filterSeverity === s ? '#2563EB' : '#64748B', cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: '8px' }}>
            {alertTypes.map((t) => (
              <button key={t} onClick={() => setFilterType(t)} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: `1.5px solid ${filterType === t ? '#7C3AED' : '#E2E8F0'}`, background: filterType === t ? '#F3E8FF' : '#fff', color: filterType === t ? '#7C3AED' : '#64748B', cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
        </div>

        {actionError && (
          <div style={{ margin: '12px 24px 0', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#991B1B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontSize: '14px', fontWeight: 700 }}>✕</button>
          </div>
        )}

        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '14px' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>{filterStatus === 'resolved' ? '✅' : filterStatus === 'acknowledged' ? '👁️' : '🔔'}</p>
              <p>{filterStatus === 'active' ? 'No active alerts.' : filterStatus === 'acknowledged' ? 'No acknowledged alerts.' : filterStatus === 'resolved' ? 'No resolved alerts.' : 'No alerts found.'}</p>
            </div>
          ) : (
            filtered.map((alert) => {
              const col = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.Low
              const isExpanded = expandedId === alert._id
              const isLoading = actionLoading === alert._id
              const isAcknowledged = alert.status === 'acknowledged'
              const isResolved = alert.status === 'resolved'
              return (
                <div key={alert._id} style={{ background: isResolved ? '#F8FAFC' : col.bg, border: `1.5px solid ${isResolved ? '#E2E8F0' : col.border}`, borderRadius: '12px', overflow: 'hidden', opacity: isResolved ? 0.75 : 1 }}>
                  <div style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px' }} onClick={() => setExpandedId(isExpanded ? null : alert._id)}>
                    <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>{alert.icon || '⚠️'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: isResolved ? '#64748B' : col.text }}>{alert.wardName}</span>
                        <SeverityPill severity={alert.severity} />
                        <StatusPill status={alert.status} />
                        <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.07)', color: isResolved ? '#64748B' : col.text, padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>{alert.alertType}</span>
                        {alert.isThreshold && <span style={{ fontSize: '10px', background: '#EFF6FF', color: '#2563EB', padding: '1px 6px', borderRadius: '20px', fontWeight: 600, border: '1px solid #BFDBFE' }}>AUTO-DETECTED</span>}
                      </div>
                      <p style={{ fontSize: '12px', color: isResolved ? '#94A3B8' : col.text }}>{alert.message}</p>
                      {isAcknowledged && alert.acknowledgedBy && (
                        <p style={{ fontSize: '11px', color: '#1D4ED8', marginTop: '4px' }}>
                          👁️ Acknowledged by {alert.acknowledgedBy.name || alert.acknowledgedBy.email}
                          {alert.acknowledgedAt ? ` ┬╖ ${new Date(alert.acknowledgedAt).toLocaleString()}` : ''}
                        </p>
                      )}
                      {isResolved && alert.resolvedBy && (
                        <p style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px' }}>
                          ✅ Resolved by {alert.resolvedBy.name || alert.resolvedBy.email}
                          {alert.resolvedAt ? ` · ${new Date(alert.resolvedAt).toLocaleString()}` : ''}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '12px', color: col.text, opacity: 0.7 }}>{isExpanded ? '▲' : '▼'}</span>
                      {!isAcknowledged && !isResolved && (
                        <button onClick={(e) => handleAcknowledge(e, alert)} disabled={isLoading} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: '#1D4ED8', cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isLoading ? 0.6 : 1 }}>
                          {isLoading ? '...' : '👁️ Acknowledge'}
                        </button>
                      )}
                      {!isResolved && (
                        <button onClick={(e) => handleResolve(e, alert)} disabled={isLoading} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: '#16A34A', cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isLoading ? 0.6 : 1 }}>
                          {isLoading ? '...' : '✅ Resolve'}
                        </button>
                      )}
                      {!isResolved && (
                        <button onClick={(e) => { e.stopPropagation(); onDismiss(alert._id) }} style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${col.border}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: col.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '12px 16px 14px', borderTop: `1px solid ${isResolved ? '#E2E8F0' : col.border}`, background: 'rgba(255,255,255,0.5)' }}>
                      {alert.recommendation && (
                        <>
                          <p style={{ fontSize: '11px', fontWeight: 700, color: isResolved ? '#64748B' : col.text, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💡 Recommended Action</p>
                          <p style={{ fontSize: '13px', color: '#1E293B', lineHeight: 1.6, marginBottom: '8px' }}>{alert.recommendation}</p>
                        </>
                      )}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: '#94A3B8' }}>
                        {alert.triggeredAt && <span>Triggered: {new Date(alert.triggeredAt).toLocaleString()}</span>}
                        {alert.acknowledgedAt && <span>Acknowledged: {new Date(alert.acknowledgedAt).toLocaleString()}</span>}
                        {alert.resolvedAt && <span>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Broadcast Composer Modal ─────────────────────────────────────────────────────────────────────────────
const BroadcastComposer = ({ wards, token, onClose, onSent }) => {
  const wardNames = wards.map(w => w.wardName)
  const hospitalNames = [...new Set(wards.map(w => w.hospitalName).filter(Boolean))].sort()

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'General Info',
    priority: 'Medium',
    targetType: 'citizens',
    targetWards: [],
    targetHospital: '',
    expiresAt: '',
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const TYPES = ['General Info', 'Health Advisory', 'Disease Alert', 'Vaccination Drive', 'Emergency']
  const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
  const PRIORITY_COLORS = { Low: '#16A34A', Medium: '#D97706', High: '#EA580C', Urgent: '#DC2626' }
  const PRIORITY_BG = { Low: '#F0FDF4', Medium: '#FEF3C7', High: '#FFF7ED', Urgent: '#FEE2E2' }

  const toggleWard = (ward) => {
    setForm(f => {
      const next = f.targetWards.includes(ward)
        ? f.targetWards.filter(w => w !== ward)
        : [...f.targetWards, ward]
      return { ...f, targetWards: next }
    })
  }

  const selectAllWards = () => setForm(f => ({ ...f, targetWards: [] }))

  const handleSend = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.message.trim()) { setError('Message is required.'); return }
    setSending(true)
    setError(null)
    try {
      let targetAudience, targetWard = null, targetHospitalName = null
      if (form.targetType === 'citizens') {
        targetAudience = form.targetWards.length === 0 ? 'all_citizens' : 'ward_citizens'
        targetWard = form.targetWards.length > 0 ? form.targetWards[0] : null
      } else {
        targetAudience = form.targetHospital === '' ? 'all_hospitals' : 'specific_hospital'
        targetHospitalName = form.targetHospital || null
      }
      const res = await axios.post(
        'https://carecrew-1.onrender.com/api/broadcasts',
        { title: form.title.trim(), message: form.message.trim(), category: form.type, priority: form.priority, targetAudience, targetWard, targetHospitalName, expiresAt: form.expiresAt || null },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(true)
      onSent(res.data.broadcast)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      console.log('Broadcast error:', err.response?.data || err.message)
      setError(err.response?.data?.message || 'Failed to send broadcast. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const typeStyle = BROADCAST_TYPE_STYLES[form.type] || BROADCAST_TYPE_STYLES['General Info']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '660px', maxHeight: '94vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0,0,0,0.22)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>📢 Send Broadcast</h2>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>Message will be visible on the target dashboard immediately after sending</p>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748B', flexShrink: 0 }}>✕</button>
        </div>
        {success ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '52px', marginBottom: '14px' }}>📡</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#16A34A', marginBottom: '6px' }}>Broadcast Sent!</p>
            <p style={{ fontSize: '13px', color: '#94A3B8' }}>
              {form.targetType === 'citizens'
                ? `Citizens ${form.targetWards.length > 0 ? `in ${form.targetWards.join(', ')}` : 'across all wards'} will see this on their dashboard.`
                : `${form.targetHospital || 'All hospital staff'} will see this on their dashboard.`
              }
            </p>
          </div>
        ) : (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991B1B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontSize: '14px', fontWeight: 700 }}>✕</button>
              </div>
            )}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '7px' }}>Send To</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setForm(f => ({ ...f, targetType: 'citizens', targetHospital: '' }))}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${form.targetType === 'citizens' ? '#2563EB' : '#E2E8F0'}`, background: form.targetType === 'citizens' ? '#EFF6FF' : '#fff', color: form.targetType === 'citizens' ? '#2563EB' : '#64748B', transition: 'all 0.15s' }}>
                  👨‍👩‍👧 Citizens
                </button>
                <button onClick={() => setForm(f => ({ ...f, targetType: 'hospitals', targetWards: [] }))}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${form.targetType === 'hospitals' ? '#059669' : '#E2E8F0'}`, background: form.targetType === 'hospitals' ? '#ECFDF5' : '#fff', color: form.targetType === 'hospitals' ? '#059669' : '#64748B', transition: 'all 0.15s' }}>
                  🏥 Hospital Staff
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '7px' }}>Broadcast Title <span style={{ color: '#DC2626' }}>*</span></label>
              <input type="text" placeholder="e.g. Dengue Alert — Ward 7 & 8" maxLength={120} value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1.5px solid ${form.title ? '#2563EB40' : '#E2E8F0'}`, borderRadius: '10px', outline: 'none', color: '#1E293B', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
              <p style={{ fontSize: '11px', color: form.title.length > 100 ? '#EA580C' : '#CBD5E1', marginTop: '4px', textAlign: 'right' }}>{form.title.length}/120</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '7px' }}>Message Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: `1.5px solid ${typeStyle.bg}`, borderRadius: '10px', outline: 'none', color: typeStyle.color, background: typeStyle.bg, cursor: 'pointer', fontWeight: 600 }}>
                  {TYPES.map(t => <option key={t} value={t}>{BROADCAST_TYPE_STYLES[t]?.icon} {t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '7px' }}>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: `1.5px solid ${PRIORITY_COLORS[form.priority]}50`, borderRadius: '10px', outline: 'none', color: PRIORITY_COLORS[form.priority], background: PRIORITY_BG[form.priority], cursor: 'pointer', fontWeight: 700 }}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '7px' }}>Message <span style={{ color: '#DC2626' }}>*</span></label>
              <textarea
                placeholder={form.targetType === 'citizens' ? 'Write a clear, actionable message for citizens. Include what precautions to take, where to go for help, and any emergency contact numbers if relevant.' : 'Write a message for hospital staff. Include action items, reporting requirements, or operational instructions.'}
                maxLength={2000} rows={5} value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: `1.5px solid ${form.message ? '#2563EB40' : '#E2E8F0'}`, borderRadius: '10px', outline: 'none', color: '#1E293B', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.2s' }} />
              <p style={{ fontSize: '11px', color: form.message.length > 1800 ? '#EA580C' : '#CBD5E1', marginTop: '4px', textAlign: 'right' }}>{form.message.length}/2000</p>
            </div>
            {form.targetType === 'citizens' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Wards</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {form.targetWards.length === 0 ? '📣 Broadcasting to all wards' : `${form.targetWards.length} ward(s) selected`}
                    </span>
                    {form.targetWards.length > 0 && (
                      <button onClick={selectAllWards} style={{ fontSize: '11px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '0' }}>Clear (all wards)</button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <button onClick={selectAllWards}
                    style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${form.targetWards.length === 0 ? '#2563EB' : '#E2E8F0'}`, background: form.targetWards.length === 0 ? '#EFF6FF' : '#fff', color: form.targetWards.length === 0 ? '#2563EB' : '#64748B', transition: 'all 0.15s' }}>
                    🌐 All Wards
                  </button>
                  {wardNames.map(ward => {
                    const isSelected = form.targetWards.includes(ward)
                    return (
                      <button key={ward} onClick={() => toggleWard(ward)}
                        style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${isSelected ? '#059669' : '#E2E8F0'}`, background: isSelected ? '#ECFDF5' : '#fff', color: isSelected ? '#065F46' : '#64748B', transition: 'all 0.15s' }}>
                        {isSelected ? '✓ ' : ''}{ward}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '7px' }}>Target Hospital</label>
                <select value={form.targetHospital} onChange={e => setForm(f => ({ ...f, targetHospital: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '10px', outline: 'none', color: '#1E293B', background: '#fff', cursor: 'pointer' }}>
                  <option value=''>🏥 All Hospitals & UPHCs</option>
                  {hospitalNames.map(h => <option key={h} value={h}>{h.includes('UPHC') ? '🏥 ' : '🏨 '}{h}</option>)}
                </select>
                <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '5px' }}>
                  {form.targetHospital === '' ? `📣 Broadcasting to all ${hospitalNames.length} hospitals & UPHCs` : `Sending only to ${form.targetHospital}`}
                </p>
              </div>
            )}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '7px' }}>
                Expires At &nbsp;<span style={{ fontWeight: 400, textTransform: 'none', color: '#94A3B8', fontSize: '11px' }}>optional — leave blank to keep active indefinitely</span>
              </label>
              <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                style={{ padding: '10px 14px', fontSize: '13px', border: '1.5px solid #E2E8F0', borderRadius: '10px', outline: 'none', color: '#1E293B' }} />
            </div>
            {(form.title || form.message) && (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Preview — as {form.targetType === 'citizens' ? 'citizens' : 'hospital staff'} will see it
                </p>
                <div style={{ background: form.priority === 'Urgent' ? '#FEF2F2' : form.priority === 'High' ? '#FFF7ED' : '#F8FAFC', border: `1.5px solid ${PRIORITY_COLORS[form.priority]}30`, borderLeft: `4px solid ${PRIORITY_COLORS[form.priority]}`, borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ ...pillBase, background: typeStyle.bg, color: typeStyle.color }}>{typeStyle.icon} {form.type}</span>
                    <span style={{ ...pillBase, background: PRIORITY_BG[form.priority], color: PRIORITY_COLORS[form.priority], border: `1px solid ${PRIORITY_COLORS[form.priority]}40` }}>{form.priority} Priority</span>
                    {form.targetType === 'citizens' ? (
                      form.targetWards.length === 0
                        ? <span style={{ ...pillBase, background: '#F1F5F9', color: '#475569' }}>🌐 All Wards</span>
                        : form.targetWards.slice(0, 3).map(w => <span key={w} style={{ ...pillBase, background: '#ECFDF5', color: '#065F46' }}>{w}</span>)
                    ) : (
                      <span style={{ ...pillBase, background: '#ECFDF5', color: '#065F46' }}>🏥 {form.targetHospital || 'All Hospitals'}</span>
                    )}
                    {form.targetWards.length > 3 && <span style={{ ...pillBase, background: '#F1F5F9', color: '#94A3B8' }}>+{form.targetWards.length - 3} more</span>}
                  </div>
                  {form.title && <p style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>{form.title}</p>}
                  {form.message && <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{form.message}</p>}
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>
                    Sent by Solapur Municipal Corporation · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
            <button onClick={handleSend} disabled={sending || !form.title.trim() || !form.message.trim()}
              style={{
                background: sending ? '#93C5FD' : !form.title.trim() || !form.message.trim() ? '#E2E8F0' : form.priority === 'Urgent' ? '#DC2626' : form.targetType === 'hospitals' ? '#059669' : '#2563EB',
                color: !form.title.trim() || !form.message.trim() ? '#94A3B8' : '#fff',
                border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 700,
                cursor: sending || !form.title.trim() || !form.message.trim() ? 'not-allowed' : 'pointer',
                width: '100%', boxShadow: sending || !form.title.trim() || !form.message.trim() ? 'none' : '0 4px 14px rgba(0,0,0,0.15)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
              {sending ? (
                <>📡 Sending broadcast...</>
              ) : form.targetType === 'citizens' ? (
                <>📢 Send to Citizens{form.targetWards.length > 0 ? ` (${form.targetWards.length} ward${form.targetWards.length > 1 ? 's' : ''})` : ' (All Wards)'}</>
              ) : (
                <>🏥 Send to {form.targetHospital || 'All Hospitals'}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Broadcast History Panel ──────────────────────────────────────────────────────────────────────────────
const BroadcastHistoryPanel = ({ broadcasts, token, onDeactivate, onClose }) => {
  const [deactivatingId, setDeactivatingId] = useState(null)

  const handleDeactivate = async (id) => {
    setDeactivatingId(id)
    try {
      await axios.patch(
        `https://carecrew-1.onrender.com/api/broadcasts/${id}`,
        { isActive: false },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      onDeactivate(id)
    } catch (err) {
      console.error('Deactivate failed:', err)
    } finally {
      setDeactivatingId(null)
    }
  }

  const active = broadcasts.filter(b => b.isActive)
  const inactive = broadcasts.filter(b => !b.isActive)

  const BroadcastCard = ({ b }) => {
    const typeStyle = BROADCAST_TYPE_STYLES[b.type] || BROADCAST_TYPE_STYLES['General Info']
    const prioStyle = BROADCAST_PRIORITY_STYLES[b.priority] || BROADCAST_PRIORITY_STYLES['Medium']
    return (
      <div style={{ background: b.isActive ? '#FAFFFE' : '#F8FAFC', border: `1.5px solid ${b.isActive ? '#05966930' : '#E2E8F0'}`, borderLeft: `4px solid ${b.isActive ? '#059669' : '#CBD5E1'}`, borderRadius: '10px', padding: '14px 16px', opacity: b.isActive ? 1 : 0.65 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span style={{ ...pillBase, background: typeStyle.bg, color: typeStyle.color, fontSize: '10px' }}>{typeStyle.icon} {b.type}</span>
              <span style={{ ...pillBase, background: prioStyle.bg, color: prioStyle.color, border: `1px solid ${prioStyle.border}`, fontSize: '10px' }}>{b.priority}</span>
              {b.isActive
                ? <span style={{ ...pillBase, background: '#ECFDF5', color: '#065F46', fontSize: '10px' }}>● Active</span>
                : <span style={{ ...pillBase, background: '#F1F5F9', color: '#64748B', fontSize: '10px' }}>Deactivated</span>
              }
              {b.targetWards && b.targetWards.length > 0
                ? b.targetWards.slice(0, 2).map(w => <span key={w} style={{ ...pillBase, background: '#F1F5F9', color: '#475569', fontSize: '10px', padding: '2px 6px' }}>{w}</span>)
                : <span style={{ ...pillBase, background: '#EFF6FF', color: '#1D4ED8', fontSize: '10px' }}>All Wards</span>
              }
              {b.targetWards && b.targetWards.length > 2 && (
                <span style={{ ...pillBase, background: '#F1F5F9', color: '#94A3B8', fontSize: '10px', padding: '2px 6px' }}>+{b.targetWards.length - 2}</span>
              )}
            </div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>{b.title}</p>
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.message}</p>
            <p style={{ fontSize: '11px', color: '#94A3B8' }}>
              Sent {new Date(b.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {b.createdBy?.name ? ` · by ${b.createdBy.name}` : ''}
              {b.expiresAt ? ` · Expires ${new Date(b.expiresAt).toLocaleDateString()}` : ''}
            </p>
          </div>
          {b.isActive && (
            <button onClick={() => handleDeactivate(b._id)} disabled={deactivatingId === b._id}
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, color: '#991B1B', cursor: deactivatingId === b._id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, opacity: deactivatingId === b._id ? 0.6 : 1 }}>
              {deactivatingId === b._id ? '...' : '🔕 Deactivate'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0,0,0,0.22)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>📋 Broadcast History</h2>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
              {active.length} active · {inactive.length} deactivated · {broadcasts.length} total
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748B' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {broadcasts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <p style={{ fontSize: '40px', marginBottom: '12px' }}>📭</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>No broadcasts yet</p>
              <p style={{ fontSize: '13px', color: '#94A3B8' }}>Broadcasts you send will appear here.</p>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>● Active Broadcasts ({active.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {active.map(b => <BroadcastCard key={b._id} b={b} />)}
                  </div>
                </div>
              )}
              {inactive.length > 0 && (
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Deactivated ({inactive.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {inactive.map(b => <BroadcastCard key={b._id} b={b} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
// ─── Indent Panel ─────────────────────────────────────────────────────────────
const IndentPanel = ({ indents, onReview, onClose }) => {
  const [filter, setFilter] = useState('pending')
  const [reviewingId, setReviewingId] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const URGENCY_STYLES = {
    routine:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
    urgent:   { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
    critical: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  }
  const STATUS_STYLES = {
    pending:   { bg: '#FEF3C7', color: '#92400E' },
    approved:  { bg: '#F0FDF4', color: '#16A34A' },
    rejected:  { bg: '#FEE2E2', color: '#991B1B' },
    fulfilled: { bg: '#EFF6FF', color: '#1D4ED8' },
  }

  const counts = {
    pending:   indents.filter(i => i.status === 'pending').length,
    approved:  indents.filter(i => i.status === 'approved').length,
    rejected:  indents.filter(i => i.status === 'rejected').length,
    fulfilled: indents.filter(i => i.status === 'fulfilled').length,
  }

  const filtered = indents.filter(i => filter === 'all' || i.status === filter)

  const handleReview = async (id, status) => {
    setActionLoading(id)
    await onReview(id, status, reviewNote)
    setReviewingId(null)
    setReviewNote('')
    setActionLoading(null)
  }

  const ITEM_TYPE_ICONS = { medicine: '💊', equipment: '🩺', supply: '📦' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '820px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0,0,0,0.22)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E293B' }}>📦 Indent Requests</h2>
              {counts.pending > 0 && (
                <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', border: '1px solid #FDE68A' }}>
                  {counts.pending} PENDING
                </span>
              )}
              {counts.critical > 0 && (
                <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                  🚨 {indents.filter(i => i.urgency === 'critical' && i.status === 'pending').length} CRITICAL
                </span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>
              {counts.pending} pending · {counts.approved} approved · {counts.fulfilled} fulfilled · {counts.rejected} rejected
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', fontSize: '16px', cursor: 'pointer', color: '#64748B' }}>✕</button>
        </div>

        {/* Summary cards */}
        <div style={{ padding: '12px 24px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { label: 'Pending', count: counts.pending, color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
            { label: 'Critical Urgency', count: indents.filter(i => i.urgency === 'critical' && i.status === 'pending').length, color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
            { label: 'Approved', count: counts.approved, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
            { label: 'Fulfilled', count: counts.fulfilled, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
          ].map(({ label, count, color, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '110px' }}>
              <div>
                <p style={{ fontSize: '18px', fontWeight: 700, color, lineHeight: 1 }}>{count}</p>
                <p style={{ fontSize: '10px', color, fontWeight: 600 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid #F1F5F9' }}>
          {[
            { key: 'pending',   color: '#D97706', bg: '#FEF3C7' },
            { key: 'approved',  color: '#16A34A', bg: '#F0FDF4' },
            { key: 'fulfilled', color: '#1D4ED8', bg: '#EFF6FF' },
            { key: 'rejected',  color: '#DC2626', bg: '#FEE2E2' },
            { key: 'all',       color: '#475569', bg: '#F1F5F9' },
          ].map(({ key, color, bg }) => (
            <button key={key} onClick={() => setFilter(key)} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', borderBottom: filter === key ? `2px solid ${color}` : '2px solid transparent', background: 'none', color: filter === key ? color : '#64748B', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize', transition: 'all 0.15s' }}>
              {key}
              <span style={{ background: filter === key ? bg : '#F1F5F9', color: filter === key ? color : '#94A3B8', fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px' }}>
                {key === 'all' ? indents.length : counts[key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>📭</p>
              <p style={{ fontSize: '14px' }}>No {filter === 'all' ? '' : filter} requests.</p>
            </div>
          ) : filtered.map(indent => {
            const urg = URGENCY_STYLES[indent.urgency] || URGENCY_STYLES.routine
            const sta = STATUS_STYLES[indent.status]  || STATUS_STYLES.pending
            const isReviewing = reviewingId === indent._id
            const isLoading   = actionLoading === indent._id
            const typeIcon    = ITEM_TYPE_ICONS[indent.itemType] || '📦'

            return (
              <div key={indent._id} style={{ border: `1.5px solid ${urg.border}`, borderRadius: '12px', overflow: 'hidden', background: urg.bg, opacity: indent.status === 'rejected' ? 0.7 : 1 }}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ fontSize: '16px' }}>{typeIcon}</span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{indent.itemName}</span>
                        <span style={{ ...pillBase, background: urg.bg, color: urg.color, border: `1px solid ${urg.border}`, textTransform: 'capitalize' }}>{indent.urgency}</span>
                        <span style={{ ...pillBase, background: sta.bg, color: sta.color, textTransform: 'capitalize' }}>{indent.status}</span>
                        <span style={{ ...pillBase, background: '#EFF6FF', color: '#1D4ED8', textTransform: 'capitalize' }}>{indent.itemType}</span>
                      </div>

                      {/* Meta row */}
                      <p style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                        🏥 <strong>{indent.hospitalName}</strong> &nbsp;·&nbsp; 📍 {indent.wardName} &nbsp;·&nbsp; Qty: <strong>{indent.quantityRequired}</strong>
                      </p>

                      {/* Reason */}
                      {indent.reason && (
                        <p style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic', marginBottom: '4px' }}>
                          "{indent.reason}"
                        </p>
                      )}

                      {/* Timestamps */}
                      <p style={{ fontSize: '11px', color: '#94A3B8' }}>
                        Submitted {new Date(indent.createdAt).toLocaleString()}
                        {indent.submittedBy?.name ? ` · by ${indent.submittedBy.name}` : ''}
                        {indent.reviewedAt ? ` · Reviewed ${new Date(indent.reviewedAt).toLocaleString()}` : ''}
                      </p>

                      {/* Review note */}
                      {indent.reviewNote && indent.reviewNote !== 'Cancelled by hospital' && (
                        <div style={{ marginTop: '6px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '6px 10px', display: 'inline-block' }}>
                          <p style={{ fontSize: '12px', color: '#1D4ED8' }}>💬 {indent.reviewNote}</p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {indent.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReview(indent._id, 'approved')}
                            disabled={isLoading}
                            style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isLoading ? 0.6 : 1 }}
                          >
                            {isLoading ? '...' : '✅ Approve'}
                          </button>
                          <button
                            onClick={() => handleReview(indent._id, 'rejected')}
                            disabled={isLoading}
                            style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isLoading ? 0.6 : 1 }}
                          >
                            {isLoading ? '...' : '✗ Reject'}
                          </button>
                        </>
                      )}
                      {indent.status === 'approved' && (
                        <button
                          onClick={() => onReview(indent._id, 'fulfilled', '')}
                          disabled={isLoading}
                          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#1D4ED8', cursor: isLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: isLoading ? 0.6 : 1 }}
                        >
                          {isLoading ? '...' : '✅ Mark Fulfilled'}
                        </button>
                      )}
                    </div>
                  </div>

                  </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('wards') // 'wards' | 'hospitals'
  const [wards, setWards] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [apiAlerts, setApiAlerts] = useState([])
  const [charts, setCharts] = useState({ topDiseases: [], dailyCases: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dismissedIds, setDismissedIds] = useState(() => loadDismissedIds())
  const [search, setSearch] = useState('')
  const [hospitalSearch, setHospitalSearch] = useState('')
  const [selectedWard, setSelectedWard] = useState(null)
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [activeDiseases, setActiveDiseases] = useState(new Set(DISEASES))
  const [showAlertCenter, setShowAlertCenter] = useState(false)
  const [thresholdAlerts, setThresholdAlerts] = useState([])
  const [alertStatusOverrides, setAlertStatusOverrides] = useState({})
  const [indents, setIndents] = useState([])                    // ← NEW
  const [showIndentPanel, setShowIndentPanel] = useState(false) // ← NEW
  const sentAlertIds = React.useRef(new Set(JSON.parse(localStorage.getItem('sentWhatsAppIds') || '[]')))



  // ── Broadcast state ──────────────────────────────────────────────────────────
  const [broadcasts, setBroadcasts] = useState([])
  const [showBroadcastComposer, setShowBroadcastComposer] = useState(false)
  const [showBroadcastHistory, setShowBroadcastHistory] = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}` }

  const fetchAll = useCallback(async () => {
    try {
      setError(null)
      const [wardsRes, alertsRes, chartsRes, broadcastsRes, indentsRes] = await Promise.all([
        axios.get('https://carecrew-1.onrender.com/api/dashboard/wards', { headers: authHeaders }),
        axios.get('https://carecrew-1.onrender.com/api/dashboard/alerts', { headers: authHeaders }),
        axios.get('https://carecrew-1.onrender.com/api/dashboard/charts', { headers: authHeaders }),
        axios.get('https://carecrew-1.onrender.com/api/broadcasts', { headers: authHeaders }).catch(() => ({ data: { broadcasts: [] } })),
        axios.get('https://carecrew-1.onrender.com/api/indent/all', { headers: authHeaders }).catch(() => ({ data: { requests: [] } })), // ← NEW
      ])
      const fetchedWards = toArray(wardsRes.data, 'wards')
      setWards(fetchedWards)
      setApiAlerts(toArray(alertsRes.data, 'alerts'))
      const cd = chartsRes.data || {}
      setCharts({ topDiseases: toArray(cd.topDiseases, 'topDiseases'), dailyCases: toArray(cd.dailyCases, 'dailyCases') })
      setThresholdAlerts(computeThresholdAlerts(fetchedWards))
      setBroadcasts(toArray(broadcastsRes.data, 'broadcasts'))
      setIndents(toArray(indentsRes.data, 'requests')) // ← NEW
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const allAlerts = React.useMemo(() => {
    const merged = [...apiAlerts, ...thresholdAlerts]
    const seen = new Set()
    return merged
      .filter((a) => { if (seen.has(a._id)) return false; seen.add(a._id); return true })
      .map((a) => ({ ...a, status: alertStatusOverrides[a._id] || a.status || 'pending' }))
  }, [apiAlerts, thresholdAlerts, alertStatusOverrides])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => { if (wards.length > 0) setThresholdAlerts(computeThresholdAlerts(wards)) }, [wards])
  useEffect(() => { saveDismissedIds(dismissedIds) }, [dismissedIds])

  useEffect(() => {
    allAlerts.forEach(async (alert) => {
      // Only send if active, not resolved, severe ('High', 'Critical', 'Red'), and hasn't been sent yet
      const isSevere = ['High', 'Critical', 'Red'].includes(alert.severity);
      if (alert.isActive && alert.status !== 'resolved' && isSevere && !sentAlertIds.current.has(alert._id)) {
        sentAlertIds.current.add(alert._id);
        localStorage.setItem('sentWhatsAppIds', JSON.stringify([...sentAlertIds.current]));
        try {
          await axios.post(
            'https://carecrew-1.onrender.com/api/notifications/whatsapp',
            { alertId: alert._id, wardName: alert.wardName, alertType: alert.alertType, severity: alert.severity, message: alert.message },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          console.log('WhatsApp sent for trigger:', alert._id);
        } catch (error) {
          console.error('WhatsApp backend error:', error);
        }
      }
    });
  }, [allAlerts])

  useEffect(() => {
    if (wards.length > 0) {
      setHospitals(deriveHospitalsFromWards(wards, allAlerts))
    }
  }, [wards, allAlerts]) // eslint-disable-line react-hooks/exhaustive-deps

  // ← NEW
  const handleIndentReview = async (id, status, reviewNote = '') => {
    try {
      const res = await axios.patch(
        `https://carecrew-1.onrender.com/api/indent/${id}/review`,
        { status, reviewNote },
        { headers: authHeaders }
      )
      setIndents(prev => prev.map(i => i._id === id ? res.data.request : i))
    } catch (err) {
      console.error('Indent review failed:', err)
    }
  }

  const toggleDisease = (disease) => {
    setActiveDiseases(prev => { const next = new Set(prev); next.has(disease) ? next.delete(disease) : next.add(disease); return next })
  }

  const handleAlertStatusChange = (alertId, newStatus) => {
    setAlertStatusOverrides(prev => ({ ...prev, [alertId]: newStatus }))
  }

  // Broadcast handlers
  const handleBroadcastSent = (newBroadcast) => {
    setBroadcasts(prev => [newBroadcast, ...prev])
  }
  const handleBroadcastDeactivated = (id) => {
    setBroadcasts(prev => prev.map(b => b._id === id ? { ...b, isActive: false } : b))
  }

  const totalCases = wards.reduce((s, w) => s + getCases(w), 0)
  const wardsOnAlert = allAlerts.filter((a) => a.isActive && a.status !== 'resolved').length
  const hospitalsReporting = [...new Set(wards.map((w) => w.hospitalName).filter(Boolean))].length
  const alertZoneCount = wards.filter(
    (w) => allAlerts.some((a) => a.isActive && a.wardName === w.wardName && a.status !== 'resolved') ||
      ['red', 'yellow'].includes((w.riskLevel || '').toLowerCase())
  ).length
  const activeAlerts = allAlerts.filter((a) => a.isActive && !dismissedIds.has(a._id) && a.status !== 'resolved')
  const criticalCount = activeAlerts.filter((a) => a.severity === 'Critical').length
  const filteredWards = wards.filter((w) => w.wardName.toLowerCase().includes(search.toLowerCase()))
  const filteredHospitals = hospitals.filter((h) => h.hospitalName.toLowerCase().includes(hospitalSearch.toLowerCase()))
  const activeBroadcastCount = broadcasts.filter(b => b.isActive).length

  const handleDismiss = (id) => setDismissedIds((prev) => new Set([...prev, id]))
  const handleDismissAll = () => setDismissedIds(new Set(activeAlerts.map((a) => a._id)))

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
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary-200/30 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-brand/20 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply"></div>
      <Navbar />

      {/* ── Modals ── */}
      <WardReportModal ward={selectedWard} alerts={allAlerts} onClose={() => setSelectedWard(null)} />
      <HospitalDetailModal hospital={selectedHospital} onClose={() => setSelectedHospital(null)} />

      {showAlertCenter && (
        <AlertCommandCenter
          allAlerts={allAlerts}
          dismissedIds={dismissedIds}
          onDismiss={handleDismiss}
          onDismissAll={handleDismissAll}
          onClose={() => setShowAlertCenter(false)}
          token={token}
          onAlertStatusChange={handleAlertStatusChange}
        />
      )}

      {showBroadcastComposer && (
        <BroadcastComposer
          wards={wards}
          token={token}
          onClose={() => setShowBroadcastComposer(false)}
          onSent={handleBroadcastSent}
        />
      )}
      {/* ← NEW */}
      {showIndentPanel && (
        <IndentPanel
          indents={indents}
          onReview={handleIndentReview}
          onClose={() => setShowIndentPanel(false)}
        />
      )}

      {showBroadcastHistory && (
        <BroadcastHistoryPanel
          broadcasts={broadcasts}
          token={token}
          onDeactivate={handleBroadcastDeactivated}
          onClose={() => setShowBroadcastHistory(false)}
        />
      )}


      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6'>

        {/* Consolidated Summary Panel */}
        {wards.length > 0 && (() => {
          const highestRiskWard = wards.filter(w => (w.riskLevel || '').toLowerCase() === 'red').sort((a, b) => (b.activeCases || 0) - (a.activeCases || 0))[0] || wards.slice().sort((a, b) => (b.activeCases || 0) - (a.activeCases || 0))[0]
          const diseaseMap = {}
          wards.forEach(w => { if (w.topDisease && w.topDisease !== 'None') diseaseMap[w.topDisease] = (diseaseMap[w.topDisease] || 0) + (w.todayCases || 0) })
          const topDisease = Object.entries(diseaseMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
          const stats = [
            { icon: '🦺', label: 'Total Active Cases', value: totalCases.toLocaleString(), sub: 'Live', valueColor: totalCases > 200 ? '#DC2626' : totalCases > 100 ? '#D97706' : '#16A34A' },
            { icon: '🚨', label: 'Highest Risk Ward', value: highestRiskWard?.wardName || '—', sub: highestRiskWard ? `${highestRiskWard.activeCases || 0} active cases` : 'Stable', valueColor: highestRiskWard?.riskLevel?.toLowerCase() === 'red' ? '#DC2626' : highestRiskWard?.riskLevel?.toLowerCase() === 'yellow' ? '#D97706' : '#16A34A' },
            { icon: '🔬', label: 'Most Reported Disease', value: topDisease, sub: diseaseMap[topDisease] ? `${diseaseMap[topDisease]} cases today` : 'No surge', valueColor: '#7C3AED' },
            { icon: '⚠️', label: 'Wards on Alert', value: wardsOnAlert.toLocaleString(), sub: 'Live Status', valueColor: wardsOnAlert > 5 ? '#DC2626' : '#D97706' },
            { icon: '🏥', label: 'Hospitals Reporting', value: hospitalsReporting.toLocaleString(), sub: 'Active Facilities', valueColor: '#2563EB' },
          ]
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px', width: '100%' }}>
              {stats.map(({ icon, label, value, sub, valueColor }) => (
                <div key={label} style={{ background: '#fff', border: '1px solid #EAEDF1', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)', minWidth: 0 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icon}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '9px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
                      {sub === 'Live' && <span style={{ fontSize: '7px', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '0.5px 4px', borderRadius: '3px', textTransform: 'uppercase', border: '1px solid #DBEAFE' }}>Live</span>}
                    </div>
                    {sub !== 'Live' && <p style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>{sub}</p>}
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

            {/* ← NEW */}
            <button
              onClick={() => setShowIndentPanel(true)}
              style={{
                background: indents.filter(i => i.status === 'pending' && i.urgency === 'critical').length > 0
                  ? '#DC2626'
                  : indents.filter(i => i.status === 'pending').length > 0
                  ? '#D97706'
                  : '#64748B',
                color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px 0 rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              📦 Indent Requests
              {indents.filter(i => i.status === 'pending').length > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '20px', padding: '1px 7px', fontSize: '12px', fontWeight: 700 }}>
                  {indents.filter(i => i.status === 'pending').length}
                </span>
              )}
            </button>

            {/* Alert Center button */}
            <button onClick={() => setShowAlertCenter(true)} style={{ background: criticalCount > 0 ? '#DC2626' : activeAlerts.length > 0 ? '#EA580C' : '#64748B', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: criticalCount > 0 ? '0 4px 14px 0 rgba(220,38,38,0.4)' : '0 4px 14px 0 rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🚨 Alert Center
              {activeAlerts.length > 0 && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '20px', padding: '1px 7px', fontSize: '12px', fontWeight: 700 }}>{activeAlerts.length}</span>}
            </button>

            {/* Broadcast to Citizens button */}
            <button
              onClick={() => setShowBroadcastComposer(true)}
              style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 14px 0 rgba(5,150,105,0.35)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              📣 Broadcast to Citizens
              {activeBroadcastCount > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '20px', padding: '1px 7px', fontSize: '12px', fontWeight: 700 }}>
                  {activeBroadcastCount} live
                </span>
              )}
            </button>

            {/* Broadcast History button — only shows if broadcasts exist */}
            {broadcasts.length > 0 && (
              <button
                onClick={() => setShowBroadcastHistory(true)}
                style={{ background: 'rgba(255,255,255,0.8)', color: '#059669', border: '1.5px solid #059669', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📋 History ({broadcasts.length})
              </button>
            )}

            {/* CSV Export buttons */}
            {activeTab === 'wards' ? (
              <>
                <button onClick={() => exportCSV(wards)} disabled={wards.length === 0} style={{ backgroundColor: wards.length === 0 ? '#BFDBFE' : '#2563EB', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: wards.length === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 14px 0 rgba(37,99,235,0.3)' }}>
                  📤 Export All Wards
                </button>
                <button onClick={() => exportAlertZonesCSV(wards, allAlerts)} disabled={alertZoneCount === 0} style={{ backgroundColor: alertZoneCount === 0 ? '#FCA5A5' : '#EF4444', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: alertZoneCount === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 14px 0 rgba(239,68,68,0.3)' }}>
                  🚨 Export Alert Zones ({alertZoneCount})
                </button>
              </>
            ) : (
              <button onClick={() => exportHospitalsCSV(hospitals)} disabled={hospitals.length === 0} style={{ backgroundColor: hospitals.length === 0 ? '#C4B5FD' : '#7C3AED', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: hospitals.length === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 14px 0 rgba(124,58,237,0.3)' }}>
                📤 Export Hospitals CSV
              </button>
            )}
          </div>
        </div>

        {error && <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px 16px', color: '#991B1B', fontSize: '14px' }}>{error}</div>}



        {/* Active Broadcasts ribbon — shows when there are live broadcasts */}
        {activeBroadcastCount > 0 && (
          <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ background: '#059669', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                📣 {activeBroadcastCount} LIVE BROADCAST{activeBroadcastCount > 1 ? 'S' : ''}
              </span>
              <span style={{ fontSize: '13px', color: '#065F46' }}>Citizens can currently see {activeBroadcastCount} message{activeBroadcastCount > 1 ? 's' : ''} on their dashboard</span>
              {broadcasts.filter(b => b.isActive).slice(0, 2).map(b => (
                <span key={b._id} style={{ ...pillBase, background: '#D1FAE5', color: '#065F46', fontSize: '11px' }}>
                  {BROADCAST_TYPE_STYLES[b.type]?.icon} {b.title.length > 30 ? b.title.slice(0, 30) + 'ΓÇª' : b.title}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowBroadcastHistory(true)}
              style={{ background: 'none', border: '1px solid #6EE7B7', borderRadius: '7px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, color: '#059669', cursor: 'pointer' }}
            >
              Manage →
            </button>
          </div>
        )}


        {/* ── Tab Toggle: View by Wards | View by Hospitals ── */}
        <div className="glass-panel border border-white/60 shadow-soft rounded-2xl overflow-hidden">
          <div style={{ padding: '0 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
            <div style={{ display: 'flex', gap: '0' }}>
              <button
                onClick={() => { setActiveTab('wards'); setSearch('') }}
                style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', border: 'none', borderBottom: activeTab === 'wards' ? '2.5px solid #2563EB' : '2.5px solid transparent', background: 'none', color: activeTab === 'wards' ? '#2563EB' : '#64748B', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              >
                🗺️ View by Wards
                <span style={{ background: activeTab === 'wards' ? '#EFF6FF' : '#F1F5F9', color: activeTab === 'wards' ? '#2563EB' : '#94A3B8', fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px' }}>
                  {wards.length}
                </span>
              </button>
              <button
                onClick={() => { setActiveTab('hospitals'); setHospitalSearch('') }}
                style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', border: 'none', borderBottom: activeTab === 'hospitals' ? '2.5px solid #7C3AED' : '2.5px solid transparent', background: 'none', color: activeTab === 'hospitals' ? '#7C3AED' : '#64748B', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              >
                🏥 View by Hospitals
                <span style={{ background: activeTab === 'hospitals' ? '#F3E8FF' : '#F1F5F9', color: activeTab === 'hospitals' ? '#7C3AED' : '#94A3B8', fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px' }}>
                  {hospitals.length > 0 ? hospitals.length : '—'}
                </span>
              </button>
            </div>
            {activeTab === 'wards' ? (
              <input type='text' placeholder='Search ward...' value={search}
                style={{ padding: '8px 14px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '10px', outline: 'none', width: '220px', color: '#1E293B', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}
                onChange={(e) => setSearch(e.target.value)} />
            ) : (
              <input type='text' placeholder='Search hospital...' value={hospitalSearch}
                style={{ padding: '8px 14px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '10px', outline: 'none', width: '220px', color: '#1E293B', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}
                onChange={(e) => setHospitalSearch(e.target.value)} />
            )}
          </div>

          {activeTab === 'wards' ? (
            filteredWards.length === 0 ? (
              <p style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>No ward data available.</p>
            ) : (
              <WardTable wards={filteredWards} onReport={(ward) => setSelectedWard(ward)} />
            )
          ) : (
            hospitals.length === 0 && wards.length === 0 ? (
              <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}><InlineLoader /></div>
            ) : (
              <div>
                {hospitals.length > 0 && (
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.2)' }}>
                    <HospitalPerformanceCards hospitals={hospitals} />
                  </div>
                )}
                {filteredHospitals.length === 0 ? (
                  <p style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                    {hospitals.length === 0 ? 'No hospital data available.' : 'No hospitals match your search.'}
                  </p>
                ) : (
                  <HospitalTable hospitals={filteredHospitals} onDetail={(hosp) => setSelectedHospital(hosp)} />
                )}
              </div>
            )
          )}
        </div>

        {/* Charts */}
        {activeTab === 'wards' && (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Card>
              <div className='p-4 border-b border-gray-100'><h2 className='text-base font-semibold text-gray-800'>Top 5 Diseases This Week</h2></div>
              <div className='p-4'>
                {charts.topDiseases.length === 0 ? <p className='text-gray-400 text-sm text-center py-10'>No data available.</p> : (
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
            <Card>
              <div className='p-4 border-b border-gray-100'><h2 className='text-base font-semibold text-gray-800'>Daily Cases by Disease — Last 14 Days</h2></div>
              <div className='p-4'>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {DISEASES.map(disease => {
                    const isOn = activeDiseases.has(disease)
                    return (
                      <button key={disease} onClick={() => toggleDisease(disease)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${DISEASE_COLORS[disease]}`, background: isOn ? DISEASE_COLORS[disease] : '#fff', color: isOn ? '#fff' : DISEASE_COLORS[disease], transition: 'all 0.15s' }}>
                        {disease}
                      </button>
                    )
                  })}
                </div>
                {charts.dailyCases.length === 0 ? <p className='text-gray-400 text-sm text-center py-10'>No data available.</p> : (
                  <ResponsiveContainer width='100%' height={240}>
                    <LineChart data={charts.dailyCases.slice(-14)}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#F1F5F9' />
                      <XAxis dataKey='date' tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }} formatter={(value, name) => [value + ' cases', name]} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      {DISEASES.filter(d => activeDiseases.has(d)).map(disease => (
                        <Line key={disease} type='monotone' dataKey={disease} name={disease} stroke={DISEASE_COLORS[disease]} strokeWidth={2} dot={{ r: 2, fill: DISEASE_COLORS[disease] }} activeDot={{ r: 4 }} connectNulls={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        )}

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
