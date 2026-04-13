import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'

const BASE_URL = 'https://carecrew-1.onrender.com/api'

const SPECIALTIES = [
  'General', 'Cardiology', 'Paediatrics', 'Orthopaedics',
  'Gynaecology', 'Neurology', 'Dermatology', 'ENT',
  'Ophthalmology', 'Emergency'
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const MINUTES = ['00', '15', '30', '45']

const emptyScheduleSlot = { day: '', startTime: '', endTime: '', maxAppointments: 20 }

const emptyForm = {
  name: '',
  specialty: '',
  experience: '',
  isVisiting: false,
  schedule: []
}

// Format H:MM AM/PM from parts
const formatTime = (h, m, ampm) => `${h}:${m} ${ampm}`

// Parse "9:00 AM" into parts for display
const parseTime = (timeStr) => {
  if (!timeStr) return { h: '9', m: '00', ampm: 'AM' }
  const [timePart, ampm] = timeStr.split(' ')
  const [h, m] = timePart.split(':')
  return { h: h || '9', m: m || '00', ampm: ampm || 'AM' }
}

// A single schedule slot row in the form
const ScheduleSlotRow = ({ slot, index, onChange, onRemove }) => {
  const start = parseTime(slot.startTime)
  const end = parseTime(slot.endTime)

  const updateTime = (field, part, value) => {
    const current = field === 'startTime' ? start : end
    const updated = { ...current, [part]: value }
    onChange(index, field, formatTime(updated.h, updated.m, updated.ampm))
  }

  const selectCls = 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400'

  return (
    <div className='flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200'>
      {/* Day */}
      <select
        value={slot.day}
        onChange={e => onChange(index, 'day', e.target.value)}
        className={`${selectCls} min-w-[110px]`}
      >
        <option value=''>-- Day --</option>
        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      {/* Start time */}
      <div className='flex items-center gap-1'>
        <span className='text-xs text-gray-400'>From</span>
        <select value={start.h} onChange={e => updateTime('startTime', 'h', e.target.value)} className={selectCls}>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className='text-gray-400 text-xs'>:</span>
        <select value={start.m} onChange={e => updateTime('startTime', 'm', e.target.value)} className={selectCls}>
          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={start.ampm} onChange={e => updateTime('startTime', 'ampm', e.target.value)} className={`${selectCls} font-semibold text-blue-600`}>
          <option value='AM'>AM</option>
          <option value='PM'>PM</option>
        </select>
      </div>

      {/* End time */}
      <div className='flex items-center gap-1'>
        <span className='text-xs text-gray-400'>To</span>
        <select value={end.h} onChange={e => updateTime('endTime', 'h', e.target.value)} className={selectCls}>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className='text-gray-400 text-xs'>:</span>
        <select value={end.m} onChange={e => updateTime('endTime', 'm', e.target.value)} className={selectCls}>
          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={end.ampm} onChange={e => updateTime('endTime', 'ampm', e.target.value)} className={`${selectCls} font-semibold text-orange-500`}>
          <option value='AM'>AM</option>
          <option value='PM'>PM</option>
        </select>
      </div>

      {/* Max appointments */}
      <div className='flex items-center gap-1'>
        <span className='text-xs text-gray-400'>Max</span>
        <input
          type='number'
          min='1'
          max='100'
          value={slot.maxAppointments}
          onChange={e => onChange(index, 'maxAppointments', Number(e.target.value))}
          className='w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 text-center'
        />
        <span className='text-xs text-gray-400'>appts</span>
      </div>

      <button
        onClick={() => onRemove(index)}
        className='ml-auto text-red-400 hover:text-red-600 text-sm font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors'
        title='Remove this slot'
      >✕</button>
    </div>
  )
}

const DoctorManagement = () => {
  const { token, user } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [hospitalSpecialties, setHospitalSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(
        `${BASE_URL}/hospitals/${encodeURIComponent(user.hospitalName)}/doctors`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setDoctors(res.data.doctors || [])
      setHospitalSpecialties(res.data.specialties || SPECIALTIES)
    } catch (err) {
      setError('Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }, [token, user])

  useEffect(() => { fetchDoctors() }, [fetchDoctors])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const addScheduleSlot = () => {
    setForm(prev => ({
      ...prev,
      schedule: [...prev.schedule, { ...emptyScheduleSlot, startTime: '9:00 AM', endTime: '1:00 PM' }]
    }))
  }

  const updateScheduleSlot = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.schedule]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, schedule: updated }
    })
  }

  const removeScheduleSlot = (index) => {
    setForm(prev => ({ ...prev, schedule: prev.schedule.filter((_, i) => i !== index) }))
  }

  const openAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const openEdit = (doctor) => {
    setForm({
      name: doctor.name,
      specialty: doctor.specialty,
      experience: doctor.experience?.toString() || '',
      isVisiting: doctor.isVisiting || false,
      // Map existing schedule, or fall back gracefully
      schedule: (doctor.schedule && doctor.schedule.length > 0)
        ? doctor.schedule.map(s => ({
            day: s.day || '',
            startTime: s.startTime || '9:00 AM',
            endTime: s.endTime || '1:00 PM',
            maxAppointments: s.maxAppointments || 20
          }))
        : []
    })
    setEditingId(doctor._id)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  const validate = () => {
    if (!form.name.trim()) { setError('Doctor name is required'); return false }
    if (!form.specialty) { setError('Specialty is required'); return false }
    if (!form.experience || isNaN(form.experience) || Number(form.experience) < 0) {
      setError('Valid experience (years) is required'); return false
    }  // ✅ IMPORTANT FIX (THIS WAS MISSING)
  if (form.schedule.length === 0) {
    setError('Please add at least one schedule slot')
    return false
  }
    for (const slot of form.schedule) {
      if (!slot.day) { setError('Please select a day for each schedule slot'); return false }
      if (!slot.startTime || !slot.endTime) { setError('Please set start and end time for each slot'); return false }
    }
    return true
  }

  const handleSave = async () => {
    setError('')
    if (!validate()) return
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      specialty: form.specialty,
      experience: Number(form.experience),
      isVisiting: form.isVisiting,
      schedule: form.schedule
    }
      // 👉 ADD HERE
    console.log("Sending payload:", payload)
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/hospitals/doctors/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSuccess('Doctor updated successfully')
      } else {
        await axios.post(`${BASE_URL}/hospitals/doctors`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSuccess('Doctor added successfully')
      }
      await fetchDoctors()
      closeForm()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save doctor')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (doctorId) => {
    try {
      await axios.delete(`${BASE_URL}/hospitals/doctors/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setDeleteConfirm(null)
      setSuccess('Doctor removed successfully')
      await fetchDoctors()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete doctor')
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-16'>
        <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin' />
        <span className='ml-3 text-sm text-gray-500'>Loading doctors...</span>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>

      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-bold text-gray-800'>Doctor Management</h2>
          <p className='text-sm text-gray-500 mt-0.5'>
            {user.hospitalName} · {doctors.length} doctor{doctors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className='flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
        >
          <span className='text-lg leading-none'>+</span>
          Add Doctor
        </button>
      </div>

      {success && (
        <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
          <p className='text-sm text-green-700'>✓ {success}</p>
        </div>
      )}

      {error && !showForm && (
        <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
          <p className='text-sm text-red-600'>{error}</p>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className='bg-white border border-gray-200 rounded-xl shadow-sm p-6'>
          <div className='flex items-center justify-between mb-5'>
            <h3 className='text-base font-semibold text-gray-800'>
              {editingId ? 'Edit Doctor' : 'Add New Doctor'}
            </h3>
            <button onClick={closeForm} className='text-gray-400 hover:text-gray-600 text-xl leading-none'>✕</button>
          </div>

          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-3 mb-4'>
              <p className='text-sm text-red-600'>{error}</p>
            </div>
          )}

          <div className='grid grid-cols-2 gap-4 mb-4'>
            {/* Doctor Name */}
            <div className='col-span-2 flex flex-col gap-1'>
              <label className='text-sm font-medium text-gray-700'>
                Doctor Name <span className='text-red-500'>*</span>
              </label>
              <input
                name='name'
                value={form.name}
                onChange={handleChange}
                placeholder='e.g. Dr. Priya Kulkarni'
                className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            {/* Specialty */}
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-gray-700'>
                Specialty <span className='text-red-500'>*</span>
              </label>
              <select
                name='specialty'
                value={form.specialty}
                onChange={handleChange}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
              >
                <option value=''>-- Select Specialty --</option>
                {(hospitalSpecialties.length > 0 ? hospitalSpecialties : SPECIALTIES).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Experience */}
            <div className='flex flex-col gap-1'>
              <label className='text-sm font-medium text-gray-700'>
                Experience (years) <span className='text-red-500'>*</span>
              </label>
              <input
                name='experience'
                value={form.experience}
                onChange={handleChange}
                type='number'
                min='0'
                max='60'
                placeholder='e.g. 10'
                className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            {/* Visiting consultant checkbox */}
            <div className='col-span-2'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  name='isVisiting'
                  checked={form.isVisiting}
                  onChange={handleChange}
                  className='w-4 h-4 text-blue-600 rounded border-gray-300'
                />
                <span className='text-sm font-medium text-gray-700'>Visiting Consultant</span>
                <span className='text-xs text-gray-400'>(not a full-time staff doctor)</span>
              </label>
            </div>
          </div>

          {/* Schedule slots */}
          <div className='flex flex-col gap-3 mb-5'>
            <div className='flex items-center justify-between'>
              <label className='text-sm font-medium text-gray-700'>
                Schedule <span className='text-gray-400 font-normal ml-1'>({form.schedule.length} slot{form.schedule.length !== 1 ? 's' : ''})</span>
              </label>
              <button
                onClick={addScheduleSlot}
                className='text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors'
              >
                + Add Slot
              </button>
            </div>

            {form.schedule.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200'>
                <p className='text-sm text-gray-400'>No schedule slots added</p>
                <p className='text-xs text-gray-400 mt-1'>Click "+ Add Slot" to add available days and times</p>
              </div>
            ) : (
              <div className='flex flex-col gap-2'>
                {form.schedule.map((slot, i) => (
                  <ScheduleSlotRow
                    key={i}
                    slot={slot}
                    index={i}
                    onChange={updateScheduleSlot}
                    onRemove={removeScheduleSlot}
                  />
                ))}
              </div>
            )}
          </div>

          <div className='flex gap-3 justify-end'>
            <button
              onClick={closeForm}
              className='px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className='px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors'
            >
              {saving ? 'Saving...' : editingId ? 'Update Doctor' : 'Add Doctor'}
            </button>
          </div>
        </div>
      )}

      {/* Doctor List */}
      {doctors.length === 0 ? (
        <div className='bg-white border border-gray-200 rounded-xl p-12 text-center'>
          <span className='text-4xl mb-4 block'>👨‍⚕️</span>
          <p className='text-gray-500 text-sm'>No doctors added yet.</p>
          <button onClick={openAdd} className='mt-4 text-blue-600 text-sm font-medium hover:underline'>
            Add your first doctor →
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-2 gap-4'>
          {doctors.map((doctor, i) => (
            <div key={doctor._id || i} className='bg-white border border-gray-200 rounded-xl shadow-sm p-4'>
              <div className='flex items-start justify-between mb-3'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0'>
                    <span className='text-blue-600 font-bold text-sm'>{doctor.name?.charAt(0) || 'D'}</span>
                  </div>
                  <div>
                    <p className='font-semibold text-gray-800 text-sm'>{doctor.name}</p>
                    <p className='text-xs text-blue-600 font-medium'>{doctor.specialty}</p>
                    {doctor.isVisiting && (
                      <span className='text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full'>
                        Visiting
                      </span>
                    )}
                  </div>
                </div>
                <div className='flex gap-1'>
                  <button
                    onClick={() => openEdit(doctor)}
                    className='p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                    title='Edit'
                  >
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                      <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(doctor)}
                    className='p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                    title='Delete'
                  >
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <polyline points='3 6 5 6 21 6' />
                      <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
                      <path d='M10 11v6M14 11v6' />
                      <path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
                    </svg>
                  </button>
                </div>
              </div>

              <div className='flex items-center gap-4 text-xs text-gray-500 mb-3'>
                <span>🏥 {doctor.experience} yrs exp</span>
              </div>

              {/* Schedule display */}
              <div>
                <p className='text-xs text-gray-400 mb-1.5'>Schedule</p>
                {(doctor.schedule && doctor.schedule.length > 0) ? (
                  <div className='flex flex-col gap-1'>
                    {doctor.schedule.map((s, j) => (
                      <div key={j} className='flex items-center gap-2 text-xs'>
                        <span className='font-medium text-gray-700 w-20 flex-shrink-0'>{s.day}</span>
                        <span className='text-gray-500'>{s.startTime} – {s.endTime}</span>
                        <span className='text-gray-400 ml-auto'>{s.maxAppointments} slots</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-xs text-gray-400 italic'>No schedule set</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className='fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50'>
          <div className='bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4'>
            <h3 className='text-base font-bold text-gray-800 mb-2'>Remove Doctor?</h3>
            <p className='text-sm text-gray-500 mb-5'>
              Are you sure you want to remove{' '}
              <span className='font-semibold text-gray-700'>{deleteConfirm.name}</span>{' '}
              from your hospital?
            </p>
            <div className='flex gap-3 justify-end'>
              <button
                onClick={() => setDeleteConfirm(null)}
                className='px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm._id)}
                className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors'
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DoctorManagement