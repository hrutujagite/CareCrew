import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'

function bedColor(beds) {
  if (beds > 10) return 'text-green-600'
  if (beds >= 5) return 'text-yellow-600'
  return 'text-red-600'
}

export default function HospitalFinder() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [hospitals, setHospitals] = useState([])
  const [wards, setWards] = useState([])
  const [selectedWard, setSelectedWard] = useState(user.ward)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/hospitals', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setHospitals(res.data)
        const uniqueWards = [...new Set(res.data.map((h) => h.ward))]
        setWards(uniqueWards)
      })
      .catch(() => setError('Failed to load hospitals. Please try again.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <Loader message="Finding hospitals near you..." />

  const filtered = hospitals.filter((h) => h.ward === selectedWard)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Hospital Finder</h1>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 font-medium">Filter by Ward:</label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {wards.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <Card>
            <p className="text-red-500 text-sm">{error}</p>
          </Card>
        )}

        {!error && filtered.length === 0 && (
          <Card>
            <p className="text-gray-500 text-sm">No hospitals found for this ward.</p>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((hospital, idx) => (
            <Card key={idx}>
              <h2 className="text-gray-800 font-semibold text-base mb-1">
                {hospital.name}
              </h2>
              <p className="text-gray-500 text-sm mb-3">Ward: {hospital.ward}</p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Available Beds</span>
                  <span className={`font-bold ${bedColor(hospital.availableBeds)}`}>
                    {hospital.availableBeds}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ICU Available</span>
                  <span className="font-medium text-gray-700">
                    {hospital.icuAvailable ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Oxygen Level</span>
                  <span className="font-medium text-gray-700">
                    {hospital.oxygenLevel ?? 'N/A'}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() =>
                  navigate(`/citizen/book?hospital=${encodeURIComponent(hospital.name)}`)
                }
              >
                Book Appointment
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
