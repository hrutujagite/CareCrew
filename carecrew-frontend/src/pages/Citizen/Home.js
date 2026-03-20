import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CitizenLayout from './CitizenLayout'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Badge from '../../components/shared/Badge'
import AlertComponent from '../../components/shared/Alert'
import { InlineLoader } from '../../components/shared/Loader'

const BASE_URL = 'http://localhost:5000/api'

const Home = () => {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [hospitals, setHospitals] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const fetchData = async () => {
    try {
      const [publicRes, hospitalsRes] = await Promise.all([
        fetch(`${BASE_URL}/dashboard/public`),
        fetch(`${BASE_URL}/hospitals`)
      ])
      const publicData = await publicRes.json()
      const hospitalsData = await hospitalsRes.json()

      if (publicData.success) setAlerts(publicData.alerts || [])
      if (hospitalsData.success) setHospitals(hospitalsData.hospitals || [])
    } catch (err) {
      console.error('Home fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Init Leaflet map after hospitals loaded
  useEffect(() => {
    if (!hospitals.length || !mapRef.current) return
    if (mapInstanceRef.current) return // already initialized

    const L = window.L
    if (!L) return

    const map = L.map(mapRef.current).setView([17.6868, 75.9064], 13)
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map)

    hospitals.forEach((hospital) => {
      if (!hospital.lat || !hospital.lng) return

      const color = hospital.bedStatus === 'Critical'
        ? '#ef4444'
        : hospital.bedStatus === 'Limited'
          ? '#f97316'
          : '#22c55e'

      const marker = L.circleMarker([hospital.lat, hospital.lng], {
        color,
        fillColor: color,
        fillOpacity: 0.85,
        radius: 10,
        weight: 2
      })

      marker.bindPopup(`
        <div style="min-width:180px">
          <b style="font-size:13px">${hospital.hospitalName}</b><br/>
          <span style="color:#6b7280;font-size:12px">${hospital.ward}</span><br/>
          <div style="margin-top:6px;font-size:12px">
            🛏️ Beds: <b>${hospital.availableBeds}/${hospital.totalBeds}</b><br/>
            🏥 ICU: <b>${hospital.icuAvailable}/${hospital.icuTotal}</b>
          </div>
          <div style="margin-top:8px">
            <a href="/citizen/appointments/book"
               style="background:#2563eb;color:white;padding:4px 10px;
                      border-radius:6px;font-size:11px;text-decoration:none">
              Book Now
            </a>
          </div>
        </div>
      `)

      marker.addTo(map)
    })
  }, [hospitals])

  const getBedStatusBadge = (bedStatus) => {
    if (bedStatus === 'Critical') return 'Red'
    if (bedStatus === 'Limited') return 'Yellow'
    return 'Green'
  }

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
        <p className='text-sm text-gray-500 mt-1'>
          {todayStr}
        </p>
      </div>

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className='mb-6'>
          <AlertComponent alerts={alerts} />
        </div>
      )}

      {loading ? (
        <InlineLoader message='Loading health data...' />
      ) : (
        <>
          {/* Quick Connect */}
          <div className='bg-blue-50 rounded-xl border border-blue-100 p-6 mb-6
                          flex items-center justify-between'>
            <div>
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
          </div>

          {/* Map + Bed Availability */}
          <div className='grid grid-cols-3 gap-6'>
            {/* Hospital Finder Map */}
            <div className='col-span-2'>
              <Card title='Hospital Finder'>
                <p className='text-xs text-gray-400 mb-3'>
                  🟢 Plenty of beds · 🟠 Limited · 🔴 Critical
                </p>
                {/* Leaflet map */}
                <div
                  ref={mapRef}
                  style={{ height: '380px', borderRadius: '10px' }}
                  className='w-full border border-gray-200'
                />
                <div className='mt-3'>
                  <Button
                    label='View All Hospitals'
                    variant='outline'
                    onClick={() => navigate('/citizen/hospitals')}
                  />
                </div>
              </Card>
            </div>

            {/* Live Bed Availability */}
            <div className='col-span-1'>
              <Card title='Live Bed Availability'>
                <div className='flex flex-col gap-3 max-h-96 overflow-y-auto
                                pr-1'>
                  {hospitals.length === 0 ? (
                    <p className='text-sm text-gray-400 text-center py-4'>
                      No hospital data available
                    </p>
                  ) : (
                    hospitals.slice(0, 8).map((h, i) => (
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
                              <span className='text-xs text-gray-400 font-normal'>
                                /{h.icuTotal}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className='text-xs text-gray-400 uppercase
                                          tracking-wide'>GENERAL</p>
                            <p className='text-sm font-bold text-gray-800'>
                              {String(h.availableBeds).padStart(2, '0')}
                              <span className='text-xs text-gray-400 font-normal'>
                                /{h.totalBeds}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className='mt-3 pt-3 border-t border-gray-100'>
                  <Button
                    label='View Regional List'
                    variant='outline'
                    fullWidth
                    onClick={() => navigate('/citizen/beds')}
                  />
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
