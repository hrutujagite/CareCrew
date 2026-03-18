import { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'

export default function EmergencyRouting() {
  const { token, user } = useAuth()
  const [hospital, setHospital] = useState(null)
  const [others, setOthers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/hospitals', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const wardHospitals = res.data
          .filter((h) => h.ward === user.ward)
          .sort((a, b) => b.availableBeds - a.availableBeds)

        if (wardHospitals.length === 0) {
          setError('No hospitals found in your ward.')
          return
        }

        setHospital(wardHospitals[0])
        setOthers(wardHospitals.slice(1))
      })
      .catch(() => setError('Failed to find emergency hospitals.'))
      .finally(() => setLoading(false))
  }, [token, user.ward])

  if (loading) return <Loader message="Locating nearest emergency hospital..." />

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div className="bg-red-600 text-white rounded-2xl px-8 py-5 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <h1 className="text-xl font-bold">Emergency Hospital Routing</h1>
              <p className="text-red-100 text-sm mt-0.5">
                Nearest available hospital in Ward: {user.ward}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Card>
            <p className="text-red-500 text-sm">{error}</p>
          </Card>
        )}

        {/* Primary Hospital */}
        {hospital && (
          <div className="bg-white border-2 border-red-400 rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Recommended
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-800">{hospital.name}</h2>

            {hospital.address && (
              <div className="flex items-start gap-2 text-gray-600 text-sm">
                <span className="mt-0.5">📍</span>
                <span>{hospital.address}</span>
              </div>
            )}

            {hospital.contact && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <span>📞</span>
                <a
                  href={`tel:${hospital.contact}`}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  {hospital.contact}
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Available Beds</p>
                <p className="text-3xl font-bold text-green-600">{hospital.availableBeds}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">ICU</p>
                <p className="text-2xl font-bold text-blue-600">
                  {hospital.icuAvailable ? '✅ Available' : '❌ Unavailable'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Other Hospitals */}
        {others.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Other Options in Your Ward</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {others.map((h, idx) => (
                <Card key={idx}>
                  <h3 className="text-gray-800 font-semibold text-sm mb-1">{h.name}</h3>
                  {h.address && (
                    <p className="text-gray-500 text-xs mb-2">📍 {h.address}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Available Beds</span>
                    <span className="font-bold text-gray-700">{h.availableBeds}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-400">ICU</span>
                    <span className="font-medium text-gray-700">
                      {h.icuAvailable ? '✅' : '❌'}
                    </span>
                  </div>
                  {h.contact && (
                    <div className="mt-2 text-xs">
                      <a href={`tel:${h.contact}`} className="text-blue-600 hover:underline">
                        📞 {h.contact}
                      </a>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
