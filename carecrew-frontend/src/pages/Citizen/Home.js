import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CitizenLayout from './CitizenLayout'
import Button from '../../components/shared/Button'
import { InlineLoader } from '../../components/shared/Loader'

const BASE_URL = 'https://carecrew-1.onrender.com/api'

// ── Facility type display helpers ─────────────────────────────────────────────
const FACILITY_TYPES = {
  general:        { label: 'General Hospital', emoji: '🏥', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  uphc:           { label: 'UPHC',             emoji: '🏪', color: 'bg-green-100 text-green-700 border-green-200' },
  maternity_home: { label: 'Maternity Home',   emoji: '🤱', color: 'bg-pink-100 text-pink-700 border-pink-200' },
}

// Only these facility types are shown in the finder
const ALLOWED_TYPES = Object.keys(FACILITY_TYPES)

const getFacilityInfo = (type) =>
  FACILITY_TYPES[type] || { label: 'Facility', emoji: '🏥', color: 'bg-gray-100 text-gray-600 border-gray-200' }

const getDistanceColor = (km) => {
  if (km <= 1) return 'text-green-600'
  if (km <= 3) return 'text-orange-500'
  return 'text-gray-500'
}

// ── Nearest Facility Finder ───────────────────────────────────────────────────
const NearestFacilityFinder = () => {
  const [status, setStatus]     = useState('idle')
  const [facilities, setFacilities] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  const handleFindNow = () => {
    if (!navigator.geolocation) {
      setStatus('error')
      setErrorMsg('Your browser does not support GPS location.')
      return
    }

    setStatus('locating')
    setFacilities([])
    setErrorMsg('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setStatus('loading')
        try {
          const res  = await fetch(
            `${BASE_URL}/hospitals/nearest?lat=${latitude}&lng=${longitude}`
          )
          const data = await res.json()
          if (data.success) {
            const filtered = data.hospitals || []
            setFacilities(filtered)
            setStatus('done')
          } else {
            throw new Error(data.message || 'No facilities found')
          }
        } catch {
          setStatus('error')
          setErrorMsg('Could not load facilities. Please try again.')
        }
      },
      (err) => {
        setStatus('error')
        setErrorMsg(
          err.code === 1
            ? 'Location access denied. Please allow location in your browser settings.'
            : 'Could not detect your location. Please try again.'
        )
      },
      { timeout: 10000 }
    )
  }

  const openGoogleMaps = (h) => {
    const query = encodeURIComponent(
      h.address ? `${h.hospitalName}, ${h.address}` : h.hospitalName
    )
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank'
    )
  }

  return (
    <div className='bg-blue-50/50 border border-blue-100 rounded-3xl p-6
                    flex flex-col shadow-soft relative overflow-hidden'>
      {/* Subtle background glow */}
      <div className='absolute -top-10 -right-10 w-40 h-40 bg-blue-200 rounded-full
                      mix-blend-multiply opacity-20 filter blur-2xl' />

      {/* Header */}
      <div className='flex items-start justify-between mb-5'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='text-base'>📍</span>
            <p className='text-sm font-semibold text-gray-700 uppercase tracking-wide'>
              Find Nearest Facility
            </p>
          </div>
          <p className='text-xs text-gray-500'>
            Locate the closest government hospital, UPHC or maternity home near you
          </p>
        </div>
        {status === 'done' && (
          <button
            onClick={handleFindNow}
            className='text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 flex-shrink-0'
          >
            Refresh
          </button>
        )}
      </div>

      {/* idle */}
      {status === 'idle' && (
        <button
          onClick={handleFindNow}
          className='w-full bg-gradient-to-r from-blue-500 to-indigo-600
                     hover:from-blue-600 hover:to-indigo-700
                     text-white font-bold py-3.5 px-4 rounded-xl
                     shadow-lg shadow-blue-500/30 transition-all
                     transform hover:-translate-y-0.5 active:scale-[0.98]
                     text-sm flex items-center justify-center gap-2'
        >
          <span className='text-lg'>🗺️</span>
          Find Nearest Hospital / UPHC / Maternity Home →
        </button>
      )}

      {/* locating */}
      {status === 'locating' && (
        <div className='flex items-center gap-3 py-2'>
          <div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0' />
          <p className='text-sm text-gray-600'>Detecting your location...</p>
        </div>
      )}

      {/* loading */}
      {status === 'loading' && (
        <div className='flex items-center gap-3 py-2'>
          <div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0' />
          <p className='text-sm text-gray-600'>Finding nearby facilities...</p>
        </div>
      )}

      {/* error */}
      {status === 'error' && (
        <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-3'>
          <p className='text-sm text-red-700 mb-3'>{errorMsg}</p>
          <button
            onClick={handleFindNow}
            className='text-sm font-medium text-red-700 underline underline-offset-2'
          >
            Try again
          </button>
        </div>
      )}

      {/* results */}
      {status === 'done' && facilities.length > 0 && (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
          {facilities.map((h, i) => {
            const fInfo = getFacilityInfo(h.facilityType)
            return (
              <div
                key={i}
                className='bg-white rounded-xl border border-gray-200 shadow-sm p-4
                           flex flex-col gap-3'
              >
                {/* Rank + name */}
                <div className='flex items-start gap-2'>
                  <div className='flex-shrink-0 w-6 h-6 rounded-full bg-blue-600
                                  text-white text-xs font-bold flex items-center justify-center'>
                    {i + 1}
                  </div>
                  <p className='font-semibold text-gray-800 text-sm leading-snug'>
                    {h.hospitalName}
                  </p>
                </div>

                {/* Facility type badge + distance */}
                <div className='flex items-center justify-between'>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${fInfo.color}`}>
                    {fInfo.emoji} {fInfo.label}
                  </span>
                  <span className={`text-xs font-semibold ${getDistanceColor(h.distanceKm)}`}>
                    📍 {h.distanceKm} km
                  </span>
                </div>

                {/* Address */}
                {h.address && (
                  <p className='text-xs text-gray-500 leading-relaxed line-clamp-2'>
                    {h.address}
                  </p>
                )}

                {/* Directions */}
                <button
                  onClick={() => openGoogleMaps(h)}
                  className='w-full flex items-center justify-center gap-2
                             bg-slate-50 hover:bg-slate-100 text-slate-700
                             border border-slate-200 text-xs font-bold px-3 py-2.5
                             rounded-xl transition-all hover:shadow-sm active:scale-[0.98]'
                >
                  <span>🗺️</span>
                  Get Directions
                </button>
              </div>
            )
          })}
        </div>
      )}

      {status === 'done' && facilities.length === 0 && (
        <div className='bg-white border border-gray-200 rounded-xl p-6 text-center'>
          <p className='text-sm text-gray-500'>
            No registered facilities found near your location.
          </p>
          <p className='text-xs text-gray-400 mt-1'>
            More facilities will appear as they register with CareCrew.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Home Page ─────────────────────────────────────────────────────────────────
const Home = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric'
  })

  useEffect(() => {
    // No hospital data needed on home page anymore — bed availability removed
    setLoading(false)
  }, [])

  return (
    <CitizenLayout>
      {/* Greeting */}
      <div className='mb-8 relative z-10'>
        <h1 className='text-3xl font-extrabold text-slate-800 tracking-tight'>
          Hello, <span className='text-gradient'>{user?.name?.split(' ')[0] || 'there'}</span>.
        </h1>
        <p className='text-sm font-medium text-slate-500 mt-1.5 flex items-center gap-2'>
          <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse'></span>
          {todayStr}
        </p>
      </div>

      {loading ? (
        <InlineLoader message='Loading...' />
      ) : (
        <>
          {/* Quick Connect */}
          <div className='bg-gradient-to-br from-primary-50 to-indigo-50 border border-white/60
                          shadow-soft rounded-3xl p-8 mb-8 relative overflow-hidden'>
            <div className='absolute right-0 bottom-0 w-64 h-64 bg-primary-200 rounded-full
                            mix-blend-multiply opacity-20 blur-3xl' />
            <div className='relative z-10'>
              <span className='text-[11px] font-bold text-primary-700 bg-white
                               shadow-sm px-3 py-1 rounded-full uppercase tracking-widest'>
                Quick Connect
              </span>
              <h2 className='text-2xl font-extrabold text-slate-800 mt-4 tracking-tight'>
                Book a Specialist Appointment
              </h2>
              <p className='text-sm font-medium text-slate-500 mt-2 max-w-md leading-relaxed'>
                Schedule a visit with top-rated medical professionals across
                multiple departments for seamless care.
              </p>
              <div className='mt-6'>
                <Button
                  label='Book Now →'
                  variant='primary'
                  onClick={() => navigate('/citizen/appointments/book')}
                />
              </div>
            </div>
          </div>

          {/* Nearest Facility Finder — full width */}
          <NearestFacilityFinder />
        </>
      )}
    </CitizenLayout>
  )
}

export default Home

