import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
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

export default function CitizenHome() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
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
      .catch(() => setError('Failed to load alerts. Please try again.'))
      .finally(() => setLoading(false))
  }, [token, user.ward])

  if (loading) return <Loader message="Loading your dashboard..." />

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

        {/* Welcome Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, {user.name} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Ward: <span className="font-medium text-gray-700">{user.ward}</span>
          </p>
        </div>

        {/* Active Ward Alerts */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Active Ward Alerts
          </h2>
          {error && (
            <Card>
              <p className="text-red-500 text-sm">{error}</p>
            </Card>
          )}
          {!error && alerts.length === 0 && (
            <Card>
              <p className="text-gray-500 text-sm">No active alerts for your ward.</p>
            </Card>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert, idx) => (
              <Card key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-800 font-semibold text-sm">
                    {alert.type}
                  </span>
                  <Badge color={SEVERITY_COLOR[alert.severity] || 'yellow'}>
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-gray-500 text-sm">
                  {ADVICE[alert.type] || ADVICE['Shortage']}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="primary"
              onClick={() => navigate('/citizen/hospitals')}
            >
              🏥 Find Hospital
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/citizen/book')}
            >
              📅 Book Appointment
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/citizen/appointments')}
            >
              📋 My Appointments
            </Button>
          </div>
        </section>

        {/* Emergency */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Emergency
          </h2>
          <Button
            variant="danger"
            className="w-full py-4 text-lg font-bold rounded-xl"
            onClick={() => navigate('/citizen/emergency')}
          >
            🚨 Find Emergency Hospital
          </Button>
        </section>

      </div>
    </div>
  )
}
