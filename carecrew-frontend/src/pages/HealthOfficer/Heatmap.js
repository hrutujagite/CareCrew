import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { InlineLoader } from '../../components/shared/Loader'
import 'leaflet/dist/leaflet.css'

const BoundsEnforcer = () => {
  const map = useMap()   // ← only works INSIDE MapContainer
  useEffect(() => {
    map.setMaxBounds(SOLAPUR_BOUNDS)
    map.setMinZoom(12)
    map.options.maxBoundsViscosity = 1.0
    map.on('drag', () => {
      map.panInsideBounds(SOLAPUR_BOUNDS, { animate: false })
    })
  }, [map])
  return null
}
// Real Solapur SMC ward locations with accurate coordinates
const SOLAPUR_WARDS = [
  { wardName: 'Bhavani Peth',   zone: 'BP01',  lat: 17.6868, lng: 75.9064 },
  { wardName: 'North Solapur',  zone: 'NS02',  lat: 17.7120, lng: 75.9180 },
  { wardName: 'Laxmi Peth',     zone: 'LP03',  lat: 17.6790, lng: 75.9020 },
  { wardName: 'Murarji Peth',   zone: 'MP04',  lat: 17.6920, lng: 75.8980 },
  { wardName: 'Shukrawar Peth', zone: 'SP05',  lat: 17.6855, lng: 75.9100 },
  { wardName: 'Sakhar Peth',    zone: 'SKP06', lat: 17.6750, lng: 75.9150 },
  { wardName: 'Budhwar Peth',   zone: 'BWP07', lat: 17.6810, lng: 75.9040 },
  { wardName: 'Osmanabad Naka', zone: 'ON08',  lat: 17.6700, lng: 75.9200 },
  { wardName: 'Kegaon',         zone: 'KG09',  lat: 17.7050, lng: 75.9300 },
  { wardName: 'Vijapur Road',   zone: 'VR10',  lat: 17.6950, lng: 75.8850 },
]

// Get color based on case count
const getColor = (cases) => {
  if (cases > 50) return '#DC2626'
  if (cases > 25) return '#D97706'
  if (cases > 10) return '#F59E0B'
  return '#16A34A'
}

// Get circle radius based on case count
const getRadius = (cases) => {
  if (cases > 50) return 22
  if (cases > 25) return 18
  if (cases > 10) return 14
  return 10
}

// Get risk level
const getRiskLevel = (cases) => {
  if (cases > 50) return 'Red'
  if (cases > 25) return 'Yellow'
  return 'Green'
}

const SOLAPUR_BOUNDS = [
  [17.6300, 75.8500],
  [17.7300, 75.9700]
]

const Heatmap = () => {
  const { token } = useAuth()
  const [wardData, setWardData] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchWardData()
    const interval = setInterval(fetchWardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchWardData = async () => {
    try {
      const res = await axios.get(
        'http://localhost:5000/api/dashboard/wards',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const dataMap = {}
      const wards = res.data.wards || []
      wards.forEach(w => {
        dataMap[w.wardName] = w
      })
      setWardData(dataMap)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to fetch ward data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getWardCases = (wardName) => {
    return wardData[wardName]?.activeCases || 0
  }

  const getWardInfo = (wardName) => {
    return wardData[wardName] || {}
  }

  if (loading) return <InlineLoader message="Loading Solapur ward map..." />

  return (
    <div className='flex flex-col gap-3'>

      {/* Header row */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4 flex-wrap'>
          <span className='text-xs font-semibold text-gray-500 uppercase'>
            Risk Legend:
          </span>
          <div className='flex items-center gap-1'>
            <div className='w-3 h-3 rounded-full bg-green-600'></div>
            <span className='text-xs text-gray-600'>Safe (0–10 cases)</span>
          </div>
          <div className='flex items-center gap-1'>
            <div className='w-3 h-3 rounded-full bg-yellow-500'></div>
            <span className='text-xs text-gray-600'>Low (11–25)</span>
          </div>
          <div className='flex items-center gap-1'>
            <div className='w-3 h-3 rounded-full bg-amber-500'></div>
            <span className='text-xs text-gray-600'>Moderate (26–50)</span>
          </div>
          <div className='flex items-center gap-1'>
            <div className='w-3 h-3 rounded-full bg-red-600'></div>
            <span className='text-xs text-gray-600'>High (50+ cases)</span>
          </div>
        </div>
        {lastUpdated && (
          <span className='text-xs text-gray-400'>
            Last updated: {lastUpdated} · Auto-refreshes every 30s
          </span>
        )}
      </div>

      {/* Map */}
      <div
        className='rounded-xl overflow-hidden border border-gray-200'
        style={{ height: '500px', width: '100%' }}
      >
        <MapContainer
          center={[17.6799, 75.9064]}
          zoom={13}
          minZoom={12}
          maxZoom={16}
          maxBounds={SOLAPUR_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(map) => {
            map.setMaxBounds(SOLAPUR_BOUNDS)
          }}
        >
          <TileLayer
            url='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; OpenStreetMap contributors'
          />
          {SOLAPUR_WARDS.map((ward) => {
            const cases = getWardCases(ward.wardName)
            const info = getWardInfo(ward.wardName)
            const color = getColor(cases)
            const radius = getRadius(cases)
            const riskLevel = getRiskLevel(cases)

            return (
              <CircleMarker
                key={ward.wardName}
                center={[ward.lat, ward.lng]}
                radius={radius}
                fillColor={color}
                color={color}
                weight={2}
                opacity={0.9}
                fillOpacity={0.6}
              >
                {/* Tooltip shows on hover */}
                <Tooltip direction='top' offset={[0, -10]}>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', minWidth: '160px' }}>
                    <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>
                      {ward.wardName}
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '3px', paddingRight: '12px' }}>Active Cases</td>
                          <td style={{ fontWeight: 700, color: color, textAlign: 'right' }}>{info.activeCases ?? cases}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '3px' }}>Cases Today</td>
                          <td style={{ fontWeight: 600, color: '#2563EB', textAlign: 'right' }}>{info.todayCases ?? 0}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '3px' }}>Top Disease</td>
                          <td style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right' }}>{info.topDisease || '—'}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '3px' }}>Risk Level</td>
                          <td style={{
                            fontWeight: 700, textAlign: 'right',
                            color: (info.riskLevel || '').toLowerCase() === 'red' ? '#DC2626'
                              : (info.riskLevel || '').toLowerCase() === 'yellow' ? '#D97706' : '#16A34A'
                          }}>
                            {info.riskLevel || getRiskLevel(cases)}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '3px' }}>Available Beds</td>
                          <td style={{ fontWeight: 600, color: (info.availableBeds ?? 0) < 10 ? '#DC2626' : '#16A34A', textAlign: 'right' }}>
                            {info.availableBeds ?? '—'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B' }}>ICU Available</td>
                          <td style={{ fontWeight: 600, color: (info.icuAvailable ?? 0) < 3 ? '#DC2626' : '#2563EB', textAlign: 'right' }}>
                            {info.icuAvailable ?? '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Tooltip>

                {/* Popup shows on click */}
                <Popup>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    minWidth: '200px',
                    padding: '4px'
                  }}>
                    <h3 style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      marginBottom: '8px',
                      color: '#1E293B',
                      borderBottom: '1px solid #E2E8F0',
                      paddingBottom: '6px'
                    }}>
                      {ward.wardName}
                    </h3>
                    <table style={{ width: '100%', fontSize: '12px' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>Zone</td>
                          <td style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right' }}>
                            {ward.zone}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>Active Cases</td>
                          <td style={{ fontWeight: 700, color: color, textAlign: 'right' }}>
                            {cases}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>Top Disease</td>
                          <td style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right' }}>
                            {info.topDisease || 'None reported'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>Available Beds</td>
                          <td style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right' }}>
                            {info.availableBeds || 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>ICU Available</td>
                          <td style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right' }}>
                            {info.icuAvailable || 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B' }}>Risk Level</td>
                          <td style={{ fontWeight: 700, color: color, textAlign: 'right' }}>
                            {riskLevel}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Ward summary below map */}
      <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
        {SOLAPUR_WARDS.map(ward => {
          const cases = getWardCases(ward.wardName)
          const info = getWardInfo(ward.wardName)
          const color = getColor(cases)
          const borderColor = cases > 50
            ? 'border-red-200 bg-red-50'
            : cases > 25
            ? 'border-yellow-200 bg-yellow-50'
            : cases > 10
            ? 'border-amber-200 bg-amber-50'
            : 'border-green-200 bg-green-50'

          return (
            <div
              key={ward.wardName}
              className={`rounded-lg border p-2 flex items-center justify-between ${borderColor}`}
              style={{ position: 'relative', cursor: 'default' }}
              onMouseEnter={e => {
                const tooltip = e.currentTarget.querySelector('.ward-tooltip')
                if (tooltip) tooltip.style.display = 'block'
              }}
              onMouseLeave={e => {
                const tooltip = e.currentTarget.querySelector('.ward-tooltip')
                if (tooltip) tooltip.style.display = 'none'
              }}
            >
              <div>
                <p className='text-xs font-semibold text-gray-700'>
                  {ward.wardName}
                </p>
                <p className='text-xs text-gray-500'>{ward.zone}</p>
              </div>
              <span className='text-sm font-bold' style={{ color }}>
                {cases}
              </span>

              {/* Hover tooltip */}
              <div className='ward-tooltip' style={{
                display: 'none',
                position: 'absolute',
                bottom: '110%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '10px 14px',
                zIndex: 999,
                minWidth: '180px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                pointerEvents: 'none',
              }}>
                <p style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B', marginBottom: '6px', borderBottom: '1px solid #F1F5F9', paddingBottom: '4px' }}>
                  {ward.wardName}
                </p>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#64748B', paddingBottom: '3px', paddingRight: '10px' }}>Active Cases</td>
                      <td style={{ fontWeight: 700, color, textAlign: 'right' }}>{info.activeCases ?? cases}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748B', paddingBottom: '3px' }}>Cases Today</td>
                      <td style={{ fontWeight: 600, color: '#2563EB', textAlign: 'right' }}>{info.todayCases ?? 0}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748B', paddingBottom: '3px' }}>Top Disease</td>
                      <td style={{ fontWeight: 600, color: '#1E293B', textAlign: 'right' }}>{info.topDisease || '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748B', paddingBottom: '3px' }}>Risk Level</td>
                      <td style={{
                        fontWeight: 700, textAlign: 'right',
                        color: (info.riskLevel || '').toLowerCase() === 'red' ? '#DC2626'
                          : (info.riskLevel || '').toLowerCase() === 'yellow' ? '#D97706' : '#16A34A'
                      }}>
                        {info.riskLevel || getRiskLevel(cases)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748B', paddingBottom: '3px' }}>Available Beds</td>
                      <td style={{ fontWeight: 600, color: (info.availableBeds ?? 0) < 10 ? '#DC2626' : '#16A34A', textAlign: 'right' }}>
                        {info.availableBeds ?? '—'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748B' }}>ICU Available</td>
                      <td style={{ fontWeight: 600, color: (info.icuAvailable ?? 0) < 3 ? '#DC2626' : '#2563EB', textAlign: 'right' }}>
                        {info.icuAvailable ?? '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Heatmap
