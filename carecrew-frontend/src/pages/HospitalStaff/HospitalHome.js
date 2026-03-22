import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card, { StatCard } from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import Alert from '../../components/shared/Alert'
import AnalyticsChart from './AnalyticsChart'
import DiseaseAnalytics from './DiseaseAnalytics'
import InfrastructureDashboard from './InfrastructureDashboard'
import AppointmentsDashboard from './AppointmentsDashboard'
import HealthCampsDashboard from './HealthCampsDashboard'
import AlertsDashboard from './AlertsDashboard'
import DoctorManagement from './DoctorManagement'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

// ─── Sidebar nav items ──────────────────────────────────────────────────────
const Icons = {
  Overview: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>,
  Disease: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  Infra: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" /><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" /><path d="M9 7h6" /><path d="M9 11h6" /></svg>,
  Appt: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  Camp: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M12 3v18" /><path d="M3 21l9-18M21 21l-9-18" /><path d="M10 21l2-5 2 5" /></svg>,
  Alert: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  Doctor: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="9.5" y1="13.5" x2="14.5" y2="13.5" /></svg>
}

const NAV_ITEMS = [
  { key: 'overview', icon: Icons.Overview, label: 'Overview' },
  { key: 'disease', icon: Icons.Disease, label: 'Disease Analytics' },
  { key: 'infrastructure', icon: Icons.Infra, label: 'Infrastructure' },
  { key: 'appointments', icon: Icons.Appt, label: 'Appointments' },
  { key: 'healthcamps', icon: Icons.Camp, label: 'Health Camps' },
  { key: 'alerts', icon: Icons.Alert, label: 'Alerts' },
  { key: 'doctors', icon: Icons.Doctor, label: 'Doctor Management' },
]

const HospitalHome = () => {
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeSection, setActiveSection] = useState(location.state?.activeSection || 'overview')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [latestCapacity, setLatestCapacity] = useState(null)
  const [diseaseHistory, setDiseaseHistory] = useState([])
  const [appointments, setAppointments] = useState([])
  const [healthCamps, setHealthCamps] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeframe, setTimeframe] = useState('month')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const headers = { Authorization: `Bearer ${token}` }
      const [dashRes, diseaseRes, apptRes, campsRes] = await Promise.all([
        axios.get('https://carecrew-1.onrender.com/api/dashboard/hospital', { headers }),
        axios.get('https://carecrew-1.onrender.com/api/disease/history', { headers }),
        axios.get('https://carecrew-1.onrender.com/api/appointments/hospital', { headers }).catch(() => ({ data: { appointments: [] } })),
        axios.get('https://carecrew-1.onrender.com/api/healthcamps/all', { headers }).catch(() => ({ data: { camps: [] } })),
      ])
      if (dashRes.data?.latestCapacity) setLatestCapacity(dashRes.data.latestCapacity)
      if (diseaseRes.data?.reports) {
        setDiseaseHistory(
          [...diseaseRes.data.reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        )
      }
      if (apptRes.data?.appointments) setAppointments(apptRes.data.appointments)
      if (campsRes.data?.camps) setHealthCamps(campsRes.data.camps)

      // Build alerts from capacity + disease data
      const cap = dashRes.data?.latestCapacity
      const builtAlerts = []
      if (cap) {
        if (cap.availableBeds === 0) builtAlerts.push({ severity: 'Red', type: 'Shortage', message: 'No beds available — consider patient redirection' })
        else if (cap.totalBeds > 0 && (cap.availableBeds / cap.totalBeds) < 0.1) builtAlerts.push({ severity: 'Yellow', type: 'Shortage', message: `Only ${cap.availableBeds} beds remaining (${Math.round((cap.availableBeds / cap.totalBeds) * 100)}%)` })
        if (cap.icuAvailable === 0 && cap.icuTotal > 0) builtAlerts.push({ severity: 'Red', type: 'Shortage', message: `All ${cap.icuTotal} ICU beds occupied` })
        if (cap.oxygenTotal > 0 && (cap.oxygenAvailable / cap.oxygenTotal) < 0.2) builtAlerts.push({ severity: 'Red', type: 'Shortage', message: `Oxygen critically low — ${cap.oxygenAvailable}/${cap.oxygenTotal} cylinders` })
        if (cap.medicineStockPercentage < 20) builtAlerts.push({ severity: 'Red', type: 'Shortage', message: `Medicine stock at ${cap.medicineStockPercentage}%` })
      }
      const reports = diseaseRes.data?.reports || []
      const now = new Date()
      const thisWeek = reports.filter(r => (now - new Date(r.createdAt)) / 86400000 <= 7)
      const lastWeek = reports.filter(r => { const d = (now - new Date(r.createdAt)) / 86400000; return d > 7 && d <= 14 })
      const thisWeekTotal = thisWeek.reduce((s, r) => s + (r.newConfirmed || 0), 0)
      const lastWeekTotal = lastWeek.reduce((s, r) => s + (r.newConfirmed || 0), 0)
      if (lastWeekTotal > 0 && thisWeekTotal > lastWeekTotal * 1.5) {
        builtAlerts.push({ severity: 'Red', type: 'Outbreak', message: `Case spike: ${thisWeekTotal} this week vs ${lastWeekTotal} last week (+${Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)}%)` })
      }
      setAlerts(builtAlerts)
    } catch (err) {
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleConfirmAppointment = async (apptId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      await axios.put(`https://carecrew-1.onrender.com/api/appointments/${apptId}/confirm`, {}, { headers })
      setAppointments(prev => prev.map(a => a._id === apptId ? { ...a, status: 'Confirmed' } : a))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm appointment')
    }
  }

  const handleCancelAppointment = async (apptId) => {
    try {
      if (!window.confirm('Are you sure you want to cancel this appointment?')) return
      const headers = { Authorization: `Bearer ${token}` }
      await axios.put(`https://carecrew-1.onrender.com/api/appointments/${apptId}/cancel`, {}, { headers })
      setAppointments(prev => prev.map(a => a._id === apptId ? { ...a, status: 'Cancelled' } : a))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment')
    }
  }

  const getTodayCount = () => {
    const today = new Date().toDateString()
    return diseaseHistory.filter(r => new Date(r.createdAt).toDateString() === today).length
  }

  const getAnalyticsData = () => {
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90
    const now = new Date()
    const d = []
    for (let i = days; i >= 0; i--) {
      const past = new Date(now); past.setDate(past.getDate() - i)
      const dateStr = past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      const dayReports = diseaseHistory.filter(r => new Date(r.createdAt).toDateString() === past.toDateString())
      d.push({
        date: dateStr,
        active: dayReports.reduce((s, r) => s + (r.newConfirmed || 0), 0),
        recovered: dayReports.reduce((s, r) => s + (r.newRecovered || 0), 0),
        deaths: dayReports.reduce((s, r) => s + (r.newDeaths || 0), 0)
      })
    }
    return d
  }

  if (loading) return <Loader message="Loading dashboard..." />
  if (error) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6"><Card><p className="text-red-500 text-sm">{error}</p>
        <div className="mt-4"><Button label="Retry" onClick={fetchData} variant="secondary" /></div>
      </Card></div>
    </div>
  )

  const cap = latestCapacity
  const hasCapacity = !!cap
  const todayCount = getTodayCount()
  const analyticsData = getAnalyticsData()
  const upcomingCamps = healthCamps.filter(c => c.status === 'Upcoming' || c.status === 'Ongoing')
  const todayAppts = appointments.filter(a => new Date(a.preferredDate).toDateString() === new Date().toDateString() && a.status !== 'Cancelled')

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
     <div className="min-h-screen bg-slate-50 relative z-0">
      {/* Decorative Premium Background */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary-200/30 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-brand/20 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply"></div>
      <Navbar />

      <div className="flex w-full" style={{ minHeight: 'calc(100vh - 56px)' }}>

        {/* ╔═══════════════════════════════════╗ */}
        {/* ║          LEFT SIDEBAR             ║ */}
        {/* ╚═══════════════════════════════════╝ */}
        <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} glass-panel border-r border-white/50 flex-shrink-0 sticky top-14 flex flex-col transition-all duration-300 z-20`} style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
          {/* Small fixed header for sidebar */}
          <div className="px-3 py-5 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
            {isSidebarOpen && (
              <h2 className="text-sm font-bold text-gray-800 leading-tight flex items-center gap-2 pl-2 whitespace-nowrap overflow-hidden">
                {user?.hospitalName}
              </h2>
            )}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors mx-auto flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isSidebarOpen ? (
                  <polyline points="15 18 9 12 15 6"></polyline>
                ) : (
                  <polyline points="9 18 15 12 9 6"></polyline>
                )}
              </svg>
            </button>
          </div>

          {/* Nav items */}
          <nav className="py-3 px-3 flex flex-col gap-1 overflow-x-hidden">
            {NAV_ITEMS.map(item => (
              <button key={item.key} onClick={() => setActiveSection(item.key)} title={!isSidebarOpen ? item.label : ''}
                className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'} py-3 rounded-xl text-sm font-semibold transition-all duration-300 text-left ${activeSection === item.key
                  ? 'bg-gradient-to-r from-primary-500 to-brand text-white shadow-md translate-x-1'
                  : 'text-slate-500 hover:bg-white/60 hover:text-primary-600 hover:shadow-sm'
                  }`}>
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {isSidebarOpen && <span className="flex-1 whitespace-nowrap">{item.label}</span>}
                {isSidebarOpen && item.key === 'alerts' && alerts.length > 0 && (
                  <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{alerts.length}</span>
                )}
                {isSidebarOpen && item.key === 'appointments' && todayAppts.length > 0 && (
                  <span className="text-xs bg-blue-500 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{todayAppts.length}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Quick actions */}
          <div className={`px-4 py-4 border-t border-gray-100 mt-auto transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Data Management</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate('/hospital/history')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 pb-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                View Full History
              </button>
            </div>
          </div>

        </aside>

        {/* ╔═══════════════════════════════════╗ */}
        {/* ║         MAIN CONTENT AREA         ║ */}
        {/* ╚═══════════════════════════════════╝ */}
        <main className="flex-1 p-6">

          {/* Section header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-4 gap-4">
            <div>
              {/* Homepage specific hospital title block */}
              {activeSection === 'overview' && (
                <div className="mb-6 relative">
                  <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{user?.hospitalName}</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 block animate-pulse"></span>
                    Ward: <span className="text-slate-700 font-bold">{user?.ward}</span>
                  </p>
                </div>
              )}

              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {NAV_ITEMS.find(n => n.key === activeSection)?.icon}
                {NAV_ITEMS.find(n => n.key === activeSection)?.label}
              </h1>
            </div>

            {hasCapacity && activeSection === 'overview' && (
              <p className="text-xs text-gray-400 md:text-right">
                Last capacity update:<br />
                <span className="font-medium text-gray-600">
                  {new Date(cap.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
            )}
          </div>

          {/* ═══════════════════ OVERVIEW ═══════════════════ */}
          {activeSection === 'overview' && (
            <div className="flex flex-col gap-6">

              {/* Critical alerts banner */}
              {alerts.filter(a => a.severity === 'Red').length > 0 && (
                <div className="flex flex-col gap-2">
                  {alerts.filter(a => a.severity === 'Red').map((a, i) => (
                    <Alert key={i} type="error" message={a.message} />
                  ))}
                </div>
              )}

              {/* Quick Action Tabs for Home Page */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => navigate('/hospital/disease-form')} className="flex items-center justify-center gap-2 p-5 bg-gradient-to-r from-primary-600 to-brand text-white rounded-2xl shadow-soft hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all group">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M12 5v14M5 12h14" /></svg>
                  <span className="font-bold tracking-wide">Submit Disease Report</span>
                </button>
                <button onClick={() => navigate('/hospital/capacity-form')} className="flex items-center justify-center gap-2 p-5 glass-card border border-primary-200 text-primary-700 rounded-2xl shadow-soft hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all group">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M12 5v14M5 12h14" /></svg>
                  <span className="font-bold tracking-wide">Update Capacity Data</span>
                </button>
              </div>

              {!hasCapacity && (
                <Alert type="info" message="No capacity data found. Submit your first capacity report for full dashboard insights." />
              )}

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard title="Today's Reports" value={todayCount} subtitle="Disease reports today" color="blue" />
                <StatCard title="Appointments" value={todayAppts.length} subtitle={`${appointments.length} total`} color="green" />
                <StatCard title="Camps" value={upcomingCamps.length} subtitle="Active / scheduled" color="orange" />
              </div>

              {/* Two-column section: Infrastructure + Recent Reports */}
              <div className="grid grid-cols-2 gap-6">
                {/* Infrastructure */}
                {hasCapacity && (
                  <Card title="Infrastructure">
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase mb-1">{t('beds')}</p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold text-gray-800">{cap.availableBeds}</span>
                          <span className="text-sm text-gray-400 font-medium">/ {cap.totalBeds}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                          <div className={`h-1.5 rounded-full ${cap.availableBeds === 0 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${cap.totalBeds > 0 ? Math.round((cap.availableBeds / cap.totalBeds) * 100) : 0}%` }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase mb-1">{t('icu')}</p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold text-gray-800">{cap.icuAvailable}</span>
                          <span className="text-sm text-gray-400 font-medium">/ {cap.icuTotal}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                          <div className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${cap.icuTotal > 0 ? Math.round((cap.icuAvailable / cap.icuTotal) * 100) : 0}%` }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Oxygen</p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold text-gray-800">{cap.oxygenAvailable || 0}</span>
                          <span className="text-sm text-gray-400 font-medium">/ {cap.oxygenTotal || 0}</span>
                        </div>
                        <p className={`text-xs mt-1 font-medium ${cap.oxygenStatus === 'Critical' ? 'text-red-500' : cap.oxygenStatus === 'Low' ? 'text-yellow-600' : 'text-green-600'}`}>{cap.oxygenStatus}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Medicine</p>
                        <p className={`text-2xl font-bold ${cap.medicineStockPercentage < 20 ? 'text-red-600' : 'text-gray-800'}`}>{cap.medicineStockPercentage}%</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className={`h-1.5 rounded-full ${cap.medicineStockPercentage < 20 ? 'bg-red-500' : cap.medicineStockPercentage < 50 ? 'bg-yellow-400' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, cap.medicineStockPercentage)}%` }} />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Recent Reports */}
                <Card title="Recent Reports">
                  {diseaseHistory.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No reports yet</p>
                  ) : (
                    <div className="flex flex-col">
                      {diseaseHistory.slice(0, 5).map((r, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100/50 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{r.diseaseName}</p>
                            <p className="text-xs text-slate-500 font-medium">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 text-xs text-right mt-1">
                            <span className="text-slate-800 font-bold">{r.newConfirmed} new {r.newConfirmed === 1 ? 'case' : 'cases'}</span>
                            {r.newRecovered > 0 && <span className="text-emerald-600 font-semibold">+{r.newRecovered} recovered</span>}
                            {r.newDeaths > 0 && <span className="text-rose-500 font-semibold">+{r.newDeaths} {r.newDeaths === 1 ? 'death' : 'deaths'}</span>}
                          </div>
                        </div>
                      ))}
                      <button onClick={() => navigate('/hospital/history')} className="text-xs text-blue-600 hover:underline mt-2 text-center">View all →</button>
                    </div>
                  )}
                </Card>
              </div>

              {/* Chart — full width */}
              {analyticsData.length > 0 && (
                <div className="relative glass-panel border border-white/60 shadow-soft rounded-2xl p-6 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Daily Outbreak Trends</h3>
                    <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white text-gray-700 outline-none cursor-pointer hover:bg-gray-50"
                      value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                      <option value="week">7 Days</option>
                      <option value="month">30 Days</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>
                  <div className="-mx-6 -my-6">
                    <AnalyticsChart data={analyticsData} hideTitle={true} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════ DISEASE ANALYTICS ═══════════════════ */}
          {activeSection === 'disease' && (
            <DiseaseAnalytics diseaseHistory={diseaseHistory} latestCapacity={latestCapacity} />
          )}

          {/* ═══════════════════ INFRASTRUCTURE ═══════════════════ */}
          {activeSection === 'infrastructure' && (
            <InfrastructureDashboard hasCapacity={hasCapacity} cap={cap} diseaseHistory={diseaseHistory} navigate={navigate} />
          )}

          {/* ═══════════════════ APPOINTMENTS ═══════════════════ */}
          {activeSection === 'appointments' && (
            <AppointmentsDashboard
              appointments={appointments}
              todayAppts={todayAppts}
              onConfirm={handleConfirmAppointment}
              onCancel={handleCancelAppointment}
            />
          )}

          {/* ═══════════════════ HEALTH CAMPS ═══════════════════ */}
          {activeSection === 'healthcamps' && (
            <HealthCampsDashboard healthCamps={healthCamps} navigate={navigate} />
          )}

          {/* ═══════════════════ ALERTS ═══════════════════ */}
          {activeSection === 'alerts' && (
            <AlertsDashboard alerts={alerts} />
          )}

          {/* ═══════════════════ DOCTOR MANAGEMENT ═══════════════════ */}
          {activeSection === 'doctors' && (
            <DoctorManagement />
          )}

        </main>
      </div>
    </div>
  )
}

export default HospitalHome