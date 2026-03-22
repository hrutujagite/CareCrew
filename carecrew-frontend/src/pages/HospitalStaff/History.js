import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Table from '../../components/shared/Table'
import Badge from '../../components/shared/Badge'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

const History = () => {
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [diseaseHistory, setDiseaseHistory] = useState([])
  const [capacityHistory, setCapacityHistory] = useState([])
  const [activeTab, setActiveTab] = useState('disease')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const headers = { Authorization: `Bearer ${token}` }

      const [diseaseRes, capacityRes] = await Promise.all([
        axios.get('https://carecrew-1.onrender.com/api/disease/history', { headers }),
        axios.get('https://carecrew-1.onrender.com/api/capacity/history', { headers })
      ])

      if (diseaseRes.data?.reports) setDiseaseHistory(diseaseRes.data.reports)
      if (capacityRes.data?.history) setCapacityHistory(capacityRes.data.history)
    } catch (err) {
      setError('Failed to load history data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Derive status label from numeric oxygen fields
  const getOxygenStatus = (row) => {
    if (!row.oxygenTotal || row.oxygenTotal === 0) return 'Unknown'
    const pct = (row.oxygenAvailable / row.oxygenTotal) * 100
    if (pct > 50) return 'Full'
    if (pct > 20) return 'Medium'
    if (pct > 0) return 'Low'
    return 'Critical'
  }

  const getMedicineStatus = (row) => {
    const pct = row.medicineStockPercentage ?? 100
    if (pct > 50) return 'Full'
    if (pct > 20) return 'Medium'
    if (pct > 0) return 'Low'
    return 'Critical'
  }

  // Stock level badge color helper — must match Badge component keys (capitalized)
  const getStockSeverity = (status) => {
    if (status === 'Critical') return 'Red'
    if (status === 'Low') return 'Yellow'
    return 'Green'
  }

  // Disease history table columns
  const diseaseColumns = [
    {
      header: 'Date',
      render: (row) => (
        <span className="text-sm text-gray-600">{formatDate(row.createdAt)}</span>
      )
    },
    {
      header: t('disease'),
      render: (row) => (
        <span className="text-sm font-medium text-gray-800">{row.diseaseName}</span>
      )
    },
    {
      header: 'Confirmed',
      render: (row) => (
        <span className="text-sm font-semibold text-gray-800">
          {row.newConfirmed ?? '—'}
        </span>
      )
    },
    {
      header: 'Recovered',
      render: (row) => (
        <span className="text-sm text-green-600">
          {row.newRecovered ?? '—'}
        </span>
      )
    },
    {
      header: 'Deaths',
      render: (row) => (
        <span className={`text-sm font-medium ${
          row.newDeaths > 0 ? 'text-red-600' : 'text-gray-400'
        }`}>
          {row.newDeaths ?? '—'}
        </span>
      )
    },
    {
      header: 'Net Change',
      render: (row) => {
        const net = (row.newConfirmed ?? 0) - (row.newRecovered ?? 0) - (row.newDeaths ?? 0)
        return (
          <span className={`text-sm font-semibold ${
            net > 0 ? 'text-red-600' :
            net < 0 ? 'text-green-600' :
            'text-gray-400'
          }`}>
            {net > 0 ? `+${net}` : net === 0 ? '0' : net}
          </span>
        )
      }
    }
  ]

  // Capacity history table columns — keys match HospitalCapacity model exactly
  const capacityColumns = [
    {
      header: 'Date & Time',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.lastUpdated
            ? new Date(row.lastUpdated).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })
            : '—'}
        </span>
      )
    },
    {
      header: t('beds'),
      render: (row) => {
        const pct = row.totalBeds > 0 ? Math.round((row.availableBeds / row.totalBeds) * 100) : 0
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-800">
              <span className="font-semibold">{row.availableBeds}</span>
              <span className="text-gray-400"> / {row.totalBeds}</span>
            </span>
            <span className={`text-xs ${
              pct <= 10 ? 'text-red-500' : pct <= 30 ? 'text-orange-500' : 'text-green-500'
            }`}>
              {pct}% available
            </span>
          </div>
        )
      }
    },
    {
      header: t('icu'),
      render: (row) => {
        const pct = row.icuTotal > 0 ? Math.round((row.icuAvailable / row.icuTotal) * 100) : 0
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-800">
              <span className="font-semibold">{row.icuAvailable}</span>
              <span className="text-gray-400"> / {row.icuTotal}</span>
            </span>
            <span className={`text-xs ${
              pct === 0 ? 'text-red-500' : pct <= 20 ? 'text-orange-500' : 'text-green-500'
            }`}>
              {pct}% available
            </span>
          </div>
        )
      }
    },
    {
      header: 'Oxygen Cylinders',
      render: (row) => {
        const status = getOxygenStatus(row)
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-800">
              <span className="font-semibold">{row.oxygenAvailable ?? 0}</span>
              <span className="text-gray-400"> / {row.oxygenTotal ?? 0}</span>
            </span>
            <Badge severity={getStockSeverity(status)} text={status} />
          </div>
        )
      }
    },
    {
      header: 'Medicine Stock',
      render: (row) => {
        const pct = row.medicineStockPercentage ?? 100
        const status = getMedicineStatus(row)
        return (
          <div className="flex flex-col">
            <span className={`text-sm font-semibold ${
              pct < 20 ? 'text-red-600' : pct < 50 ? 'text-orange-600' : 'text-gray-800'
            }`}>
              {pct}%
            </span>
            <Badge severity={getStockSeverity(status)} text={status} />
          </div>
        )
      }
    }
  ]

  if (loading) return <Loader message="Loading history..." />

  if (error) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Card>
          <p className="text-red-500 text-sm">{error}</p>
          <div className="mt-4">
            <Button label="Retry" onClick={fetchData} variant="secondary" />
          </div>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Page header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            label="← Back"
            onClick={() => navigate('/hospital/dashboard')}
            variant="secondary"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {t('history')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {user?.hospitalName} · {t('wardName')}: {user?.ward}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('disease')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'disease'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Disease Reports
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'disease'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {diseaseHistory.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('capacity')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'capacity'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Capacity Updates
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'capacity'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {capacityHistory.length}
            </span>
          </button>
        </div>

        {/* Disease history tab */}
        {activeTab === 'disease' && (
          <Card title="Disease Reports">
            <Table
              columns={diseaseColumns}
              data={diseaseHistory}
              emptyMessage="No disease reports submitted yet"
            />
          </Card>
        )}

        {/* Capacity history tab */}
        {activeTab === 'capacity' && (
          <Card title="Capacity Updates">
            <Table
              columns={capacityColumns}
              data={capacityHistory}
              emptyMessage="No capacity updates submitted yet"
            />
          </Card>
        )}

      </div>
    </div>
  )
}

export default History