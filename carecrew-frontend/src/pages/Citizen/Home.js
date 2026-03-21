import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CitizenLayout from './CitizenLayout'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import { InlineLoader } from '../../components/shared/Loader'

const BASE_URL = 'http://localhost:5000/api'

// ── Emergency Hospital Finder ─────────────────────────────────────────────────
const EmergencyFinder = () => {
  const [status, setStatus] = useState('idle')
  // idle | locating | loading | done | error
  const [hospitals, setHospitals] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  const handleFindNow = () => {
    if (!navigator.geolocation) {
      setStatus('error')
      setErrorMsg('Your browser does not support GPS location.')
      return
    }

    setStatus('locating')
    setHospitals([])
    setErrorMsg('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setStatus('loading')
        try {
          const res = await fetch(
            `${BASE_URL}/hospitals/nearest?lat=${latitude}&lng=${longitude}`
          )
          const data = await res.json()
          if (data.success) {
            setHospitals(data.hospitals)
            setStatus('done')
          } else {
            throw new Error(data.message || 'No hospitals found')
          }
        } catch (err) {
          setStatus('error')
          setErrorMsg('Could not load hospitals. Is the server running?')
        }
      },
      (err) => {
        setStatus('error')
        if (err.code === 1) {
          setErrorMsg(
            'Location access denied. Please allow location in your browser settings.'
          )
        } else {
          setErrorMsg('Could not detect your location. Please try again.')
        }
      },
      { timeout: 10000 }
    )
  }

  const openGoogleMaps = (hospital) => {
    const query = encodeURIComponent(
      hospital.address
        ? `${hospital.hospitalName}, ${hospital.address}`
        : hospital.hospitalName
    )
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank'
    )
  }

  const getBedBadge = (bedStatus) => {
    if (bedStatus === 'Critical')
      return 'bg-red-100 text-red-700 border border-red-200'
    if (bedStatus === 'Limited')
      return 'bg-orange-100 text-orange-700 border border-orange-200'
    return 'bg-green-100 text-green-700 border border-green-200'
  }

  const getBedLabel = (bedStatus) => {
    if (bedStatus === 'Critical') return 'CRITICAL'
    if (bedStatus === 'Limited') return 'LIMITED'
    return 'AVAILABLE'
  }

  const getDistanceColor = (km) => {
    if (km <= 1) return 'text-green-600'
    if (km <= 3) return 'text-orange-500'
    return 'text-gray-500'
  }

  return (
    <div className='bg-red-50 border border-red-200 rounded-xl p-5 h-full
                    flex flex-col'>
      {/* Header */}
      <div className='flex items-start justify-between mb-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='text-base'>🚨</span>
            <p className='text-sm font-semibold text-gray-700 uppercase
                          tracking-wide'>
              Emergency Hospital Finder
            </p>
          </div>
          <p className='text-xs text-gray-500'>
            Nearest hospitals with available beds — via GPS
          </p>
        </div>
        {status === 'done' && (
          <button
            onClick={handleFindNow}
            className='text-xs text-red-600 hover:text-red-800 underline
                       underline-offset-2 flex-shrink-0'
          >
            Refresh
          </button>
        )}
      </div>

      {/* idle */}
      {status === 'idle' && (
        <button
          onClick={handleFindNow}
          className='w-full bg-red-600 hover:bg-red-700 active:bg-red-800
                     text-white font-semibold py-3 px-4 rounded-lg
                     transition-colors text-sm flex items-center
                     justify-center gap-2'
        >
          <span>📍</span>
          Find Nearest Available Hospital →
        </button>
      )}

      {/* locating */}
      {status === 'locating' && (
        <div className='flex items-center gap-3 py-2'>
          <div className='w-4 h-4 border-2 border-red-500
                          border-t-transparent rounded-full animate-spin
                          flex-shrink-0' />
          <p className='text-sm text-gray-600'>Detecting your location...</p>
        </div>
      )}

      {/* loading */}
      {status === 'loading' && (
        <div className='flex items-center gap-3 py-2'>
          <div className='w-4 h-4 border-2 border-red-500
                          border-t-transparent rounded-full animate-spin
                          flex-shrink-0' />
          <p className='text-sm text-gray-600'>
            Finding nearest hospitals...
          </p>
        </div>
      )}

      {/* error */}
      {status === 'error' && (
        <div className='bg-red-100 border border-red-200 rounded-lg p-4
                        mb-3'>
          <p className='text-sm text-red-700 mb-3'>{errorMsg}</p>
          <button
            onClick={handleFindNow}
            className='text-sm font-medium text-red-700 underline
                       underline-offset-2'
          >
            Try again
          </button>
        </div>
      )}

      {/* results */}
      {status === 'done' && hospitals.length > 0 && (
        <div className='flex flex-col gap-3'>
          {hospitals.map((h, i) => (
            <div
              key={i}
              className='bg-white rounded-xl border border-gray-200
                         shadow-sm p-4'
            >
              {/* Top row */}
              <div className='flex items-start justify-between gap-2 mb-2'>
                <div className='flex items-center gap-2 min-w-0'>
                  <div className='flex-shrink-0 w-6 h-6 rounded-full
                                  bg-red-600 text-white text-xs font-bold
                                  flex items-center justify-center'>
                    {i + 1}
                  </div>
                  <p className='font-semibold text-gray-800 text-sm truncate'>
                    {h.hospitalName}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full
                                 font-medium flex-shrink-0
                                 ${getBedBadge(h.bedStatus)}`}>
                  {getBedLabel(h.bedStatus)}
                </span>
              </div>

              {/* Stats row */}
              <div className='flex items-center gap-4 text-xs mb-3'>
                <span className='text-gray-600'>
                  🛏️{' '}
                  <span className='font-semibold'>{h.availableBeds}</span>
                  <span className='text-gray-400'>/{h.totalBeds}</span>
                  {' '}beds
                </span>
                <span className='text-gray-600'>
                  🏥 ICU:{' '}
                  <span className='font-semibold'>
                    {h.icuAvailable > 0 ? h.icuAvailable : '—'}
                  </span>
                  {h.icuAvailable > 0 && (
                    <span className='text-gray-400'>/{h.icuTotal}</span>
                  )}
                </span>
                <span className={`font-semibold
                                 ${getDistanceColor(h.distanceKm)}`}>
                  📍 {h.distanceKm} km
                </span>
              </div>

              {/* Directions */}
              <button
                onClick={() => openGoogleMaps(h)}
                className='w-full flex items-center justify-center gap-1.5
                           bg-blue-600 hover:bg-blue-700 text-white text-xs
                           font-semibold px-3 py-2 rounded-lg
                           transition-colors'
              >
                <span>🗺️</span>
                Get Directions
              </button>
            </div>
          ))}
        </div>
      )}

      {status === 'done' && hospitals.length === 0 && (
        <p className='text-sm text-gray-500 py-3'>
          No hospitals found near your location.
        </p>
      )}
    </div>
  )
}

// ── Home Page ─────────────────────────────────────────────────────────────────
const Home = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(true)

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/hospitals`)
        const data = await res.json()
        if (data.success) setHospitals(data.hospitals || [])
      } catch (err) {
        console.error('Home fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getBedStatusLabel = (bedStatus) => {
    if (bedStatus === 'Critical') return 'CRITICAL'
    if (bedStatus === 'Limited') return 'LIMITED'
    return 'NORMAL'
  }

  return (
    <CitizenLayout>
      {/* Greeting */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>
          Hello, {user?.name?.split(' ')[0] || 'there'}.
        </h1>
        <p className='text-sm text-gray-500 mt-1'>{todayStr}</p>
      </div>

      {loading ? (
        <InlineLoader message='Loading health data...' />
      ) : (
        <>
          {/* Quick Connect — unchanged */}
          <div className='bg-blue-50 rounded-xl border border-blue-100 p-6
                          mb-6'>
            <span className='text-xs font-semibold text-blue-600 bg-blue-100
                             px-3 py-1 rounded-full uppercase tracking-wide'>
              Quick Connect
            </span>
            <h2 className='text-xl font-bold text-gray-800 mt-3'>
              Book a Specialist Appointment
            </h2>
            <p className='text-sm text-gray-500 mt-1 max-w-sm'>
              Schedule a visit with top-rated medical professionals across
              multiple departments.
            </p>
            <div className='mt-4'>
              <Button
                label='Book Now →'
                variant='primary'
                onClick={() => navigate('/citizen/appointments/book')}
              />
            </div>
          </div>

          {/* Emergency Finder (col-span-2) + Live Bed Availability (col-span-1) */}
          <div className='grid grid-cols-3 gap-6'>

            {/* Emergency Hospital Finder — replaces old map */}
            <div className='col-span-2'>
              <EmergencyFinder />
            </div>

            {/* Live Bed Availability — exactly as before */}
            <div className='col-span-1'>
              <Card title='Live Bed Availability'>
                <div className='flex flex-col gap-3 max-h-96 overflow-y-auto
                                pr-1'>
                  {hospitals.length === 0 ? (
                    <p className='text-sm text-gray-400 text-center py-4'>
                      No hospital data available
                    </p>
                  ) : (
                    hospitals.map((h, i) => (
                      <div
                        key={i}
                        className='border border-gray-100 rounded-lg p-3
                                   bg-gray-50'
                      >
                        <div className='flex items-start justify-between
                                        gap-2 mb-2'>
                          <p className='text-xs font-semibold text-gray-800
                                        leading-snug'>
                            {h.hospitalName}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full
                                           font-medium flex-shrink-0
                                           ${h.bedStatus === 'Critical'
                              ? 'bg-red-100 text-red-700'
                              : h.bedStatus === 'Limited'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                            {getBedStatusLabel(h.bedStatus)}
                          </span>
                        </div>
                        <div className='grid grid-cols-2 gap-2'>
                          <div>
                            <p className='text-xs text-gray-400 uppercase
                                          tracking-wide'>ICU</p>
                            <p className='text-sm font-bold text-blue-600'>
                              {String(h.icuAvailable).padStart(2, '0')}
                              <span className='text-xs text-gray-400
                                               font-normal'>
                                /{h.icuTotal}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className='text-xs text-gray-400 uppercase
                                          tracking-wide'>GENERAL</p>
                            <p className='text-sm font-bold text-gray-800'>
                              {String(h.availableBeds).padStart(2, '0')}
                              <span className='text-xs text-gray-400
                                               font-normal'>
                                /{h.totalBeds}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </CitizenLayout>
  )
}

export default Home
