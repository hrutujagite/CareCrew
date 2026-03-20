import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CitizenLayout from './CitizenLayout'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Badge from '../../components/shared/Badge'
import { InlineLoader } from '../../components/shared/Loader'

const BASE_URL = 'http://localhost:5000/api'

const MyAppointments = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [error, setError] = useState('')

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${BASE_URL}/appointments/my`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setAppointments(data.appointments)
    } catch (err) {
      setError('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?'))
      return
    setCancelling(id)
    try {
      const res = await fetch(`${BASE_URL}/appointments/${id}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setAppointments(prev =>
          prev.map(a => a._id === id
            ? { ...a, status: 'Cancelled' }
            : a
          )
        )
      }
    } catch (err) {
      setError('Failed to cancel appointment')
    } finally {
      setCancelling(null)
    }
  }

  const isFuture = (dateStr) => {
    return new Date(dateStr) > new Date()
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  return (
    <CitizenLayout>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-800'>
            My Appointments
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            All your booked appointments
          </p>
        </div>
        <Button
          label='+ Book New Appointment'
          variant='primary'
          onClick={() => navigate('/citizen/appointments/book')}
        />
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 rounded-lg p-3 mb-4'>
          <p className='text-sm text-red-600'>{error}</p>
        </div>
      )}

      {loading ? (
        <InlineLoader message='Loading your appointments...' />
      ) : appointments.length === 0 ? (
        <Card>
          <div className='flex flex-col items-center py-16 text-center'>
            <span className='text-5xl mb-4'>📋</span>
            <h3 className='text-lg font-semibold text-gray-700 mb-2'>
              No Appointments Yet
            </h3>
            <p className='text-sm text-gray-400 mb-6'>
              You haven't booked any appointments yet.
            </p>
            <Button
              label='Book Your First Appointment'
              variant='primary'
              onClick={() => navigate('/citizen/appointments/book')}
            />
          </div>
        </Card>
      ) : (
        <div className='flex flex-col gap-4'>
          {appointments.map((appt) => (
            <div
              key={appt._id}
              className='bg-white rounded-xl border border-gray-200
                         shadow-sm p-5'
            >
              <div className='flex items-start justify-between gap-4'>
                {/* Left info */}
                <div className='flex-1'>
                  {/* Reference + Status */}
                  <div className='flex items-center gap-3 mb-3'>
                    <span className='text-sm font-bold text-blue-600'>
                      {appt.bookingReference}
                    </span>
                    <Badge
                      severity={appt.status}
                      text={appt.status}
                    />
                  </div>

                  {/* Details grid */}
                  <div className='grid grid-cols-2 gap-x-8 gap-y-2'>
                    {[
                      { label: 'Hospital', value: appt.hospitalName },
                      { label: 'Doctor', value: appt.doctorName },
                      { label: 'Specialty', value: appt.specialty },
                      { label: 'Ward', value: appt.ward },
                      { label: 'Date', value: formatDate(appt.preferredDate) },
                      { label: 'Time', value: appt.timeSlot },
                    ].map((item, i) => (
                      <div key={i}>
                        <p className='text-xs text-gray-400'>{item.label}</p>
                        <p className='text-sm font-medium text-gray-700'>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Chief Complaint */}
                  {appt.chiefComplaint && (
                    <div className='mt-3 bg-gray-50 rounded-lg p-3'>
                      <p className='text-xs text-gray-400 mb-1'>
                        Chief Complaint
                      </p>
                      <p className='text-sm text-gray-600'>
                        {appt.chiefComplaint}
                      </p>
                    </div>
                  )}
                </div>

                {/* Cancel button */}
                <div className='flex-shrink-0'>
                  {appt.status === 'Confirmed' &&
                    isFuture(appt.preferredDate) && (
                      <Button
                        label={cancelling === appt._id
                          ? 'Cancelling...'
                          : 'Cancel'
                        }
                        variant='danger'
                        disabled={cancelling === appt._id}
                        onClick={() => handleCancel(appt._id)}
                      />
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CitizenLayout>
  )
}

export default MyAppointments
