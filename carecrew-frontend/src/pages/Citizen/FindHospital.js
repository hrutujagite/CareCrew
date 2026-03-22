import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CitizenLayout from './CitizenLayout'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import { InlineLoader } from '../../components/shared/Loader'

const BASE_URL = 'https://carecrew-1.onrender.com/api'

const FindHospital = () => {
  const navigate = useNavigate()
  const [hospitals, setHospitals] = useState([])
  const [wards, setWards] = useState([])
  const [search, setSearch] = useState('')
  const [selectedWard, setSelectedWard] = useState('All')
  const [loading, setLoading] = useState(true)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hospRes, wardRes] = await Promise.all([
          fetch(`${BASE_URL}/hospitals`),
          fetch(`${BASE_URL}/wards`)
        ])
        const hospData = await hospRes.json()
        const wardData = await wardRes.json()
        if (hospData.success) setHospitals(hospData.hospitals)
        if (wardData.success) setWards(wardData.wards)
      } catch (err) {
        console.error('FindHospital fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Init map
  useEffect(() => {
    if (!hospitals.length || !mapRef.current) return
    if (mapInstanceRef.current) return

    const L = window.L
    if (!L) return

    const map = L.map(mapRef.current).setView([17.6868, 75.9064], 13)
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map)

    addMarkers(map, hospitals)
  }, [hospitals])

  const addMarkers = (map, list) => {
    const L = window.L
    if (!L) return

    // Clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    list.forEach((hospital) => {
      if (!hospital.lat || !hospital.lng) return

      const color = hospital.bedStatus === 'Critical'
        ? '#ef4444'
        : hospital.bedStatus === 'Limited'
        ? '#f97316'
        : '#22c55e'

      const marker = L.circleMarker([hospital.lat, hospital.lng], {
        color, fillColor: color,
        fillOpacity: 0.85, radius: 10, weight: 2
      })

      marker.bindPopup(`
        <div style="min-width:180px">
          <b style="font-size:13px">${hospital.hospitalName}</b><br/>
          <span style="color:#6b7280;font-size:11px">
            Ward: ${hospital.ward}
          </span><br/>
          <div style="margin-top:6px;font-size:12px;line-height:1.8">
            🛏️ Beds: <b>${hospital.availableBeds}/${hospital.totalBeds}</b><br/>
            🏥 ICU: <b>${hospital.icuAvailable}/${hospital.icuTotal}</b><br/>
            💧 Oxygen: <b>${hospital.oxygenStatus}</b>
          </div>
        </div>
      `)

      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }

  const filtered = hospitals.filter(h => {
    const matchSearch = h.hospitalName.toLowerCase()
      .includes(search.toLowerCase())
    const matchWard = selectedWard === 'All' || h.ward === selectedWard
    return matchSearch && matchWard
  })

  const getStatusStyle = (bedStatus) => {
    if (bedStatus === 'Critical')
      return 'bg-red-100 text-red-700'
    if (bedStatus === 'Limited')
      return 'bg-orange-100 text-orange-700'
    return 'bg-green-100 text-green-700'
  }

  return (
    <CitizenLayout>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Find Hospital</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Using Solapur city center
        </p>
      </div>

      {/* Search + Filter */}
      <div className='flex gap-3 mb-6'>
        <div className='flex-1 relative'>
          <span className='absolute left-3 top-2.5 text-gray-400'>🔍</span>
          <input
            type='text'
            placeholder='Search by hospital name...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full pl-9 pr-4 py-2 border border-gray-300
                       rounded-lg text-sm focus:outline-none
                       focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <select
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     bg-white'
        >
          <option value='All'>All Wards</option>
          {wards.map((w, i) => (
            <option key={i} value={w.wardName}>{w.wardName}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <InlineLoader message='Loading hospitals...' />
      ) : (
        <div className='grid grid-cols-2 gap-6'>
          {/* Map */}
          <div>
            <Card>
              <div className='flex items-center gap-2 mb-3'>
                <span>🗺️</span>
                <p className='text-sm font-semibold text-gray-700'>
                  Live Map — Solapur
                </p>
              </div>
              <p className='text-xs text-gray-400 mb-3'>
                🟢 Plenty of beds · 🟠 Limited · 🔴 Critical
              </p>
              <div
                ref={mapRef}
                style={{ height: '460px', borderRadius: '10px' }}
                className='w-full border border-gray-200'
              />
            </Card>
          </div>

          {/* Hospital List */}
          <div className='flex flex-col gap-3 max-h-screen overflow-y-auto
                          pr-1'>
            {filtered.length === 0 ? (
              <div className='bg-white rounded-xl border border-gray-200
                              p-8 text-center'>
                <p className='text-gray-400 text-sm'>No hospitals found</p>
              </div>
            ) : (
              filtered.map((h, i) => (
                <div
                  key={i}
                  className='bg-white rounded-xl border border-gray-200
                             shadow-sm p-4'
                >
                  <div className='flex items-start justify-between gap-3
                                  mb-3'>
                    <div>
                      <p className='font-semibold text-gray-800 text-sm'>
                        {h.hospitalName}
                      </p>
                      <p className='text-xs text-gray-400 mt-0.5'>
                        Ward: {h.ward}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full
                                     font-medium flex-shrink-0
                                     ${getStatusStyle(h.bedStatus)}`}>
                      {h.bedStatus === 'Critical' ? 'CRITICAL'
                        : h.bedStatus === 'Limited' ? 'LIMITED'
                        : 'NORMAL'}
                    </span>
                  </div>

                  <div className='grid grid-cols-3 gap-3 mb-3'>
                    <div>
                      <p className='text-xs text-gray-400'>Beds</p>
                      <p className='text-sm font-bold text-gray-800'>
                        {h.availableBeds}
                        <span className='text-xs text-gray-400 font-normal'>
                          /{h.totalBeds}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-400'>ICU</p>
                      <p className='text-sm font-bold text-gray-800'>
                        {h.icuAvailable ? '✅' : '❌'}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-400'>Oxygen</p>
                      <p className='text-sm font-bold text-gray-800'>
                        {h.oxygenStatus}
                      </p>
                    </div>
                  </div>

                  <Button
                    label='Book Now'
                    variant='primary'
                    fullWidth
                    onClick={() => navigate('/citizen/appointments/book', {
                      state: { hospitalName: h.hospitalName }
                    })}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </CitizenLayout>
  )
}

export default FindHospital
