import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { InlineLoader } from '../../components/shared/Loader'

const WARDS = [
  'Bhavani Peth',
  'North Solapur',
  'Laxmi Peth',
  'Murarji Peth',
  'Kegaon',
]

const ForecastGraph = () => {
  const { token } = useAuth()
  const [selectedWard, setSelectedWard] = useState('Bhavani Peth')
  const [forecastData, setForecastData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchForecast()
  }, [selectedWard])

  const fetchForecast = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await axios.get(
        `http://localhost:5000/api/forecast/${encodeURIComponent(selectedWard)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Combine actual and predicted into one array
      const actual = res.data.actual.map(d => ({
        date: d.date,
        actual: d.cases,
        predicted: null
      }))

      const predicted = res.data.predicted.map(d => ({
        date: d.date,
        actual: null,
        predicted: d.cases
      }))

      // Add last actual point as start of predicted line
      // so lines connect smoothly
      const lastActual = actual[actual.length - 1]
      predicted[0].actual = lastActual.actual

      setForecastData([...actual, ...predicted])
    } catch (err) {
      setError('Failed to load forecast data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return `${date.getDate()}/${date.getMonth() + 1}`
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white border border-gray-200 rounded-lg p-3 
                        shadow-sm'>
          <p className='text-xs font-semibold text-gray-600 mb-1'>
            {label}
          </p>
          {payload.map((entry, index) => (
            entry.value !== null && (
              <p key={index} className='text-xs' style={{ color: entry.color }}>
                {entry.name}: <strong>{entry.value} cases</strong>
              </p>
            )
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* Ward selector */}
      <div className='flex items-center gap-3'>
        <label className='text-sm font-medium text-gray-700'>
          Select Ward:
        </label>
        <select
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value)}
          className='px-3 py-1.5 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     bg-white text-gray-800'
        >
          {WARDS.map(ward => (
            <option key={ward} value={ward}>{ward}</option>
          ))}
        </select>
        <span className='text-xs text-gray-400'>
          Showing 14 days actual + 7 days forecast
        </span>
      </div>

      {/* Chart */}
      {loading ? (
        <InlineLoader message="Loading forecast..." />
      ) : error ? (
        <p className='text-sm text-red-500'>{error}</p>
      ) : (
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray='3 3' stroke='#F1F5F9' />
              <XAxis
                dataKey='date'
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              />
              <Line
                type='monotone'
                dataKey='actual'
                name='Actual Cases'
                stroke='#1D6AE5'
                strokeWidth={2}
                dot={{ fill: '#1D6AE5', r: 3 }}
                connectNulls={false}
              />
              <Line
                type='monotone'
                dataKey='predicted'
                name='Predicted Cases'
                stroke='#DC2626'
                strokeWidth={2}
                strokeDasharray='5 5'
                dot={{ fill: '#DC2626', r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Note */}
      <p className='text-xs text-gray-400'>
        * Prediction based on 3-day moving average trend analysis.
        For reference only.
      </p>
    </div>
  )
}

export default ForecastGraph