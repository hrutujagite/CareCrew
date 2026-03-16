import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { InlineLoader } from '../../components/shared/Loader'
import 'leaflet/dist/leaflet.css'

// Real Solapur SMC ward locations with accurate coordinates
const SOLAPUR_WARDS = [
  // Zone 1 — Central Solapur
  { wardName: 'Bhavani Peth', zone: 'Zone 1', lat: 17.6720, lng: 75.9180 },
  { wardName: 'Mangalwar Peth', zone: 'Zone 1', lat: 17.6745, lng: 75.9150 },
  { wardName: 'Budhwar Peth', zone: 'Zone 1', lat: 17.6730, lng: 75.9200 },

  // Zone 2 — North Solapur
  { wardName: 'Shukrawar Peth', zone: 'Zone 2', lat: 17.6780, lng: 75.9120 },
  { wardName: 'Guruwar Peth', zone: 'Zone 2', lat: 17.6760, lng: 75.9090 },
  { wardName: 'Murarji Peth', zone: 'Zone 2', lat: 17.6800, lng: 75.9160 },

  // Zone 3 — South Solapur
  { wardName: 'Hotgi Road', zone: 'Zone 3', lat: 17.6520, lng: 75.9100 },
  { wardName: 'Laxmi Peth', zone: 'Zone 3', lat: 17.6580, lng: 75.9050 },
  { wardName: 'Siddheshwar Peth', zone: 'Zone 3', lat: 17.6650, lng: 75.9070 },

  // Zone 4 — North West
  { wardName: 'Vijapur Road', zone: 'Zone 4', lat: 17.6900, lng: 75.9000 },
  { wardName: 'Shanti Nagar', zone: 'Zone 4', lat: 17.6870, lng: 75.8980 },
  { wardName: 'Datta Nagar', zone: 'Zone 4', lat: 17.6840, lng: 75.8950 },

  // Zone 5 — South East
  { wardName: 'Akkalkot Road', zone: 'Zone 5', lat: 17.6600, lng: 75.9300 },
  { wardName: 'Osmanabad Naka', zone: 'Zone 5', lat: 17.6630, lng: 75.9350 },
  { wardName: 'Kamgar Nagar', zone: 'Zone 5', lat: 17.6580, lng: 75.9280 },

  // Zone 6 — East Solapur
  { wardName: 'Kegaon', zone: 'Zone 6', lat: 17.6700, lng: 75.9420 },
  { wardName: 'Mulegaon', zone: 'Zone 6', lat: 17.6680, lng: 75.9450 },
  { wardName: 'Kambar', zone: 'Zone 6', lat: 17.6750, lng: 75.9400 },

  // Zone 7 — West Solapur
  { wardName: 'Begam Peth', zone: 'Zone 7', lat: 17.6710, lng: 75.8950 },
  { wardName: 'Rajendra Nagar', zone: 'Zone 7', lat: 17.6690, lng: 75.8900 },
  { wardName: 'Ashok Nagar', zone: 'Zone 7', lat: 17.6730, lng: 75.8870 },

  // Zone 8 — North East
  { wardName: 'Solapur North', zone: 'Zone 8', lat: 17.6950, lng: 75.9200 },
  { wardName: 'Bhuinj Naka', zone: 'Zone 8', lat: 17.6920, lng: 75.9250 },
  { wardName: 'Prakash Nagar', zone: 'Zone 8', lat: 17.6880, lng: 75.9300 },
  { wardName: 'Sakhar Peth', zone: 'Zone 8', lat: 17.6820, lng: 75.9220 },
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
      console.log('API Response:', res.data)
      console.log('Wards:', res.data.wards)
      
      // Convert array to object for easy lookup by wardName
      const dataMap = {}
      const wards = res.data.wards || []
      wards.forEach(w => {
        dataMap[w.wardName] = w
        console.log(`Ward: ${w.wardName}, Cases: ${w.activeCaseCount}`)
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
    return wardData[wardName]?.activeCaseCount || 0
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
        style={{ height: '500px' }}
      >
        <MapContainer
          center={[17.6799, 75.9064]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {ward.wardName} — {cases} cases
                  </span>
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
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>
                            Zone
                          </td>
                          <td style={{
                            fontWeight: 600,
                            color: '#1E293B',
                            textAlign: 'right'
                          }}>
                            {ward.zone}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>
                            Active Cases
                          </td>
                          <td style={{
                            fontWeight: 700,
                            color: color,
                            textAlign: 'right'
                          }}>
                            {cases}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>
                            Top Disease
                          </td>
                          <td style={{
                            fontWeight: 600,
                            color: '#1E293B',
                            textAlign: 'right'
                          }}>
                            {info.topDisease || 'None reported'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>
                            Available Beds
                          </td>
                          <td style={{
                            fontWeight: 600,
                            color: '#1E293B',
                            textAlign: 'right'
                          }}>
                            {info.availableBeds || 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B', paddingBottom: '4px' }}>
                            ICU Available
                          </td>
                          <td style={{
                            fontWeight: 600,
                            color: '#1E293B',
                            textAlign: 'right'
                          }}>
                            {info.icuAvailable || 'N/A'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748B' }}>Risk Level</td>
                          <td style={{
                            fontWeight: 700,
                            color: color,
                            textAlign: 'right'
                          }}>
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
              className={`rounded-lg border p-2 flex items-center 
                         justify-between ${borderColor}`}
            >
              <div>
                <p className='text-xs font-semibold text-gray-700'>
                  {ward.wardName}
                </p>
                <p className='text-xs text-gray-500'>{ward.zone}</p>
              </div>
              <span
                className='text-sm font-bold'
                style={{ color }}
              >
                {cases}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Heatmap