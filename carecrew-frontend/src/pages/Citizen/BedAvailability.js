import React, { useState, useEffect } from 'react'
import CitizenLayout from './CitizenLayout'
import Card from '../../components/shared/Card'
import { InlineLoader } from '../../components/shared/Loader'

const BASE_URL = 'https://carecrew-1.onrender.com/api'

const BedAvailability = () => {
  const [hospitals, setHospitals] = useState([])
  const [wards, setWards] = useState([])
  const [search, setSearch] = useState('')
  const [selectedWard, setSelectedWard] = useState('All')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchHospitals = async () => {
    try {
      const [hospRes, wardRes] = await Promise.all([
        fetch(`${BASE_URL}/hospitals`),
        fetch(`${BASE_URL}/wards`)
      ])
      const hospData = await hospRes.json()
      const wardData = await wardRes.json()
      if (hospData.success) setHospitals(hospData.hospitals)
      if (wardData.success) setWards(wardData.wards)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('BedAvailability fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHospitals()
    // Refresh every 30 seconds
    const interval = setInterval(fetchHospitals, 30000)
    return () => clearInterval(interval)
  }, [])

  const filtered = hospitals.filter(h => {
    const matchSearch = h.hospitalName.toLowerCase()
      .includes(search.toLowerCase())
    const matchWard = selectedWard === 'All' || h.ward === selectedWard
    return matchSearch && matchWard
  })

  const getStatusStyle = (bedStatus) => {
    if (bedStatus === 'Critical') return 'bg-red-100 text-red-700'
    if (bedStatus === 'Limited') return 'bg-orange-100 text-orange-700'
    return 'bg-green-100 text-green-700'
  }

  const getBarColor = (available, total) => {
    if (!total) return 'bg-gray-200'
    const pct = available / total
    if (pct < 0.1) return 'bg-red-500'
    if (pct < 0.3) return 'bg-orange-400'
    return 'bg-green-500'
  }

  const getBarWidth = (available, total) => {
    if (!total) return '0%'
    return `${Math.round((available / total) * 100)}%`
  }

  return (
    <CitizenLayout>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-800'>
            Bed Availability
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            Live resource status across all Solapur hospitals
          </p>
        </div>
        {lastUpdated && (
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 bg-green-500 rounded-full
                            animate-pulse' />
            <p className='text-xs text-gray-400'>
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Search + Filter */}
      <div className='flex gap-3 mb-6'>
        <div className='flex-1 relative'>
          <span className='absolute left-3 top-2.5 text-gray-400'>🔍</span>
          <input
            type='text'
            placeholder='Search hospital...'
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
        <InlineLoader message='Loading bed availability...' />
      ) : (
        <div className='grid grid-cols-2 gap-4'>
          {filtered.length === 0 ? (
            <div className='col-span-2 bg-white rounded-xl border
                            border-gray-200 p-8 text-center'>
              <p className='text-gray-400 text-sm'>No hospitals found</p>
            </div>
          ) : (
            filtered.map((h, i) => (
              <div
                key={i}
                className='bg-white rounded-xl border border-gray-200
                           shadow-sm p-5'
              >
                {/* Header */}
                <div className='flex items-start justify-between mb-4'>
                  <div>
                    <p className='font-semibold text-gray-800 text-sm'>
                      {h.hospitalName}
                    </p>
                    <p className='text-xs text-gray-400 mt-0.5'>
                      {h.ward}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full
                                   font-medium
                                   ${getStatusStyle(h.bedStatus)}`}>
                    {h.bedStatus === 'Critical' ? 'CRITICAL'
                      : h.bedStatus === 'Limited' ? 'LIMITED'
                      : 'NORMAL'}
                  </span>
                </div>

                {/* Resources */}
                <div className='flex flex-col gap-3'>
                  {/* Beds */}
                  <div>
                    <div className='flex justify-between mb-1'>
                      <span className='text-xs text-gray-500'>
                        🛏️ General Beds
                      </span>
                      <span className='text-xs font-semibold text-gray-700'>
                        {h.availableBeds}/{h.totalBeds} available
                      </span>
                    </div>
                    <div className='w-full bg-gray-100 rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full transition-all
                                   ${getBarColor(h.availableBeds, h.totalBeds)}`}
                        style={{ width: getBarWidth(h.availableBeds, h.totalBeds) }}
                      />
                    </div>
                  </div>

                  {/* ICU */}
                  <div>
                    <div className='flex justify-between mb-1'>
                      <span className='text-xs text-gray-500'>🏥 ICU</span>
                      <span className='text-xs font-semibold text-gray-700'>
                        {h.icuAvailable}/{h.icuTotal} available
                      </span>
                    </div>
                    <div className='w-full bg-gray-100 rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full transition-all
                                   ${getBarColor(h.icuAvailable, h.icuTotal)}`}
                        style={{ width: getBarWidth(h.icuAvailable, h.icuTotal) }}
                      />
                    </div>
                  </div>

                  {/* Ventilators */}
                  <div>
                    <div className='flex justify-between mb-1'>
                      <span className='text-xs text-gray-500'>
                        💨 Ventilators
                      </span>
                      <span className='text-xs font-semibold text-gray-700'>
                        {h.ventilatorsAvailable}/{h.ventilatorsTotal} available
                      </span>
                    </div>
                    <div className='w-full bg-gray-100 rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full transition-all
                                   ${getBarColor(
                                     h.ventilatorsAvailable,
                                     h.ventilatorsTotal
                                   )}`}
                        style={{
                          width: getBarWidth(
                            h.ventilatorsAvailable,
                            h.ventilatorsTotal
                          )
                        }}
                      />
                    </div>
                  </div>

                  {/* Oxygen */}
                  <div>
                    <div className='flex justify-between mb-1'>
                      <span className='text-xs text-gray-500'>
                        💧 Oxygen
                      </span>
                      <span className='text-xs font-semibold text-gray-700'>
                        {h.oxygenAvailable}/{h.oxygenTotal} units ·{' '}
                        {h.oxygenStatus}
                      </span>
                    </div>
                    <div className='w-full bg-gray-100 rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full transition-all
                                   ${getBarColor(
                                     h.oxygenAvailable,
                                     h.oxygenTotal
                                   )}`}
                        style={{
                          width: getBarWidth(
                            h.oxygenAvailable,
                            h.oxygenTotal
                          )
                        }}
                      />
                    </div>
                  </div>

                  {/* Medicine */}
                  <div>
                    <div className='flex justify-between mb-1'>
                      <span className='text-xs text-gray-500'>
                        💊 Medicine Stock
                      </span>
                      <span className='text-xs font-semibold text-gray-700'>
                        {h.medicineStockPercentage}%
                      </span>
                    </div>
                    <div className='w-full bg-gray-100 rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full transition-all
                                   ${h.medicineStockPercentage < 20
                                     ? 'bg-red-500'
                                     : h.medicineStockPercentage < 50
                                     ? 'bg-orange-400'
                                     : 'bg-green-500'}`}
                        style={{ width: `${h.medicineStockPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {h.lastUpdated && (
                  <p className='text-xs text-gray-400 mt-3'>
                    Last updated:{' '}
                    {new Date(h.lastUpdated).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </CitizenLayout>
  )
}

export default BedAvailability
