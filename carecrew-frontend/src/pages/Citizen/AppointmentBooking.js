import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CitizenLayout from './CitizenLayout'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import { InlineLoader } from '../../components/shared/Loader'

const BASE_URL = 'https://carecrew-1.onrender.com/api'

const AppointmentBooking = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Pre-selected hospital from Find Hospital page
  const preSelected = location.state?.hospitalName || ''

  const [hospitals, setHospitals] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [doctors, setDoctors] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [loadingHospitals, setLoadingHospitals] = useState(true)
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(null)

  const [form, setForm] = useState({
    hospitalName: preSelected,
    ward: '',
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

  // Generate next 10 dates
  const next10Days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d
  })

  // Load hospitals on mount
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await fetch(`${BASE_URL}/hospitals`)
        const data = await res.json()
        if (data.success) {
          setHospitals(data.hospitals)
          // If pre-selected, load specialties
          if (preSelected) {
            const h = data.hospitals.find(
              h => h.hospitalName === preSelected
            )
            if (h) {
              setSpecialties(h.specialties || [])
              setForm(prev => ({
                ...prev,
                hospitalName: preSelected,
                ward: h.ward
              }))
            }
          }
        }
      } catch (err) {
        setError('Failed to load hospitals')
      } finally {
        setLoadingHospitals(false)
      }
    }
    fetchHospitals()
  }, [preSelected])

  // When hospital changes
  const handleHospitalChange = (e) => {
    const name = e.target.value
    const h = hospitals.find(h => h.hospitalName === name)
    setForm(prev => ({
      ...prev,
      hospitalName: name,
      ward: h?.ward || '',
      specialty: '',
      doctorName: '',
      preferredDate: '',
      timeSlot: ''
    }))
    setSpecialties(h?.specialties || [])
    setDoctors([])
    setTimeSlots([])
    setSelectedDoctor(null)
  }

  // When specialty changes — load doctors
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
    setTimeSlots([])
    setSelectedDoctor(null)

    if (!specialty || !form.hospitalName) return
    setLoadingDoctors(true)
    try {
      const res = await fetch(
        `${BASE_URL}/hospitals/${encodeURIComponent(form.hospitalName)}/doctors?specialty=${specialty}`
      )
      const data = await res.json()
      if (data.success) setDoctors(data.doctors || [])
    } catch (err) {
      setError('Failed to load doctors')
    } finally {
      setLoadingDoctors(false)
    }
  }

  // When doctor changes
  const handleDoctorChange = (e) => {
    const name = e.target.value
    const doc = doctors.find(d => d.name === name)
    setSelectedDoctor(doc || null)
    setForm(prev => ({
      ...prev,
      doctorName: name,
      timeSlot: ''
    }))
    setTimeSlots(doc?.slots || [])
  }

  // Submit booking
  const handleSubmit = async () => {
    setError('')
    const { hospitalName, ward, specialty, doctorName,
      preferredDate, timeSlot, chiefComplaint } = form

    if (!hospitalName || !specialty || !doctorName ||
      !preferredDate || !timeSlot) {
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
    } catch (err) {
      setError('Server error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirmation screen
  if (confirmed) {
    return (
      <CitizenLayout>
        <div className='max-w-md mx-auto mt-16'>
          <Card>
            <div className='flex flex-col items-center text-center py-6'>
              <div className='w-16 h-16 bg-yellow-100 rounded-full flex
                              items-center justify-center mb-4'>
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

              <div className='w-full bg-gray-50 rounded-xl p-4 text-left
                              border border-gray-100 mb-6'>
                {[
                  { label: 'Hospital', value: confirmed.hospitalName },
                  { label: 'Doctor', value: confirmed.doctorName },
                  { label: 'Specialty', value: confirmed.specialty },
                  {
                    label: 'Date',
                    value: new Date(confirmed.preferredDate)
                      .toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })
                  },
                  { label: 'Time', value: confirmed.timeSlot },
                ].map((item, i) => (
                  <div key={i}
                    className='flex justify-between py-2 border-b
                               border-gray-100 last:border-0'>
                    <span className='text-sm text-gray-500'>{item.label}</span>
                    <span className='text-sm font-semibold text-gray-800'>
                      {item.value}
                    </span>
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

  return (
    <CitizenLayout>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>
          Schedule Your Visit
        </h1>
        <p className='text-sm text-gray-500 mt-1'>
          Book a specialist appointment in under 60 seconds
        </p>
      </div>

      {loadingHospitals ? (
        <InlineLoader message='Loading hospitals...' />
      ) : (
        <div className='grid grid-cols-3 gap-6'>
          {/* Booking Form */}
          <div className='col-span-2'>
            <Card title='Appointment Details'>
              {error && (
                <div className='bg-red-50 border border-red-200 rounded-lg
                                p-3 mb-4'>
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
                      label: `${d.name} — ${d.specialty}`
                    }))}
                  />
                )}

                {/* Date Picker */}
                {form.doctorName && (
                  <div>
                    <label className='text-sm font-medium text-gray-700 block mb-2'>
                      Select Date <span className='text-red-500'>*</span>
                    </label>
                    <div className='flex gap-2 overflow-x-auto pb-2'>
                      {next10Days.map((date, i) => {
                        const dateStr = date.toISOString().split('T')[0]
                        const isSelected = form.preferredDate === dateStr
                        return (
                          <button
                            key={i}
                            onClick={() => setForm(prev => ({
                              ...prev,
                              preferredDate: dateStr,
                              timeSlot: ''
                            }))}
                            className={`flex flex-col items-center px-3 py-2
                                       rounded-lg border text-xs font-medium
                                       flex-shrink-0 transition-colors
                                       ${isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-200 text-gray-600 hover:border-blue-300'
                              }`}
                          >
                            <span className='uppercase text-xs'>
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className='text-base font-bold mt-0.5'>
                              {date.getDate()}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Time Slots */}
                {form.preferredDate && timeSlots.length > 0 && (
                  <div>
                    <label className='text-sm font-medium text-gray-700
                                      block mb-2'>
                      Select Time Slot <span className='text-red-500'>*</span>
                    </label>
                    <div className='flex flex-wrap gap-2'>
                      {timeSlots.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => setForm(prev => ({
                            ...prev, timeSlot: slot
                          }))}
                          className={`px-4 py-2 rounded-lg border text-sm
                                     font-medium transition-colors
                                     ${form.timeSlot === slot
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chief Complaint */}
                <Input
                  label='Chief Complaint / Reason for Visit'
                  type='textarea'
                  name='chiefComplaint'
                  value={form.chiefComplaint}
                  onChange={(e) => setForm(prev => ({
                    ...prev, chiefComplaint: e.target.value
                  }))}
                  placeholder='Please briefly describe your symptoms...'
                />

                {/* Submit */}
                <div className='pt-2'>
                  <Button
                    label={submitting ? 'Booking...' : 'Confirm Appointment →'}
                    variant='primary'
                    fullWidth
                    disabled={submitting}
                    onClick={handleSubmit}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Doctor Info Panel */}
          <div className='col-span-1 flex flex-col gap-4'>
            {selectedDoctor ? (
              <Card title='Assigned Specialist'>
                <div className='flex flex-col items-center text-center py-2'>
                  <div className='w-14 h-14 bg-blue-100 rounded-full flex
                                  items-center justify-center mb-3'>
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
                </div>

                <div className='mt-4 flex flex-col gap-2'>
                  {selectedDoctor.rating ? (
                    <div className='bg-blue-50 rounded-lg p-3 flex items-center
                                    gap-2'>
                      <div className='flex flex-col'>
                        <div className='flex items-center gap-1'>
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={s <= Math.round(selectedDoctor.rating)
                              ? 'text-yellow-400 text-base'
                              : 'text-gray-200 text-base'}>★</span>
                          ))}
                        </div>
                        <p className='text-xs text-gray-500 mt-0.5'>
                          {selectedDoctor.rating}/5 · Citizen rated
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className='bg-gray-50 rounded-lg p-3 flex items-center
                                    gap-2'>
                      <span className='text-gray-300 text-base'>★★★★★</span>
                      <p className='text-xs text-gray-400'>Not yet rated</p>
                    </div>
                  )}
                  <div className='bg-blue-50 rounded-lg p-3 flex items-center
                                  gap-2'>
                    <span>🏥</span>
                    <div>
                      <p className='text-sm font-semibold text-gray-800'>
                        {selectedDoctor.experience} Yrs Experience
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card title='Assigned Specialist'>
                <div className='flex flex-col items-center py-8 text-center'>
                  <div className='w-14 h-14 bg-gray-100 rounded-full flex
                                  items-center justify-center mb-3'>
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