import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CitizenLayout from './CitizenLayout'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import { InlineLoader } from '../../components/shared/Loader'

const BASE_URL = 'https://carecrew-1.onrender.com/api'

// Day name from a Date object — matches backend enum exactly
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[date.getDay()]
}

const AppointmentBooking = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const preSelected = location.state?.hospitalName || ''

  const [hospitals, setHospitals]               = useState([])
  const [specialties, setSpecialties]           = useState([])
  const [doctors, setDoctors]                   = useState([])
  const [loadingHospitals, setLoadingHospitals] = useState(true)
  const [loadingDoctors, setLoadingDoctors]     = useState(false)
  const [submitting, setSubmitting]             = useState(false)
  const [error, setError]                       = useState('')
  const [confirmed, setConfirmed]               = useState(null)

  const [form, setForm] = useState({
    hospitalName: preSelected,
    ward: h?.ward || 'General',
    specialty: '',
    doctorName: '',
    preferredDate: '',
    timeSlot: '',
    chiefComplaint: ''
  })
  const filteredHospitals = hospitals.filter(h =>
  !h.hospitalName.toLowerCase().includes("uphc")
);
  const [selectedDoctor, setSelectedDoctor] = useState(null)

  // ── Generate next 14 dates ──────────────────────────────────────────────
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d
  })

  // ── Get schedule slot for a given date (or null if unavailable) ─────────
  const getScheduleForDate = (doctor, date) => {
    if (!doctor?.schedule || doctor.schedule.length === 0) return null
    const dayName = getDayName(date)
    return doctor.schedule.find(s => s.day === dayName) || null
  }

  // ── Is a date available for the selected doctor? ────────────────────────
  const isDateAvailable = (date) => {
    if (!selectedDoctor) return false
    return getScheduleForDate(selectedDoctor, date) !== null
  }

  // ── Time slot label for a date: "9:00 AM – 1:00 PM" ────────────────────
  const getTimeSlotLabel = (slot) => {
    if (!slot) return ''
    return `${slot.startTime} – ${slot.endTime}`
  }

  // ── Parse date string without timezone shift ────────────────────────────
  // new Date('2024-01-15') creates midnight UTC which shifts day in IST
  // This parses directly to local date
  const parseDateString = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // ── Load hospitals on mount ─────────────────────────────────────────────
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await fetch(`${BASE_URL}/hospitals`)
        const data = await res.json()
        if (data.success) {
          setHospitals(data.hospitals)
          if (preSelected) {
            const h = data.hospitals.find(h => h.hospitalName === preSelected)
            if (h) {
              setSpecialties(h.specialties || [])
              setForm(prev => ({
                ...prev,
                hospitalName: preSelected,
                ward: h?.ward || "General"
              }))
            }
          }
        }
      } catch {
        setError('Failed to load hospitals')
      } finally {
        setLoadingHospitals(false)
      }
    }
    fetchHospitals()
  }, [preSelected])

  // ── Hospital change ─────────────────────────────────────────────────────
  const handleHospitalChange = (e) => {
    const name = e.target.value
    const h = hospitals.find(h => h.hospitalName === name)
    setForm(prev => ({
      ...prev,
      hospitalName: name,
      ward: h?.ward || "General",
      specialty: '',
      doctorName: '',
      preferredDate: '',
      timeSlot: ''
    }))
    setSpecialties(h?.specialties || [])
    setDoctors([])
    setSelectedDoctor(null)
  }

  // ── Specialty change — load doctors ─────────────────────────────────────
  const handleSpecialtyChange = async (e) => {
    const specialty = e.target.value
    setForm(prev => ({
      ...prev,
      specialty,
      doctorName: '',
      preferredDate: '',
      timeSlot: ''
    }))
    setDoctors([])
    setSelectedDoctor(null)

    if (!specialty || !form.hospitalName) return
    setLoadingDoctors(true)
    try {
      const res = await fetch(
        `${BASE_URL}/hospitals/${encodeURIComponent(form.hospitalName)}/doctors?specialty=${specialty}`
      )
      const data = await res.json()
      if (data.success) setDoctors(data.doctors || [])
    } catch {
      setError('Failed to load doctors')
    } finally {
      setLoadingDoctors(false)
    }
  }

  // ── Doctor change ────────────────────────────────────────────────────────
  const handleDoctorChange = (e) => {
    const name = e.target.value
    const doc = doctors.find(d => d.name === name) || null
    setSelectedDoctor(doc)
    setForm(prev => ({
      ...prev,
      doctorName: name,
      preferredDate: '',
      timeSlot: ''
    }))
  }

  // ── Date selection ───────────────────────────────────────────────────────
  const handleDateSelect = (dateStr, date) => {
    if (!isDateAvailable(date)) return

    const slot = getScheduleForDate(selectedDoctor, date)
    const slotLabel = getTimeSlotLabel(slot)

    setForm(prev => ({
      ...prev,
      preferredDate: dateStr,
      timeSlot: slotLabel
    }))
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('')
    const {
      hospitalName, ward, specialty, doctorName,
      preferredDate, timeSlot, chiefComplaint
    } = form

    // ✅ FIX — added ward to required fields check
    if (!hospitalName || !ward || !specialty || !doctorName || !preferredDate || !timeSlot) {
      setError('Please fill all required fields')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${BASE_URL}/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          hospitalName,
          ward,
          specialty,
          doctorName,
          preferredDate,
          timeSlot,
          chiefComplaint
        })
      })
      const data = await res.json()
      if (data.success) {
        setConfirmed(data.appointment)
      } else {
        setError(data.message || 'Booking failed')
      }
    } catch {
      setError('Server error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (confirmed) {
    return (
      <CitizenLayout>
        <div className='max-w-md mx-auto mt-16'>
          <Card>
            <div className='flex flex-col items-center text-center py-6'>
              <div className='w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4'>
                <span className='text-yellow-600 text-2xl'>⏳</span>
              </div>
              <h2 className='text-xl font-bold text-gray-800 mb-1'>
                Appointment Requested!
              </h2>
              <p className='text-sm text-yellow-600 font-medium mb-1'>
                Awaiting confirmation from the hospital
              </p>
              <p className='text-sm text-gray-500 mb-6'>
                Reference:{' '}
                <span className='text-blue-600 font-semibold'>
                  {confirmed.bookingReference}
                </span>
              </p>

              <div className='w-full bg-gray-50 rounded-xl p-4 text-left border border-gray-100 mb-6'>
                {[
                  { label: 'Hospital',  value: confirmed.hospitalName },
                  { label: 'Doctor',    value: confirmed.doctorName },
                  { label: 'Specialty', value: confirmed.specialty },
                  {
                    label: 'Date',
                    value: new Date(confirmed.preferredDate).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })
                  },
                  { label: 'Time', value: confirmed.timeSlot },
                ].map((item, i) => (
                  <div key={i} className='flex justify-between py-2 border-b border-gray-100 last:border-0'>
                    <span className='text-sm text-gray-500'>{item.label}</span>
                    <span className='text-sm font-semibold text-gray-800'>{item.value}</span>
                  </div>
                ))}
              </div>

              <Button
                label='Go Home'
                variant='primary'
                fullWidth
                onClick={() => navigate('/citizen/home')}
              />
              <button
                onClick={() => navigate('/citizen/my-appointments')}
                className='mt-3 text-sm text-blue-600 hover:underline'
              >
                View My Appointments
              </button>
            </div>
          </Card>
        </div>
      </CitizenLayout>
    )
  }

  // ── Booking form ─────────────────────────────────────────────────────────
  return (
    <CitizenLayout>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Schedule Your Visit</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Book a specialist appointment in under 60 seconds
        </p>
      </div>

      {loadingHospitals ? (
        <InlineLoader message='Loading hospitals...' />
      ) : (
        <div className='grid grid-cols-3 gap-6'>

          {/* ── Booking Form ── */}
          <div className='col-span-2'>
            <Card title='Appointment Details'>
              {error && (
                <div className='bg-red-50 border border-red-200 rounded-lg p-3 mb-4'>
                  <p className='text-sm text-red-600'>{error}</p>
                </div>
              )}

              <div className='flex flex-col gap-4'>

                {/* Hospital */}
                <Input
                  label='Preferred Hospital'
                  type='select'
                  name='hospitalName'
                  value={form.hospitalName}
                  onChange={handleHospitalChange}
                  required
                  options={filteredHospitals.map(h => ({
  value: h.hospitalName,
  label: h.hospitalName
}))}
                />

                {/* Specialty */}
                <Input
                  label='Medical Specialty'
                  type='select'
                  name='specialty'
                  value={form.specialty}
                  onChange={handleSpecialtyChange}
                  required
                  disabled={!form.hospitalName}
                  options={specialties.map(s => ({ value: s, label: s }))}
                />

                {/* Doctor */}
                {loadingDoctors ? (
                  <InlineLoader message='Loading doctors...' />
                ) : (
                  <Input
                    label='Select Doctor'
                    type='select'
                    name='doctorName'
                    value={form.doctorName}
                    onChange={handleDoctorChange}
                    required
                    disabled={!form.specialty}
                    options={doctors.map(d => ({
                      value: d.name,
                      label: `${d.name} — ${d.specialty}${d.isVisiting ? ' (Visiting)' : ''}`
                    }))}
                  />
                )}

                {/* ── Date Picker ── */}
                {form.doctorName && (
                  <div>
                    <label className='text-sm font-medium text-gray-700 block mb-1'>
                      Select Date <span className='text-red-500'>*</span>
                    </label>

                    {selectedDoctor?.schedule?.length > 0 ? (
                      <p className='text-xs text-gray-400 mb-2'>
                        Available on:{' '}
                        <span className='font-semibold text-blue-600'>
                          {selectedDoctor.schedule.map(s => s.day).join(', ')}
                        </span>
                      </p>
                    ) : (
                      <p className='text-xs text-orange-500 mb-2'>
                        ⚠ No schedule set for this doctor — contact the hospital directly.
                      </p>
                    )}

                    <div className='flex gap-2 overflow-x-auto pb-2'>
                      {next14Days.map((date, i) => {
                        const dateStr   = date.toISOString().split('T')[0]
                        const available = isDateAvailable(date)
                        const isSelected = form.preferredDate === dateStr

                        return (
                          <button
                            key={i}
                            onClick={() => handleDateSelect(dateStr, date)}
                            disabled={!available}
                            title={
                              available
                                ? `Available — ${getDayName(date)}`
                                : `${getDayName(date)} — not available`
                            }
                            className={`flex flex-col items-center px-3 py-2 rounded-lg border
                                        text-xs font-medium flex-shrink-0 transition-colors
                                        ${isSelected
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : available
                                            ? 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                                            : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                                        }`}
                          >
                            <span className='uppercase text-[10px]'>
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className='text-base font-bold mt-0.5'>
                              {date.getDate()}
                            </span>
                            {available && !isSelected && (
                              <span className='w-1.5 h-1.5 rounded-full bg-blue-400 mt-0.5' />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Time slot — auto-filled from schedule ── */}
                {form.preferredDate && form.timeSlot && (
                  <div>
                    <label className='text-sm font-medium text-gray-700 block mb-1'>
                      Appointment Time
                    </label>
                    {(() => {
                      // ✅ FIX — parse date string directly to avoid timezone shift
                      const selectedDate = parseDateString(form.preferredDate)
                      const slot = getScheduleForDate(selectedDoctor, selectedDate)
                      return (
                        <div className='flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg'>
                          <span className='text-blue-600 text-base'>🕐</span>
                          <div>
                            <p className='text-sm font-bold text-blue-800'>{form.timeSlot}</p>
                            <p className='text-xs text-blue-500'>
                              {getDayName(selectedDate)} · Up to {slot?.maxAppointments || 20} appointments
                            </p>
                          </div>
                          <span className='ml-auto text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200'>
                            Available
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* No schedule message */}
                {form.doctorName && selectedDoctor?.schedule?.length === 0 && (
                  <div className='bg-orange-50 border border-orange-200 rounded-lg p-3'>
                    <p className='text-sm text-orange-700 font-medium'>
                      This doctor has no schedule set yet. Please contact the hospital directly or choose a different doctor.
                    </p>
                  </div>
                )}

                {/* Chief Complaint */}
                <Input
                  label='Chief Complaint / Reason for Visit'
                  type='textarea'
                  name='chiefComplaint'
                  value={form.chiefComplaint}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    chiefComplaint: e.target.value
                  }))}
                  placeholder='Please briefly describe your symptoms...'
                />

                {/* Submit */}
                <div className='pt-2'>
                  <Button
                    label={submitting ? 'Booking...' : 'Confirm Appointment →'}
                    variant='primary'
                    fullWidth
                    disabled={submitting || !form.timeSlot}
                    onClick={handleSubmit}
                  />
                </div>

              </div>
            </Card>
          </div>

          {/* ── Doctor Info Panel ── */}
          <div className='col-span-1 flex flex-col gap-4'>
            {selectedDoctor ? (
              <Card title='Assigned Specialist'>
                <div className='flex flex-col items-center text-center py-2'>
                  <div className='w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3'>
                    <span className='text-blue-600 text-xl font-bold'>
                      {selectedDoctor.name?.charAt(0) || 'D'}
                    </span>
                  </div>
                  <p className='font-bold text-gray-800 text-base'>
                    {selectedDoctor.name}
                  </p>
                  <p className='text-sm text-gray-500 mt-0.5'>
                    {selectedDoctor.specialty}
                  </p>
                  {selectedDoctor.isVisiting && (
                    <span className='mt-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200'>
                      Visiting Consultant
                    </span>
                  )}
                </div>

                <div className='mt-4 flex flex-col gap-2'>
                  {/* Rating */}
                  {selectedDoctor.rating ? (
                    <div className='bg-blue-50 rounded-lg p-3'>
                      <div className='flex items-center gap-1 mb-0.5'>
                        {[1, 2, 3, 4, 5].map(s => (
                          <span
                            key={s}
                            className={
                              s <= Math.round(selectedDoctor.rating)
                                ? 'text-yellow-400 text-base'
                                : 'text-gray-200 text-base'
                            }
                          >★</span>
                        ))}
                      </div>
                      <p className='text-xs text-gray-500'>
                        {selectedDoctor.rating}/5 · Citizen rated
                      </p>
                    </div>
                  ) : (
                    <div className='bg-gray-50 rounded-lg p-3 flex items-center gap-2'>
                      <span className='text-gray-300 text-base'>★★★★★</span>
                      <p className='text-xs text-gray-400'>Not yet rated</p>
                    </div>
                  )}

                  {/* Experience */}
                  <div className='bg-blue-50 rounded-lg p-3 flex items-center gap-2'>
                    <span>🏥</span>
                    <p className='text-sm font-semibold text-gray-800'>
                      {selectedDoctor.experience} Yrs Experience
                    </p>
                  </div>

                  {/* Schedule summary */}
                  {selectedDoctor.schedule?.length > 0 && (
                    <div className='bg-gray-50 rounded-lg p-3'>
                      <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>
                        Weekly Schedule
                      </p>
                      <div className='flex flex-col gap-1.5'>
                        {selectedDoctor.schedule.map((s, i) => (
                          <div key={i} className='flex items-center justify-between text-xs'>
                            <span className='font-semibold text-gray-700 w-20'>{s.day}</span>
                            <span className='text-gray-500'>{s.startTime} – {s.endTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card title='Assigned Specialist'>
                <div className='flex flex-col items-center py-8 text-center'>
                  <div className='w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3'>
                    <span className='text-gray-400 text-2xl'>👨‍⚕️</span>
                  </div>
                  <p className='text-sm text-gray-400'>
                    Select a hospital, specialty and doctor to see details
                  </p>
                </div>
              </Card>
            )}

            {/* Booking info */}
            <Card title='Booking Info'>
              <div className='flex flex-col gap-3'>
                {[
                  'Please arrive 15 minutes prior to your scheduled time',
                  'Bring a valid ID for check-in',
                ].map((info, i) => (
                  <div key={i} className='flex items-start gap-2'>
                    <span className='text-blue-500 text-xs mt-0.5'>ℹ️</span>
                    <p className='text-xs text-gray-600'>{info}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>
      )}
    </CitizenLayout>
  )
}

export default AppointmentBooking