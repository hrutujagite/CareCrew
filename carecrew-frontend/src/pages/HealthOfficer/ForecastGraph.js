import React, { useEffect, useState, useCallback } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'
import { InlineLoader } from '../../components/shared/Loader'

// ─── Risk badge config ─────────────────────────────────────────────────────
const RISK_CONFIG = {
  Critical: {
    bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300',
    dot: 'bg-red-500', barColor: '#ef4444', label: '🔴 Critical'
  },
  High: {
    bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300',
    dot: 'bg-orange-500', barColor: '#f97316', label: '🟠 High Risk'
  },
  Moderate: {
    bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300',
    dot: 'bg-yellow-500', barColor: '#eab308', label: '🟡 Moderate'
  },
  Low: {
    bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300',
    dot: 'bg-green-500', barColor: '#22c55e', label: '🟢 Low Risk'
  }
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  const actual    = payload.find(p => p.dataKey === 'actual')
  const predicted = payload.find(p => p.dataKey === 'predicted')
  const upper     = payload.find(p => p.dataKey === 'upper')
  const lower     = payload.find(p => p.dataKey === 'lower')

  return (
    <div className='bg-white border border-gray-200 rounded-xl p-3 shadow-lg min-w-[160px]'>
      <p className='text-xs font-bold text-gray-600 mb-2'>{label}</p>
      {actual?.value != null && (
        <p className='text-xs text-blue-600 font-semibold'>
          Actual: <span className='font-bold'>{actual.value} cases</span>
        </p>
      )}
      {predicted?.value != null && (
        <p className='text-xs text-red-500 font-semibold'>
          Predicted: <span className='font-bold'>{predicted.value} cases</span>
        </p>
      )}
      {upper?.value != null && lower?.value != null && (
        <p className='text-xs text-gray-400 mt-1'>
          Range: {lower.value} – {upper.value}
        </p>
      )}
      {predicted?.value != null && (
        <p className='text-[10px] text-gray-400 mt-1 italic'>Forecast zone</p>
      )}
    </div>
  )
}

// ─── Risk Score Bar ────────────────────────────────────────────────────────
const RiskScoreBar = ({ score, level }) => {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.Low
  return (
    <div className='flex items-center gap-3'>
      <div className='flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden'>
        <div
          className='h-2.5 rounded-full transition-all duration-700'
          style={{ width: `${score}%`, backgroundColor: cfg.barColor }}
        />
      </div>
      <span className='text-xs font-bold text-gray-600 w-8 text-right'>{score}</span>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
const ForecastGraph = () => {
  const { token } = useAuth()
  const [wards, setWards]               = useState([])
  const [selectedWard, setSelectedWard] = useState('')
  const [chartData, setChartData]       = useState([])
  const [risk, setRisk]                 = useState(null)
  const [insight, setInsight]           = useState(null)
  const [loading, setLoading]           = useState(true)
  const [wardsLoading, setWardsLoading] = useState(true)
  const [error, setError]               = useState('')

  // ── Fetch ward list from DB ──────────────────────────────────────────────
  useEffect(() => {
    const fetchWards = async () => {
      try {
        const res = await axios.get(
          'https://carecrew-1.onrender.com/api/wards',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const wardNames = (res.data.wards || []).map(w => w.wardName)
        setWards(wardNames)
        if (wardNames.length > 0) setSelectedWard(wardNames[0])
      } catch {
        // Fallback to hardcoded if fetch fails
        const fallback = ['Bhavani Peth', 'North Solapur', 'Laxmi Peth', 'Murarji Peth', 'Kegaon']
        setWards(fallback)
        setSelectedWard(fallback[0])
      } finally {
        setWardsLoading(false)
      }
    }
    fetchWards()
  }, [token])

  // ── Fetch forecast for selected ward ────────────────────────────────────
  const fetchForecast = useCallback(async () => {
    if (!selectedWard) return
    try {
      setLoading(true)
      setError('')

      const res = await axios.get(
        `https://carecrew-1.onrender.com/api/forecast/${encodeURIComponent(selectedWard)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const { actual, predicted, risk: riskData, insight: insightData } = res.data

      // Build combined chart array
      // Actual days: have actual value, no predicted/band
      // Predicted days: no actual, have predicted + upper + lower
      const combined = []

      actual.forEach(d => {
        combined.push({
          date: formatDate(d.date),
          actual: d.cases,
          predicted: null,
          upper: null,
          lower: null
        })
      })

      // Connect lines — last actual point also starts the predicted line
      const lastActual = actual[actual.length - 1]

      predicted.forEach((d, i) => {
        combined.push({
          date: formatDate(d.date),
          actual: i === 0 ? lastActual.cases : null, // bridge point
          predicted: d.cases,
          upper: d.upper,
          lower: d.lower
        })
      })

      setChartData(combined)
      setRisk(riskData)
      setInsight(insightData)
    } catch {
      setError('Failed to load forecast. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token, selectedWard])

  useEffect(() => {
    if (selectedWard) fetchForecast()
  }, [fetchForecast, selectedWard])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  // Outbreak threshold = 1.5× average of last 7 actual days
  const outbreakThreshold = (() => {
    const actualPoints = chartData.filter(d => d.actual != null)
    if (actualPoints.length < 7) return null
    const last7 = actualPoints.slice(-7).map(d => d.actual)
    const avg = last7.reduce((s, v) => s + v, 0) / last7.length
    return Math.round(avg * 1.5)
  })()

  // Insight sentence
  const buildInsightText = () => {
    if (!insight || !risk) return null
    const { weekChange, topDisease, last7Total } = insight
    const dir = weekChange > 0 ? `up ${weekChange}%` : weekChange < 0 ? `down ${Math.abs(weekChange)}%` : 'unchanged'
    const disease = topDisease ? ` driven mainly by ${topDisease}` : ''
    return `${selectedWard} recorded ${last7Total} cases this week (${dir} vs last week)${disease}. ${risk.message}.`
  }

  const riskCfg = risk ? (RISK_CONFIG[risk.level] || RISK_CONFIG.Low) : null

  if (wardsLoading) return <InlineLoader message="Loading wards..." />

  return (
    <div className='flex flex-col gap-5'>

      {/* ── Header row: ward selector + risk badge ── */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <label className='text-sm font-semibold text-gray-600'>Ward:</label>
          <select
            value={selectedWard}
            onChange={e => setSelectedWard(e.target.value)}
            className='px-3 py-1.5 border border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-400
                       bg-white text-gray-800 font-medium'
          >
            {wards.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <span className='text-xs text-gray-400 hidden sm:inline'>
            14 days actual · 7 days forecast
          </span>
        </div>

        {/* Risk badge */}
        {riskCfg && risk && !loading && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${riskCfg.bg} ${riskCfg.text} ${riskCfg.border}`}>
            <span className={`w-2 h-2 rounded-full ${riskCfg.dot} ${risk.level === 'Critical' ? 'animate-pulse' : ''}`} />
            {riskCfg.label}
            <span className='font-normal opacity-70 ml-1'>· Score {risk.score}/100</span>
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      {loading ? (
        <InlineLoader message="Running forecast model..." />
      ) : error ? (
        <div className='flex flex-col items-center justify-center h-48 bg-red-50 rounded-xl border border-red-200'>
          <p className='text-sm text-red-500 font-medium'>{error}</p>
          <button
            onClick={fetchForecast}
            className='mt-3 text-xs text-red-600 underline font-semibold'
          >
            Retry
          </button>
        </div>
      ) : (
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='#F1F5F9' vertical={false} />
              <XAxis
                dataKey='date'
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                formatter={(value) => {
                  if (value === 'upper' || value === 'lower') return null
                  if (value === 'actual') return 'Actual Cases'
                  if (value === 'predicted') return 'Predicted Cases'
                  return value
                }}
              />

              {/* Confidence band — shaded area between upper and lower */}
              <Area
                type='monotone'
                dataKey='upper'
                stroke='none'
                fill='#FEE2E2'
                fillOpacity={0.6}
                legendType='none'
                connectNulls={false}
                name='upper'
              />
              <Area
                type='monotone'
                dataKey='lower'
                stroke='none'
                fill='#ffffff'
                fillOpacity={1}
                legendType='none'
                connectNulls={false}
                name='lower'
              />

              {/* Outbreak threshold reference line */}
              {outbreakThreshold && (
                <ReferenceLine
                  y={outbreakThreshold}
                  stroke='#F97316'
                  strokeDasharray='6 3'
                  strokeWidth={1.5}
                  label={{
                    value: `Outbreak threshold (${outbreakThreshold})`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#F97316',
                    fontWeight: 600
                  }}
                />
              )}

              {/* Actual cases line */}
              <Line
                type='monotone'
                dataKey='actual'
                name='actual'
                stroke='#1D6AE5'
                strokeWidth={2.5}
                dot={{ fill: '#1D6AE5', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />

              {/* Predicted cases line — dashed */}
              <Line
                type='monotone'
                dataKey='predicted'
                name='predicted'
                stroke='#DC2626'
                strokeWidth={2}
                strokeDasharray='6 4'
                dot={{ fill: '#DC2626', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Risk score bar + insight ── */}
      {!loading && !error && risk && (
        <div className='flex flex-col gap-3'>

          {/* Risk score bar */}
          <div className='bg-gray-50 rounded-xl border border-gray-100 p-4 flex flex-col gap-2'>
            <div className='flex items-center justify-between mb-1'>
              <span className='text-xs font-bold text-gray-500 uppercase tracking-wider'>
                Outbreak Risk Score
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskCfg?.bg} ${riskCfg?.text}`}>
                {risk.level}
              </span>
            </div>
            <RiskScoreBar score={risk.score} level={risk.level} />
            <p className='text-xs text-gray-500 mt-1'>{risk.message}</p>
          </div>

          {/* Insight sentence */}
          {insight && (
            <div className={`rounded-xl border px-4 py-3 text-sm font-medium leading-relaxed ${
              risk.level === 'Critical' ? 'bg-red-50 border-red-200 text-red-800' :
              risk.level === 'High'     ? 'bg-orange-50 border-orange-200 text-orange-800' :
              risk.level === 'Moderate' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                          'bg-green-50 border-green-200 text-green-800'
            }`}>
              {buildInsightText()}
            </div>
          )}

          {/* Week comparison mini stats */}
          {insight && (
            <div className='grid grid-cols-3 gap-3'>
              <div className='bg-white border border-gray-100 rounded-xl p-3 text-center'>
                <p className='text-[10px] text-gray-400 uppercase font-semibold mb-1'>This Week</p>
                <p className='text-2xl font-black text-gray-800'>{insight.last7Total}</p>
                <p className='text-[10px] text-gray-400'>cases</p>
              </div>
              <div className='bg-white border border-gray-100 rounded-xl p-3 text-center'>
                <p className='text-[10px] text-gray-400 uppercase font-semibold mb-1'>Last Week</p>
                <p className='text-2xl font-black text-gray-800'>{insight.prev7Total}</p>
                <p className='text-[10px] text-gray-400'>cases</p>
              </div>
              <div className='bg-white border border-gray-100 rounded-xl p-3 text-center'>
                <p className='text-[10px] text-gray-400 uppercase font-semibold mb-1'>Change</p>
                <p className={`text-2xl font-black ${
                  insight.weekChange > 0 ? 'text-red-600' :
                  insight.weekChange < 0 ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {insight.weekChange > 0 ? '+' : ''}{insight.weekChange}%
                </p>
                <p className='text-[10px] text-gray-400'>vs last week</p>
              </div>
            </div>
          )}

          {/* Top disease chip */}
          {insight?.topDisease && (
            <div className='flex items-center gap-2 text-xs text-gray-500'>
              <span className='font-semibold text-gray-700'>Primary disease this week:</span>
              <span className='px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold'>
                {insight.topDisease}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Footer note ── */}
      <p className='text-[10px] text-gray-400 leading-relaxed'>
        * Forecast uses <strong>Holt-Winters Double Exponential Smoothing</strong> (α=0.3, β=0.1) —
        the same family of algorithms used in WHO epidemic trend analysis.
        Shaded area = 95% confidence interval. Threshold line = 1.5× 7-day average.
        For reference and early warning only — not a substitute for clinical judgment.
      </p>

    </div>
  )
}

export default ForecastGraph
