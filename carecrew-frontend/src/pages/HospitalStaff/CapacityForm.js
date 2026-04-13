import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../../components/shared/Navbar'
import Card from '../../components/shared/Card'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import Alert from '../../components/shared/Alert'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'


const CapacityForm = () => {
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [prefilling, setPrefilling] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [previousSubmission, setPreviousSubmission] = useState(null)

  const [form, setForm] = useState({
    totalBeds: '',
    availableBeds: '',
    icuTotal: '',
    icuAvailable: '',
    emergencyBedsTotal: '',
    emergencyBedsAvailable: '',
    oxygenTotal: '',
    oxygenAvailable: '',
    medicineStockPercentage: ''
  })

  // ── Fetch latest capacity on mount to pre-fill ──────────────────────────────
  useEffect(() => {
    const fetchPrevious = async () => {
      try {
        const res = await axios.get(
          'https://carecrew-1.onrender.com/api/capacity/history',
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const history = res.data?.history || []
        if (history.length > 0) {
          const latest = history[0]
          setPreviousSubmission(latest)
          setForm({
            totalBeds: latest.totalBeds ?? '',
            availableBeds: latest.availableBeds ?? '',
            icuTotal: latest.icuTotal ?? '',
            icuAvailable: latest.icuAvailable ?? '',
            emergencyBedsTotal: latest.emergencyBedsTotal ?? '',
            emergencyBedsAvailable: latest.emergencyBedsAvailable ?? '',
            oxygenTotal: latest.oxygenTotal ?? '',
            oxygenAvailable: latest.oxygenAvailable ?? '',
            medicineStockPercentage: latest.medicineStockPercentage ?? ''
          })
        }
      } catch (_) {
        // No previous data — form stays blank, user fills from scratch
      } finally {
        setPrefilling(false)
      }
    }
    fetchPrevious()
  }, [token])

  // Auto-redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/hospital/dashboard'), 3000)
      return () => clearTimeout(timer)
    }
  }, [success, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    const numericFields = [
      'totalBeds', 'availableBeds',
      'icuTotal', 'icuAvailable',
      'emergencyBedsTotal', 'emergencyBedsAvailable',
      'oxygenTotal', 'oxygenAvailable',
      'medicineStockPercentage'
    ]
    if (numericFields.includes(name)) {
      if (value !== '' && !/^\d+$/.test(value)) return
      setForm(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }))
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const bedsInvalid = form.availableBeds !== '' && form.totalBeds !== '' && Number(form.availableBeds) > Number(form.totalBeds)
  const icuInvalid = form.icuAvailable !== '' && form.icuTotal !== '' && Number(form.icuAvailable) > Number(form.icuTotal)
  const emergencyBedsInvalid = form.emergencyBedsAvailable !== '' && form.emergencyBedsTotal !== '' && Number(form.emergencyBedsAvailable) > Number(form.emergencyBedsTotal)
  const oxygenInvalid = form.oxygenAvailable !== '' && form.oxygenTotal !== '' && Number(form.oxygenAvailable) > Number(form.oxygenTotal)
  const medicineInvalid = form.medicineStockPercentage !== '' && (Number(form.medicineStockPercentage) < 0 || Number(form.medicineStockPercentage) > 100)

  const anyInvalid = bedsInvalid || icuInvalid || emergencyBedsInvalid || oxygenInvalid || medicineInvalid

  // Live warning banners
  const oxygenPct = form.oxygenTotal > 0 ? (form.oxygenAvailable / form.oxygenTotal) : 1
  const oxygenCritical = form.oxygenTotal > 0 && oxygenPct < 0.2
  const medicineCritical = form.medicineStockPercentage !== '' && Number(form.medicineStockPercentage) < 20

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setSuccess(false)

    const requiredFields = [
      'totalBeds', 'availableBeds',
      'icuTotal', 'icuAvailable',
      'emergencyBedsTotal', 'emergencyBedsAvailable',
      'oxygenTotal', 'oxygenAvailable',
      'medicineStockPercentage'
    ]
    const hasEmpty = requiredFields.some(f => form[f] === '')
    if (hasEmpty) {
      setError('Please fill in all fields before submitting.')
      setLoading(false)
      return
    }
    if (anyInvalid) {
      setError('Please fix the highlighted validation errors before submitting.')
      setLoading(false)
      return
    }

    try {
      await axios.post(
        'https://carecrew-1.onrender.com/api/capacity/submit',
        { ...form, ward: user?.ward, hospitalName: user?.hospitalName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(true)
    } catch (err) {
      setError('Failed to update capacity data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (prefilling) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading previous capacity data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Page header */}
        <div className="mb-6 flex items-center gap-4">
          <Button label="← Back" onClick={() => navigate('/hospital/dashboard')} variant="secondary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Update Capacity</h1>
            <p className="text-sm text-gray-500 mt-1">
              {user?.hospitalName} · {t('wardName')}: {user?.ward}
            </p>
          </div>
        </div>

        {/* Pre-fill notice */}
        {previousSubmission && !success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
            📋 Fields pre-filled from your last submission on{' '}
            <strong>
              {new Date(previousSubmission.lastUpdated || previousSubmission.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </strong>.
            Update only the values that have changed.
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 flex flex-col gap-2">
            <Alert type="success" message="Capacity updated successfully. Redirecting to dashboard in 3 seconds..." />
            {(oxygenCritical || medicineCritical) && (
              <Alert type="error" message="Shortage alert has been sent to SMC Health Officer." />
            )}
          </div>
        )}

        {/* Error */}
        {error && <div className="mb-6"><Alert type="error" message={error} /></div>}

        {/* Live critical warnings */}
        {!success && (oxygenCritical || medicineCritical) && (
          <div className="mb-6 flex flex-col gap-2">
            {oxygenCritical && (
              <Alert type="error"
                message={`Oxygen is critically low (${Math.round(oxygenPct * 100)}% remaining). Submitting this will send a shortage alert to SMC Health Officer.`} />
            )}
            {medicineCritical && (
              <Alert type="error"
                message={`Medicine stock is critically low (${form.medicineStockPercentage}%). Submitting this will send a shortage alert to SMC Health Officer.`} />
            )}
          </div>
        )}

        <Card title="Hospital Capacity Update">
          <div className="flex flex-col gap-5">

            {/* Ward — pre-filled, disabled */}
            <Input label={t('wardName')} name="ward" value={user?.ward || ''} disabled />

            {/* ── Beds ── */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Beds</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Total Beds (fixed capacity of this ward)"
                  name="totalBeds"
                  type="text"
                  value={form.totalBeds}
                  onChange={handleChange}
                  placeholder="e.g. 50"
                  required
                />
                <Input
                  label="Available Beds (currently unoccupied)"
                  name="availableBeds"
                  type="text"
                  value={form.availableBeds}
                  onChange={handleChange}
                  placeholder={`max ${form.totalBeds || '—'}`}
                  required
                />
              </div>
              {bedsInvalid && (
                <p className="text-red-600 text-xs mt-1">
                  ⚠ Available beds ({form.availableBeds}) cannot exceed total beds ({form.totalBeds}).
                </p>
              )}
            </div>

            {/* ── ICU ── */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">ICU</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={`${t('icu')} Total`}
                  name="icuTotal"
                  type="text"
                  value={form.icuTotal}
                  onChange={handleChange}
                  placeholder="e.g. 10"
                  required
                />
                <Input
                  label={`${t('icu')} Available (currently free)`}
                  name="icuAvailable"
                  type="text"
                  value={form.icuAvailable}
                  onChange={handleChange}
                  placeholder={`max ${form.icuTotal || '—'}`}
                  required
                />
              </div>
              {icuInvalid && (
                <p className="text-red-600 text-xs mt-1">
                  ⚠ ICU available ({form.icuAvailable}) cannot exceed ICU total ({form.icuTotal}).
                </p>
              )}
            </div>

            {/* ── Emergency Beds ── */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Emergency Beds</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Total Emergency Beds"
                  name="emergencyBedsTotal"
                  type="text"
                  value={form.emergencyBedsTotal}
                  onChange={handleChange}
                  placeholder="e.g. 10"
                  required
                />
                <Input
                  label="Available Emergency Beds"
                  name="emergencyBedsAvailable"
                  type="text"
                  value={form.emergencyBedsAvailable}
                  onChange={handleChange}
                  placeholder={`max ${form.emergencyBedsTotal || '—'}`}
                  required
                />
              </div>
              {emergencyBedsInvalid && (
                <p className="text-red-600 text-xs mt-1">
                  ⚠ Available emergency beds ({form.emergencyBedsAvailable}) cannot exceed total ({form.emergencyBedsTotal}).
                </p>
              )}
            </div>

            {/* ── Oxygen ── */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Oxygen Cylinders</p>
              <p className="text-xs text-gray-400 mb-3">
                Enter the number of oxygen <strong>cylinders</strong> your ward has.
                "Total" = cylinders your ward owns in total. "Available" = cylinders that are currently full and ready to use.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Total Cylinders (ward's full stock)"
                  name="oxygenTotal"
                  type="text"
                  value={form.oxygenTotal}
                  onChange={handleChange}
                  placeholder="e.g. 20"
                  required
                />
                <Input
                  label="Available (full cylinders ready to use)"
                  name="oxygenAvailable"
                  type="text"
                  value={form.oxygenAvailable}
                  onChange={handleChange}
                  placeholder={`max ${form.oxygenTotal || '—'}`}
                  required
                />
              </div>
              {oxygenInvalid && (
                <p className="text-red-600 text-xs mt-1">
                  ⚠ Available cylinders ({form.oxygenAvailable}) cannot exceed total cylinders ({form.oxygenTotal}).
                </p>
              )}
              {!oxygenInvalid && form.oxygenTotal > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Currently at {Math.round(oxygenPct * 100)}% oxygen capacity.
                  {oxygenPct < 0.2 ? ' 🔴 Critical' : oxygenPct < 0.5 ? ' 🟡 Low' : ' 🟢 Good'}
                </p>
              )}
            </div>

            {/* ── Medicine ── */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Medicine Stock</p>
              <p className="text-xs text-gray-400 mb-3">
                Enter an overall percentage (0–100) representing how much medicine stock your ward has relative to its full capacity.
                Example: 70 means ~70% of normal stock is available.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Medicine Stock % (0 = empty, 100 = fully stocked)"
                  name="medicineStockPercentage"
                  type="text"
                  value={form.medicineStockPercentage}
                  onChange={handleChange}
                  placeholder="e.g. 80"
                  required
                />
                {/* Live visual bar */}
                {form.medicineStockPercentage !== '' && (
                  <div className="flex flex-col justify-center gap-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Stock level</span>
                      <span>{form.medicineStockPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          form.medicineStockPercentage < 20 ? 'bg-red-500' :
                          form.medicineStockPercentage < 50 ? 'bg-yellow-400' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, form.medicineStockPercentage))}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      {form.medicineStockPercentage < 20 ? '🔴 Critical — send alert' :
                        form.medicineStockPercentage < 50 ? '🟡 Low — order soon' :
                        '🟢 Adequate'}
                    </p>
                  </div>
                )}
              </div>
              {medicineInvalid && (
                <p className="text-red-600 text-xs mt-1">
                  ⚠ Medicine stock percentage must be between 0 and 100.
                </p>
              )}
            </div>

            <div className="mt-2">
              <Button
                label={loading ? 'Updating...' : 'Update Capacity'}
                onClick={handleSubmit}
                variant="primary"
                disabled={loading || success || anyInvalid}
                fullWidth
              />
            </div>

          </div>
        </Card>
      </div>
    </div>
  )
}

export default CapacityForm