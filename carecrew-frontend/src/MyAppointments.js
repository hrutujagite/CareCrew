import { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Badge from '../../components/shared/Badge'
import Button from '../../components/shared/Button'
import Table from '../../components/shared/Table'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'

const STATUS_COLOR = {
  Confirmed: 'green',
  Pending: 'yellow',
  Cancelled: 'red',
}

export default function MyAppointments() {
  const { token } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(null)

  const fetchAppointments = () => {
    setLoading(true)
    axios
      .get('http://localhost:5000/api/appointments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAppointments(res.data))
      .catch(() => setError('Failed to load appointments.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAppointments()
  }, [token])

  const handleCancel = async (id) => {
    setCancelling(id)
    try {
      await axios.patch(
        `http://localhost:5000/api/appointments/${id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: 'Cancelled' } : a))
      )
    } catch {
      alert('Failed to cancel appointment. Please try again.')
    } finally {
      setCancelling(null)
    }
  }

  if (loading) return <Loader message="Loading your appointments..." />

  const columns = [
    {
      header: 'Date',
      accessor: 'preferredDate',
      render: (val) => new Date(val).toLocaleDateString('en-IN'),
    },
    { header: 'Hospital', accessor: 'hospitalName' },
    { header: 'Department', accessor: 'department' },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => (
        <Badge color={STATUS_COLOR[val] || 'yellow'}>{val}</Badge>
      ),
    },
    {
      header: 'Action',
      accessor: '_id',
      render: (id, row) =>
        row.status !== 'Cancelled' ? (
          <Button
            variant="danger"
            size="sm"
            disabled={cancelling === id}
            onClick={() => handleCancel(id)}
          >
            {cancelling === id ? 'Cancelling...' : 'Cancel'}
          </Button>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">My Appointments</h1>

        {error && (
          <Card>
            <p className="text-red-500 text-sm">{error}</p>
          </Card>
        )}

        {!error && appointments.length === 0 && (
          <Card>
            <p className="text-gray-500 text-sm">
              You have no appointments yet. Book one now!
            </p>
          </Card>
        )}

        {!error && appointments.length > 0 && (
          <Card>
            <Table columns={columns} data={appointments} />
          </Card>
        )}
      </div>
    </div>
  )
}
