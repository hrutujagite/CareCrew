import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import Alert from '../../components/shared/Alert'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

const CAMP_TYPES = ['Free Checkup', 'Vaccination', 'Blood Donation', 'Eye Checkup', 'Dental Checkup', 'Awareness Drive', 'Other']

const HOURS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const MINUTES = ['00','15','30','45']

const selectStyle = "px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none cursor-pointer"

// Convert hour/min/ampm to readable string
const formatTimeParts = (h, m, ampm) => `${h}:${m} ${ampm}`

// Convert to total minutes for comparison
const to24hMinutes = (h, m, ampm) => {
  let hour = parseInt(h)
  if (ampm === 'AM' && hour === 12) hour = 0
  if (ampm === 'PM' && hour !== 12) hour += 12
  return hour * 60 + parseInt(m)
}

const HealthCampForm = () => {
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    campType: 'Free Checkup',
    startDate: '',
    endDate: '',
    location: '',
    contactInfo: ''
  })

  // Timing as simple dropdowns
  const [startHour, setStartHour] = useState('9')
  const [startMin, setStartMin] = useState('00')
  const [startAmPm, setStartAmPm] = useState('AM')
  const [endHour, setEndHour] = useState('4')
  const [endMin, setEndMin] = useState('00')
  const [endAmPm, setEndAmPm] = useState('PM')

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/hospital/dashboard', { state: { activeSection: 'healthcamps' } })
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [success, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const startMinutes = to24hMinutes(startHour, startMin, startAmPm)
  const endMinutes = to24hMinutes(endHour, endMin, endAmPm)
  const timingValid = endMinutes > startMinutes

  const getValidationError = () => {
    if (!form.title.trim()) return 'Camp title is required.'
    if (!form.startDate) return 'Start date is required.'
    if (!form.endDate) return 'End date is required.'
    if (new Date(form.endDate) < new Date(form.startDate)) return 'End date must be on or after the start date.'
    if (new Date(form.startDate) < new Date(new Date().toDateString())) return 'Start date cannot be in the past.'
    if (!timingValid) return 'End time must be after start time.'
    if (!form.location.trim()) return 'Location is required.'
    if (!form.contactInfo.trim()) return 'Contact information is required.'
    return null
  }

  const validationError = getValidationError()

  const handleSubmit = async () => {
    if (validationError) return
    setLoading(true)
    setError('')
    setSuccess(false)

    const timing = `${formatTimeParts(startHour, startMin, startAmPm)} - ${formatTimeParts(endHour, endMin, endAmPm)}`

    try {
      await axios.post(
        'https://carecrew-1.onrender.com/api/healthcamps/create',
        {
          title: form.title,
          description: form.description,
          campType: form.campType,
          startDate: form.startDate,
          endDate: form.endDate,
          timing,
          location: form.location,
          contactInfo: form.contactInfo
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(true)
    } catch (err) {
      setError('Failed to create health camp. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  // Reusable time picker row
  const TimePicker = ({ label, hour, min, ampm, setHour, setMin, setAmPm }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-400">*</span>
      </label>
      <div className="flex items-center gap-2">
        <select value={hour} onChange={e => setHour(e.target.value)} className={selectStyle}>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-gray-400 font-bold text-lg">:</span>
        <select value={min} onChange={e => setMin(e.target.value)} className={selectStyle}>
          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={ampm} onChange={e => setAmPm(e.target.value)}
          className={`${selectStyle} font-semibold ${ampm === 'AM' ? 'text-blue-600' : 'text-orange-600'}`}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/hospital/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Create Health Camp</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set up a health camp for citizens in your area. Once created, it will be visible to the public.
          </p>
        </div>

        {success && (
          <div className="mb-6">
            <Alert type="success" message="Health camp created successfully! Redirecting to camps page..." />
          </div>
        )}

        {error && <div className="mb-6"><Alert type="error" message={error} /></div>}

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Section 1: Basic info */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Camp Information</h3>
            <div className="flex flex-col gap-4">
              <Input label="Camp Title" name="title" value={form.title} onChange={handleChange}
                placeholder="e.g. Free Eye Checkup Camp for Senior Citizens" required />
              <Input label="Camp Type" type="select" name="campType" value={form.campType}
                onChange={handleChange} options={CAMP_TYPES} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea name="description" value={form.description} onChange={handleChange}
                  placeholder="Brief description about what the camp offers, who should attend, etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Schedule */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Schedule</h3>
            <div className="flex flex-col gap-5">

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-400">*</span></label>
                  <input type="date" name="startDate" value={form.startDate} min={todayStr}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-400">*</span></label>
                  <input type="date" name="endDate" value={form.endDate} min={form.startDate || todayStr}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                  {form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate) && (
                    <p className="text-red-500 text-xs mt-1">⚠ End date must be on or after start date</p>
                  )}
                </div>
              </div>

              {/* Time pickers — easy dropdowns */}
              <div className="grid grid-cols-2 gap-6">
                <TimePicker label="Start Time" hour={startHour} min={startMin} ampm={startAmPm}
                  setHour={setStartHour} setMin={setStartMin} setAmPm={setStartAmPm} />
                <TimePicker label="End Time" hour={endHour} min={endMin} ampm={endAmPm}
                  setHour={setEndHour} setMin={setEndMin} setAmPm={setEndAmPm} />
              </div>

              {/* Time preview / error */}
              {timingValid ? (
                <div className="bg-blue-50 rounded-lg px-4 py-2.5 text-sm text-blue-700 flex items-center gap-2">
                  <span>⏰</span>
                  <span>Camp timing: <strong>{formatTimeParts(startHour, startMin, startAmPm)} — {formatTimeParts(endHour, endMin, endAmPm)}</strong></span>
                </div>
              ) : (
                <div className="bg-red-50 rounded-lg px-4 py-2.5 text-sm text-red-600">
                  ⚠ End time must be after start time
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Location & Contact */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Location & Contact</h3>
            <div className="flex flex-col gap-4">
              <Input label="Location" name="location" value={form.location} onChange={handleChange}
                placeholder="e.g. Bhavani Peth Community Hall, Near Solapur Bus Stand" required />
              <Input label="Contact Information" name="contactInfo" value={form.contactInfo}
                onChange={handleChange} placeholder="e.g. Dr. Patil - 9876543210" required />
            </div>
          </div>

          {/* Validation + Submit */}
          <div className="p-6 bg-gray-50">
            {validationError && !success && (
              <p className="text-red-500 text-sm mb-4">⚠ {validationError}</p>
            )}

            {!validationError && form.title && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Preview</p>
                <p className="text-sm font-semibold text-gray-800">{form.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {form.campType} · {form.startDate && new Date(form.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {form.endDate && form.endDate !== form.startDate && (
                    <> to {new Date(form.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  ⏰ {formatTimeParts(startHour, startMin, startAmPm)} — {formatTimeParts(endHour, endMin, endAmPm)}
                </p>
                {form.location && <p className="text-xs text-gray-500 mt-0.5">📍 {form.location}</p>}
              </div>
            )}

            <Button
              label={loading ? 'Creating...' : 'Create Health Camp'}
              onClick={handleSubmit}
              variant="primary"
              disabled={loading || success || !!validationError}
              fullWidth
            />
          </div>
        </div>

      </div>
    </div>
  )
}

export default HealthCampForm
