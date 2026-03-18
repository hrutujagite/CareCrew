import { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Badge from '../../components/shared/Badge'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'

const ADVICE = {
  Dengue: 'Avoid stagnant water and use mosquito nets',
  Malaria: 'Use mosquito repellent and seek treatment early',
  Cholera: 'Drink only boiled water',
  Shortage: 'Visit alternate hospitals if possible',
}

const SEVERITY_COLOR = {
  High: 'red',
  Medium: 'yellow',
  Low: 'green',
}

const TYPE_ICON = {
  Outbreak: '🦠',
  Shortage: '🏥',
  Dengue: '🦟',
  Malaria: '🦟',
  Cholera: '💧',
}

export default function Alerts() {
  const { token, user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/dashboard/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const wardAlerts = res.data.filter((a) => a.ward === user.ward)
        setAlerts(wardAlerts)
      })
      .catch(() => setError('Failed to load alerts.'))
      .finally(() => setLoading(false))
  }, [token, user.ward])

  if (loading) return <Loader message="Loading health alerts..." />

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-800">Health Alerts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Showing alerts for Ward: <span className="font-medium text-gray-700">{user.ward}</span>
          </p>
        </div>

        {error && (
          <Card>
            <p className="text-red-500 text-sm">{error}</p>
          </Card>
        )}

        {!error && alerts.length === 0 && (
          <Card>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-500 text-sm">No active alerts for your ward. Stay safe!</p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {alerts.map((alert, idx) => (
            <Card key={idx}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{TYPE_ICON[alert.type] || '⚠️'}</span>
                  <span className="text-gray-800 font-semibold text-sm">{alert.type}</span>
                </div>
                <Badge color={SEVERITY_COLOR[alert.severity] || 'yellow'}>
                  {alert.severity}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span>📅</span>
                  <span>
                    {alert.triggeredAt
                      ? new Date(alert.triggeredAt).toLocaleDateString('en-IN')
                      : 'Date not available'}
                  </span>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <p className="text-blue-700 text-xs font-medium">💡 Health Advice</p>
                  <p className="text-blue-600 text-sm mt-0.5">
                    {ADVICE[alert.type] || ADVICE['Shortage']}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
