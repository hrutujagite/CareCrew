import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import { useAuth } from '../../context/AuthContext'

const DEPARTMENTS = ['General', 'Paediatrics', 'Orthopaedics', 'Gynaecology', 'Emergency']

export default function BookAppointment() {
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()
  const prefillHospital = searchParams.get('hospital') || ''

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    hospitalName: prefillHospital,
    department: DEPARTMENTS[0],
    preferredDate: today,
    citizenName: user.name,
    contact: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async () => {
    setError(null)
    if (!form.hospitalName || !form.contact || !form.preferredDate) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post(
        'http://localhost:5000/api/appointments/book',
        {
          hospitalName: form.hospitalName,
          ward: user.ward,
          department: form.department,
          preferredDate: form.preferredDate,
          citizenName: form.citizenName,
          contact: form.contact,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setConfirmation(res.data.bookingReference)
    } catch {
      setError('Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (confirmation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Card>
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Appointment Booked Successfully!
              </h2>
              <p className="text-gray-500 text-sm mb-4">Your booking reference number is:</p>
              <div className="inline-block bg-blue-50 border border-blue-200 rounded-xl px-6 py-3">
                <span className="text-blue-700 font-bold text-lg tracking-widest">
                  {confirmation}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-4">
                Please save this reference number for your records.
              </p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Book an Appointment</h1>

        <Card>
          <div className="space-y-5 max-w-xl">

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hospital <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.hospitalName}
                onChange={handleChange('hospitalName')}
                placeholder="Enter hospital name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={form.department}
                onChange={handleChange('department')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                min={today}
                value={form.preferredDate}
                onChange={handleChange('preferredDate')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Citizen Name
              </label>
              <Input
                value={form.citizenName}
                onChange={handleChange('citizenName')}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                value={form.contact}
                onChange={handleChange('contact')}
                placeholder="e.g. 9876543210"
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Booking...' : 'Confirm Appointment'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
