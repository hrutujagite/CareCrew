import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import Badge from '../../components/shared/Badge'
import Alert from '../../components/shared/Alert'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'


// Risk zone config
const zoneConfig = {
  Red: {
    color: 'text-red-600',
    bg: 'bg-red-50 border border-red-200',
    label: '🔴 Red Zone — Daily reporting required',
    days: 1
  },
  Yellow: {
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border border-yellow-200',
    label: '🟡 Yellow Zone — Report every 2 days',
    days: 2
  },
  Green: {
    color: 'text-green-600',
    bg: 'bg-green-50 border border-green-200',
    label: '🟢 Green Zone — Weekly reporting',
    days: 7
  }
}

const DiseaseForm = () => {
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  // Read state passed from HospitalHome
  const lastSubmission = location.state?.lastSubmission || null
  const riskLevel = location.state?.riskLevel || 'Green'
  const zone = zoneConfig[riskLevel] || zoneConfig['Green']

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [wardRiskLevel, setWardRiskLevel] = useState(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    diseaseName: 'Dengue',
    newConfirmed: 0,
    newRecovered: 0,
    newDeaths: 0
  })

  // Check if overdue based on risk zone
  const isOverdue = () => {
    if (!lastSubmission) return true
    const last = new Date(lastSubmission)
    const now = new Date()
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24))
    return diffDays >= zone.days
  }

  const overdue = isOverdue()

  // Check if submitted today already
  const submittedToday = () => {
    if (!lastSubmission) return false
    return new Date(lastSubmission).toDateString() === new Date().toDateString()
  }

  // Auto-redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/hospital/dashboard')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    const numericFields = ['newConfirmed', 'newRecovered', 'newDeaths']
    if (numericFields.includes(name)) {
      if (value !== '' && !/^\d+$/.test(value)) return
      setForm(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }))
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // Validation
  const getValidationError = () => {
    if (form.newConfirmed === '' || form.newRecovered === '' || form.newDeaths === '') {
      return 'Please fill out all the fields before submitting.'
    }
    if (form.newConfirmed < 0) return 'Confirmed cases cannot be negative.'
    if (form.newRecovered < 0) return 'Recovered count cannot be negative.'
    if (form.newDeaths < 0) return 'Deaths count cannot be negative.'
    return null
  }

  const validationError = getValidationError()


  const handleSubmit = async () => {
    if (validationError) return
    setLoading(true)
    setError('')
    setSuccess(false)
    setWardRiskLevel(null)

    try {
      const res = await axios.post(
        'https://carecrew-1.onrender.com/api/disease/submit',
        {
          wardName: user?.ward,
          hospitalName: user?.hospitalName,
          diseaseName: form.diseaseName,
          newConfirmed: form.newConfirmed,
          newRecovered: form.newRecovered,
          newDeaths: form.newDeaths
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (res.data?.wardRiskLevel) {
        setWardRiskLevel(res.data.wardRiskLevel)
      }
      setSuccess(true)

      // Reset counts only
      setForm(prev => ({
        ...prev,
        newConfirmed: 0,
        newRecovered: 0,
        newDeaths: 0
      }))
    } catch (err) {
      console.error('Submission error:', err.response?.data || err.message)
      setError(`Failed to submit: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

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
              {t('submitReport')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {user?.hospitalName} · {t('wardName')}: {user?.ward}
            </p>
          </div>
        </div>

        {/* Risk zone banner */}
        <div className={`rounded-lg px-4 py-3 mb-4 ${zone.bg}`}>
          <span className={`text-sm font-medium ${zone.color}`}>
            {zone.label}
          </span>
          {lastSubmission && (
            <span className="text-xs text-gray-400 ml-3">
              Last submitted:{' '}
              {new Date(lastSubmission).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </span>
          )}
        </div>

        {/* Overdue alert */}
        {overdue && !success && (
          <div className="mb-4">
            <Alert
              type="error"
              message={
                lastSubmission
                  ? `Overdue — last report was on ${new Date(lastSubmission).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Please submit immediately.`
                  : 'No report submitted yet — please submit your first report.'
              }
            />
          </div>
        )}

        {/* Submitted today notice */}
        {submittedToday() && !success && (
          <div className="mb-4">
            <Alert
              type="success"
              message="Report already submitted today — you are up to date."
            />
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="mb-6 flex flex-col gap-2">
            <Alert
              type="success"
              message="Disease report submitted successfully. Redirecting to dashboard in 3 seconds..."
            />
            {wardRiskLevel && (wardRiskLevel === 'Red' || wardRiskLevel === 'Yellow') && (
              <Alert
                type={wardRiskLevel === 'Red' ? 'error' : 'warning'}
                message={`Ward risk level is currently ${wardRiskLevel}. Please monitor the situation closely.`}
              />
            )}
            {wardRiskLevel && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-sm text-gray-500">{t('riskLevel')}:</span>
                <Badge severity={
                  wardRiskLevel === 'Red' ? 'red' :
                  wardRiskLevel === 'Yellow' ? 'yellow' : 'green'
                } />
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} />
          </div>
        )}

        <Card title="Disease Report">
          <div className="flex flex-col gap-6">

            {/* Ward — pre-filled and disabled */}
            <Input
              label={t('wardName')}
              name="wardName"
              value={user?.ward || ''}
              disabled
            />

            {/* Disease */}
            <div className="grid grid-cols-1 gap-4">
              <Input
                label={t('disease')}
                type="select"
                name="diseaseName"
                value={form.diseaseName}
                onChange={handleChange}
                options={['Dengue', 'Malaria', 'TB', 'COVID-19', 'Cholera', 'Typhoid', 'Other']}
                required
              />
            </div>

            {/* Direct text inputs (configured for regex digits only) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="New Confirmed Cases"
                name="newConfirmed"
                type="text"
                value={form.newConfirmed}
                onChange={handleChange}
                placeholder="0"
                required
              />
              <Input
                label="Recovered Today"
                name="newRecovered"
                type="text"
                value={form.newRecovered}
                onChange={handleChange}
                placeholder="0"
                required
              />
              <Input
                label="Deaths Today"
                name="newDeaths"
                type="text"
                value={form.newDeaths}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </div>

            {/* Validation error */}
            {validationError && (
              <p className="text-red-600 text-sm">{validationError}</p>
            )}


            <Button
              label={loading ? 'Submitting...' : t('submitReport')}
              onClick={handleSubmit}
              variant="primary"
              disabled={loading || success || !!validationError}
              fullWidth
            />

          </div>
        </Card>

      </div>
    </div>
  )
}

export default DiseaseForm