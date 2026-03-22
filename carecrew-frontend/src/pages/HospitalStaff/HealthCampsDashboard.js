import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

const API = 'https://carecrew-1.onrender.com/api/healthcamps'

const getCampStatus = (camp) => {
  if (!camp.isActive) return 'cancelled'
  const now = new Date()
  const start = new Date(camp.startDate)
  const end = new Date(camp.endDate)
  if (now < start) return 'upcoming'
  if (now >= start && now <= end) return 'ongoing'
  return 'completed'
}

const STATUS_CONFIG = {
  upcoming:  { label: 'Upcoming',  bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' },
  ongoing:   { label: 'Ongoing',   bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: '#22C55E' },
  completed: { label: 'Completed', bg: '#F8FAFC', color: '#475569', border: '#E2E8F0', dot: '#94A3B8' },
  cancelled: { label: 'Cancelled', bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3', dot: '#F43F5E' },
}

const CAMP_TYPE_ICONS = {
  'Free Checkup':    '🩺',
  'Vaccination':     '💉',
  'Blood Donation':  '🩸',
  'Eye Checkup':     '👁️',
  'Dental Checkup':  '🦷',
  'Awareness Drive': '📢',
  'Other':           '🏥',
}

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block',
        ...(status === 'ongoing' ? { animation: 'pulse 1.5s infinite' } : {})
      }} />
      {cfg.label}
    </span>
  )
}

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDateRange = (start, end) => {
  const s = formatDate(start), e = formatDate(end)
  return s === e ? s : `${s} – ${e}`
}

const CAMP_TYPES = ['Free Checkup', 'Vaccination', 'Blood Donation', 'Eye Checkup', 'Dental Checkup', 'Awareness Drive', 'Other']
const HOURS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const MINUTES = ['00','15','30','45']

const selectStyle = {
  padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px',
  fontSize: '13px', background: '#fff', outline: 'none', cursor: 'pointer',
}

const parseTimingParts = (timing) => {
  try {
    const [startStr, endStr] = timing.split(' - ')
    const parse = (str) => {
      const [timePart, ampm] = str.trim().split(' ')
      const [h, m] = timePart.split(':')
      return { h, m, ampm }
    }
    return { start: parse(startStr), end: parse(endStr) }
  } catch {
    return { start: { h: '9', m: '00', ampm: 'AM' }, end: { h: '4', m: '00', ampm: 'PM' } }
  }
}

const EditModal = ({ camp, token, onClose, onSaved }) => {
  const parsed = parseTimingParts(camp.timing || '')
  const [form, setForm] = useState({
    title: camp.title || '',
    description: camp.description || '',
    campType: camp.campType || 'Free Checkup',
    startDate: camp.startDate ? camp.startDate.split('T')[0] : '',
    endDate: camp.endDate ? camp.endDate.split('T')[0] : '',
    location: camp.location || '',
    contactInfo: camp.contactInfo || '',
  })
  const [startHour, setStartHour] = useState(parsed.start.h)
  const [startMin, setStartMin]   = useState(parsed.start.m)
  const [startAmPm, setStartAmPm] = useState(parsed.start.ampm)
  const [endHour, setEndHour]     = useState(parsed.end.h)
  const [endMin, setEndMin]       = useState(parsed.end.m)
  const [endAmPm, setEndAmPm]     = useState(parsed.end.ampm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      const timing = `${startHour}:${startMin} ${startAmPm} - ${endHour}:${endMin} ${endAmPm}`
      await axios.put(`${API}/${camp._id}`, { ...form, timing }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      onSaved()
    } catch {
      setError('Failed to update. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: '8px',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#1E293B',
  }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>Edit Health Camp</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', color: '#991B1B', fontSize: '13px' }}>{error}</div>}
          <div>
            <label style={labelStyle}>Camp Title *</label>
            <input name="title" value={form.title} onChange={handleChange} style={inputStyle} placeholder="Camp title" />
          </div>
          <div>
            <label style={labelStyle}>Camp Type</label>
            <select name="campType" value={form.campType} onChange={handleChange} style={{ ...inputStyle, cursor: 'pointer' }}>
              {CAMP_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'none' }} placeholder="Optional description" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Start Date *</label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End Date *</label>
              <input type="date" name="endDate" value={form.endDate} onChange={handleChange} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Start Time</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select value={startHour} onChange={e => setStartHour(e.target.value)} style={selectStyle}>{HOURS.map(h => <option key={h}>{h}</option>)}</select>
                <select value={startMin} onChange={e => setStartMin(e.target.value)} style={selectStyle}>{MINUTES.map(m => <option key={m}>{m}</option>)}</select>
                <select value={startAmPm} onChange={e => setStartAmPm(e.target.value)} style={selectStyle}><option>AM</option><option>PM</option></select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>End Time</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select value={endHour} onChange={e => setEndHour(e.target.value)} style={selectStyle}>{HOURS.map(h => <option key={h}>{h}</option>)}</select>
                <select value={endMin} onChange={e => setEndMin(e.target.value)} style={selectStyle}>{MINUTES.map(m => <option key={m}>{m}</option>)}</select>
                <select value={endAmPm} onChange={e => setEndAmPm(e.target.value)} style={selectStyle}><option>AM</option><option>PM</option></select>
              </div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Location *</label>
            <input name="location" value={form.location} onChange={handleChange} style={inputStyle} placeholder="Camp location" />
          </div>
          <div>
            <label style={labelStyle}>Contact Info *</label>
            <input name="contactInfo" value={form.contactInfo} onChange={handleChange} style={inputStyle} placeholder="e.g. Dr. Patil - 9876543210" />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: loading ? '#93C5FD' : '#2563EB', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

const CampCard = ({ camp, onEdit, onCancel }) => {
  const status = getCampStatus(camp)
  const icon = CAMP_TYPE_ICONS[camp.campType] || '🏥'
  const canEdit = status === 'upcoming'
  const canCancel = status === 'upcoming' || status === 'ongoing'

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', transition: 'box-shadow 0.2s, transform 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '22px', lineHeight: 1.2 }}>{icon}</span>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', marginBottom: '3px', lineHeight: 1.3 }}>{camp.title}</h3>
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>{camp.campType}</span>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#64748B' }}><span>📅</span><span>{formatDateRange(camp.startDate, camp.endDate)}</span></div>
        {camp.timing && <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#64748B' }}><span>⏰</span><span>{camp.timing}</span></div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#64748B' }}><span>📍</span><span style={{ lineHeight: 1.4 }}>{camp.location}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#64748B' }}><span>📞</span><span>{camp.contactInfo}</span></div>
      </div>
      {camp.description && (
        <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.5, margin: 0, borderTop: '1px solid #F8FAFC', paddingTop: '10px' }}>{camp.description}</p>
      )}
      {(canEdit || canCancel) && (
        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
          {canEdit && (
            <button onClick={() => onEdit(camp)} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              ✏️ Edit
            </button>
          )}
          {canCancel && (
            <button onClick={() => onCancel(camp)} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid #FECDD3', background: '#FFF1F2', color: '#BE123C', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              🚫 Cancel
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const HealthCampsDashboard = () => {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingCamp, setEditingCamp] = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const fetchCamps = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API}/all`, { headers: { Authorization: `Bearer ${token}` } })
      setCamps(res.data.camps || [])
    } catch {
      setError('Failed to load health camps. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchCamps() }, [fetchCamps])

  const handleCancel = async () => {
    if (!cancelConfirm) return
    setCancelLoading(true)
    try {
      await axios.delete(`${API}/${cancelConfirm._id}`, { headers: { Authorization: `Bearer ${token}` } })
      setCancelConfirm(null)
      fetchCamps()
    } catch {
      setError('Failed to cancel camp. Please try again.')
    } finally {
      setCancelLoading(false)
    }
  }

  const stats = camps.reduce((acc, camp) => {
    const s = getCampStatus(camp)
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const filteredCamps = filter === 'all' ? camps : camps.filter(c => getCampStatus(c) === filter)

  const FILTERS = [
    { key: 'all',       label: 'All Camps',  count: camps.length },
    { key: 'upcoming',  label: 'Upcoming',   count: stats.upcoming  || 0 },
    { key: 'ongoing',   label: 'Ongoing',    count: stats.ongoing   || 0 },
    { key: 'completed', label: 'Completed',  count: stats.completed || 0 },
    { key: 'cancelled', label: 'Cancelled',  count: stats.cancelled || 0 },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Health Camps</h1>
            <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Manage and track health camps organised by your hospital</p>
          </div>
          {/* ✅ FIXED: /hospital/create-camp */}
          <button
            onClick={() => navigate('/hospital/create-camp')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(37,99,235,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.35)' }}
          >
            <span style={{ fontSize: '16px' }}>+</span> Create New Camp
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Camps', value: camps.length,         color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Upcoming',    value: stats.upcoming  || 0, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Ongoing',     value: stats.ongoing   || 0, color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
            { label: 'Completed',   value: stats.completed || 0, color: '#475569', bg: '#F8FAFC', border: '#E2E8F0' },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px 18px' }}>
              <p style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontSize: '26px', fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '12px 16px', color: '#991B1B', fontSize: '13px', marginBottom: '20px' }}>{error}</div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {FILTERS.map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)} style={{ padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid', background: filter === key ? '#0F172A' : '#fff', color: filter === key ? '#fff' : '#64748B', borderColor: filter === key ? '#0F172A' : '#E2E8F0', transition: 'all 0.15s' }}>
              {label} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filteredCamps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '36px', marginBottom: '12px' }}>🏕️</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              {filter === 'all' ? 'No health camps yet' : `No ${filter} camps`}
            </p>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
              {filter === 'all' ? 'Create your first health camp to get started.' : `You have no ${filter} health camps.`}
            </p>
            {filter === 'all' && (
              /* ✅ FIXED: /hospital/create-camp */
              <button onClick={() => navigate('/hospital/create-camp')} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                + Create Health Camp
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {filteredCamps.map(camp => (
              <CampCard key={camp._id} camp={camp} onEdit={setEditingCamp} onCancel={setCancelConfirm} />
            ))}
          </div>
        )}
      </div>

      {editingCamp && (
        <EditModal camp={editingCamp} token={token} onClose={() => setEditingCamp(null)} onSaved={() => { setEditingCamp(null); fetchCamps() }} />
      )}

      {cancelConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '380px', width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
            <p style={{ fontSize: '36px', textAlign: 'center', marginBottom: '10px' }}>🚫</p>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1E293B', textAlign: 'center', marginBottom: '8px' }}>Cancel Health Camp?</h3>
            <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', marginBottom: '20px', lineHeight: 1.5 }}>
              Are you sure you want to cancel <strong>{cancelConfirm.title}</strong>? This will remove it from the public listing.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setCancelConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Keep Camp</button>
              <button onClick={handleCancel} disabled={cancelLoading} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: cancelLoading ? '#FDA4AF' : '#F43F5E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: cancelLoading ? 'not-allowed' : 'pointer' }}>
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HealthCampsDashboard
