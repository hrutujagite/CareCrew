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

  const lastSubmission = location.state?.lastSubmission || null
  const riskLevel = location.state?.riskLevel || 'Green'
  const zone = zoneConfig[riskLevel] || zoneConfig['Green']

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [wardRiskLevel, setWardRiskLevel] = useState(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    diseaseName: 'Dengue',
    customDiseaseName: '',
    newConfirmed: 0,
    newRecovered: 0,
    newDeaths: 0
  })

  const isOverdue = () => {
    if (!lastSubmission) return true
    const last = new Date(lastSubmission)
    const now = new Date()
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24))
    return diffDays >= zone.days
  }

  const overdue = isOverdue()

  const submittedToday = () => {
    if (!lastSubmission) return false
    return new Date(lastSubmission).toDateString() === new Date().toDateString()
  }

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/hospital/dashboard'), 3000)
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
    // When disease changes away from Other, clear the custom name
    if (name === 'diseaseName' && value !== 'Other') {
      setForm(prev => ({ ...prev, diseaseName: value, customDiseaseName: '' }))
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const getValidationError = () => {
    if (form.newConfirmed === '' || form.newRecovered === '' || form.newDeaths === '') {
      return 'Please fill out all the fields before submitting.'
    }
    if (form.newConfirmed < 0) return 'Confirmed cases cannot be negative.'
    if (form.newRecovered < 0) return 'Recovered count cannot be negative.'
    if (form.newDeaths < 0) return 'Deaths count cannot be negative.'
    if (form.diseaseName === 'Other' && !form.customDiseaseName.trim()) {
      return 'Please specify the disease name.'
    }
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
      const payload = {
        wardName: user?.ward,
        hospitalName: user?.hospitalName,
        diseaseName: form.diseaseName,
        newConfirmed: form.newConfirmed,
        newRecovered: form.newRecovered,
        newDeaths: form.newDeaths
      }
      // Only send customDiseaseName when Other is selected
      if (form.diseaseName === 'Other') {
        payload.customDiseaseName = form.customDiseaseName.trim()
      }

      const res = await axios.post(
        'https://carecrew-1.onrender.com/api/disease/submit',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (res.data?.wardRiskLevel) setWardRiskLevel(res.data.wardRiskLevel)
      setSuccess(true)

      setForm(prev => ({
        ...prev,
        customDiseaseName: '',
        newConfirmed: 0,
        newRecovered: 0,
        newDeaths: 0
      }))
    } catch (err) {
      setError(`Failed to submit: ${err.response?.data?.message || err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6">

        <div className="mb-6 flex items-center gap-4">
          <Button label="← Back" onClick={() => navigate('/hospital/dashboard')} variant="secondary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('submitReport')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {user?.hospitalName} · {t('wardName')}: {user?.ward}
            </p>
          </div>
        </div>

        <div className={`rounded-lg px-4 py-3 mb-4 ${zone.bg}`}>
          <span className={`text-sm font-medium ${zone.color}`}>{zone.label}</span>
          {lastSubmission && (
            <span className="text-xs text-gray-400 ml-3">
              Last submitted:{' '}
              {new Date(lastSubmission).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </span>
          )}
        </div>

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

        {submittedToday() && !success && (
          <div className="mb-4">
            <Alert type="success" message="Report already submitted today — you are up to date." />
          </div>
        )}

        {success && (
          <div className="mb-6 flex flex-col gap-2">
            <Alert type="success" message="Disease report submitted successfully. Redirecting to dashboard in 3 seconds..." />
            {wardRiskLevel && (wardRiskLevel === 'Red' || wardRiskLevel === 'Yellow') && (
              <Alert
                type={wardRiskLevel === 'Red' ? 'error' : 'warning'}
                message={`Ward risk level is currently ${wardRiskLevel}. Please monitor the situation closely.`}
              />
            )}
            {wardRiskLevel && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-sm text-gray-500">{t('riskLevel')}:</span>
                <Badge severity={wardRiskLevel === 'Red' ? 'red' : wardRiskLevel === 'Yellow' ? 'yellow' : 'green'} />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} />
          </div>
        )}

        <Card title="Disease Report">
          <div className="flex flex-col gap-6">

            <Input label={t('wardName')} name="wardName" value={user?.ward || ''} disabled />

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

            {/* Custom disease name — only shown when Other is selected */}
            {form.diseaseName === 'Other' && (
              <div>
                <Input
                  label="Disease Name (specify)"
                  name="customDiseaseName"
                  type="text"
                  value={form.customDiseaseName}
                  onChange={handleChange}
                  placeholder="e.g. Leptospirosis"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  This name will appear in analytics and ward reports instead of "Other".
                </p>
              </div>
            )}

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