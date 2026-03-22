import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
 
const WARDS = [
  { wardName: 'Bhavani Peth', zone: 'Zone 1' },
  { wardName: 'North Solapur', zone: 'Zone 2' },
  { wardName: 'Laxmi Peth', zone: 'Zone 3' },
  { wardName: 'Murarji Peth', zone: 'Zone 4' },
  { wardName: 'Shukrawar Peth', zone: 'Zone 5' },
  { wardName: 'Sakhar Peth', zone: 'Zone 6' },
  { wardName: 'Budhwar Peth', zone: 'Zone 7' },
  { wardName: 'Mangalwar Peth', zone: 'Zone 8' },
  { wardName: 'Kegaon', zone: 'Zone 9' },
  { wardName: 'Hotgi Road', zone: 'Zone 10' },
  { wardName: 'Akkalkot Road', zone: 'Zone 11' },
  { wardName: 'Vijapur Road', zone: 'Zone 12' },
  { wardName: 'Osmanabad Naka', zone: 'Zone 13' },
  { wardName: 'Kambar', zone: 'Zone 14' },
  { wardName: 'Begam Peth', zone: 'Zone 15' },
  { wardName: 'Rajendra Nagar', zone: 'Zone 16' },
  { wardName: 'Ashok Nagar', zone: 'Zone 17' },
  { wardName: 'Solapur North', zone: 'Zone 18' },
  { wardName: 'Bhuinj Naka', zone: 'Zone 19' },
  { wardName: 'Prakash Nagar', zone: 'Zone 20' },
  { wardName: 'Sakhar Peth', zone: 'Zone 21' },
  { wardName: 'Siddheshwar Peth', zone: 'Zone 22' },
  { wardName: 'Datta Nagar', zone: 'Zone 23' },
  { wardName: 'Shanti Nagar', zone: 'Zone 24' },
  { wardName: 'Kamgar Nagar', zone: 'Zone 25' },
]
 
const SPECIALTIES = [
  'General', 'Cardiology', 'Paediatrics', 'Orthopaedics',
  'Gynaecology', 'Neurology', 'Dermatology', 'ENT',
  'Ophthalmology', 'Emergency'
]
 
const STEPS = [
  'Hospital Info',
  'Location',
  'Specialties',
  'Staff Account'
]
 
const HospitalRegister = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
 
  const [form, setForm] = useState({
    // Step 1
    hospitalName: '',
    address: '',
    contact: '',
    ward: '',
    zone: '',
    // Step 2
    lat: '',
    lng: '',
    // Step 3
    specialties: [],
    // Step 5
    staffName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
 
  // Auto fill zone when ward changes
  const handleWardChange = (e) => {
    const selectedWard = WARDS.find(w => w.wardName === e.target.value)
    setForm(prev => ({
      ...prev,
      ward: e.target.value,
      zone: selectedWard?.zone || ''
    }))
  }
 
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }
 
  const handleSpecialtyToggle = (specialty) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }))
  }
 
  const validateStep = () => {
    setError('')
    if (step === 0) {
      if (!form.hospitalName || !form.address ||
          !form.contact || !form.ward) {
        setError('Please fill all required fields')
        return false
      }
    }
    if (step === 1) {
      if (!form.lat || !form.lng) {
        setError('Please enter hospital coordinates')
        return false
      }
    }
    if (step === 2) {
      if (form.specialties.length === 0) {
        setError('Please select at least one specialty')
        return false
      }
    }
    if (step === 3) {
      if (!form.staffName || !form.email ||
          !form.password || !form.confirmPassword) {
        setError('Please fill all required fields')
        return false
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match')
        return false
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters')
        return false
      }
    }
    return true
  }
 
  const handleNext = () => {
    if (validateStep()) setStep(prev => prev + 1)
  }
 
  const handleBack = () => {
    setError('')
    setStep(prev => prev - 1)
  }
 
  const handleSubmit = async () => {
    if (!validateStep()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        'https://carecrew-1.onrender.com/api/auth/register/hospital',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        }
      )
      const data = await res.json()
      if (data.success) {
        navigate('/login', {
          state: {
            message: `Hospital "${form.hospitalName}" registered successfully! Please login.`
          }
        })
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError('Server error. Please try again.')
    } finally {
      setLoading(false)
    }
  }
 
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-blue-100
                    flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-lg w-full max-w-lg'>
 
        {/* Header */}
        <div className='p-6 border-b border-gray-100'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 bg-blue-600 rounded-xl flex items-center
                            justify-center'>
              <span className='text-white text-lg font-bold'>+</span>
            </div>
            <div>
              <h1 className='text-lg font-bold text-gray-800'>
                Register Your Hospital
              </h1>
              <p className='text-xs text-gray-500'>
                SwasthSolapur — SMC Health Platform
              </p>
            </div>
          </div>
 
          {/* Step indicators */}
          <div className='flex items-center gap-1'>
            {STEPS.map((s, i) => (
              <React.Fragment key={i}>
                <div className='flex flex-col items-center'>
                  <div className={`w-7 h-7 rounded-full flex items-center
                                  justify-center text-xs font-bold
                                  transition-colors
                                  ${i < step
                                    ? 'bg-green-500 text-white'
                                    : i === step
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-400'
                                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <p className={`text-xs mt-1 hidden sm:block
                                ${i === step
                                  ? 'text-blue-600 font-medium'
                                  : 'text-gray-400'
                                }`}>
                    {s}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 transition-colors
                                  ${i < step
                                    ? 'bg-green-400'
                                    : 'bg-gray-200'
                                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
 
        {/* Form body */}
        <div className='p-6'>
 
          {/* Error */}
          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-3
                            mb-4'>
              <p className='text-sm text-red-600'>{error}</p>
            </div>
          )}
 
          {/* STEP 0 — Hospital Info */}
          {step === 0 && (
            <div className='flex flex-col gap-4'>
              <h2 className='text-sm font-semibold text-gray-700 uppercase
                             tracking-wide'>
                Hospital Information
              </h2>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Hospital Name <span className='text-red-500'>*</span>
                </label>
                <input
                  name='hospitalName'
                  value={form.hospitalName}
                  onChange={handleChange}
                  placeholder='e.g. Bhavani Peth General Hospital'
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Address <span className='text-red-500'>*</span>
                </label>
                <input
                  name='address'
                  value={form.address}
                  onChange={handleChange}
                  placeholder='Full address'
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Contact Number <span className='text-red-500'>*</span>
                </label>
                <input
                  name='contact'
                  value={form.contact}
                  onChange={handleChange}
                  placeholder='e.g. 0217-2722001'
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Ward <span className='text-red-500'>*</span>
                </label>
                <select
                  name='ward'
                  value={form.ward}
                  onChange={handleWardChange}
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500 bg-white'
                >
                  <option value=''>-- Select Ward --</option>
                  {WARDS.map(w => (
                    <option key={w.wardName} value={w.wardName}>
                      {w.wardName}
                    </option>
                  ))}
                </select>
              </div>
              {form.zone && (
                <div className='bg-blue-50 rounded-lg px-3 py-2'>
                  <p className='text-sm text-blue-700'>
                    Zone: <strong>{form.zone}</strong>
                  </p>
                </div>
              )}
            </div>
          )}
 
          {/* STEP 1 — Location */}
          {step === 1 && (
            <div className='flex flex-col gap-4'>
              <h2 className='text-sm font-semibold text-gray-700 uppercase
                             tracking-wide'>
                Hospital Location (GPS)
              </h2>
              <div className='bg-blue-50 border border-blue-100 rounded-lg
                              p-3'>
                <p className='text-xs text-blue-700'>
                  To get coordinates: Open Google Maps → Right click on
                  your hospital location → Copy coordinates
                </p>
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Latitude <span className='text-red-500'>*</span>
                </label>
                <input
                  name='lat'
                  value={form.lat}
                  onChange={handleChange}
                  placeholder='e.g. 17.6868'
                  type='number'
                  step='0.0001'
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Longitude <span className='text-red-500'>*</span>
                </label>
                <input
                  name='lng'
                  value={form.lng}
                  onChange={handleChange}
                  placeholder='e.g. 75.9064'
                  type='number'
                  step='0.0001'
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
          )}
 
          {/* STEP 2 — Specialties */}
          {step === 2 && (
            <div className='flex flex-col gap-4'>
              <h2 className='text-sm font-semibold text-gray-700 uppercase
                             tracking-wide'>
                Medical Specialties
              </h2>
              <p className='text-xs text-gray-500'>
                Select all departments available at your hospital
              </p>
              <div className='grid grid-cols-2 gap-2'>
                {SPECIALTIES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSpecialtyToggle(s)}
                    className={`px-3 py-2 rounded-lg border text-sm
                               font-medium text-left transition-colors
                               ${form.specialties.includes(s)
                                 ? 'bg-blue-600 text-white border-blue-600'
                                 : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                               }`}
                  >
                    {form.specialties.includes(s) ? '✓ ' : ''}{s}
                  </button>
                ))}
              </div>
              {form.specialties.length > 0 && (
                <p className='text-xs text-blue-600'>
                  {form.specialties.length} specialties selected
                </p>
              )}
            </div>
          )}
 
          {/* STEP 3 — Staff Account */}
          {step === 3 && (
            <div className='flex flex-col gap-4'>
              <h2 className='text-sm font-semibold text-gray-700 uppercase
                             tracking-wide'>
                Staff Account
              </h2>
              <p className='text-xs text-gray-500'>
                This account will be used to login and manage your hospital
              </p>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Your Name <span className='text-red-500'>*</span>
                </label>
                <input
                  name='staffName'
                  value={form.staffName}
                  onChange={handleChange}
                  placeholder='Full name'
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Email <span className='text-red-500'>*</span>
                </label>
                <input
                  name='email'
                  value={form.email}
                  onChange={handleChange}
                  type='email'
                  placeholder='hospital@example.com'
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Password <span className='text-red-500'>*</span>
                </label>
                <input
                  name='password'
                  value={form.password}
                  onChange={handleChange}
                  type='password'
                  placeholder='Minimum 6 characters'
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm font-medium text-gray-700'>
                  Confirm Password <span className='text-red-500'>*</span>
                </label>
                <input
                  name='confirmPassword'
                  value={form.confirmPassword}
                  onChange={handleChange}
                  type='password'
                  placeholder='Re-enter password'
                  className='w-full px-3 py-2 border border-gray-300
                             rounded-lg text-sm focus:outline-none
                             focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
          )}
 
        </div>
 
        {/* Footer buttons */}
        <div className='px-6 pb-6 flex items-center justify-between gap-3'>
          {step > 0 ? (
            <button
              onClick={handleBack}
              className='px-4 py-2 border border-gray-300 rounded-lg
                         text-sm font-medium text-gray-600
                         hover:bg-gray-50 transition-colors'
            >
              ← Back
            </button>
          ) : (
            <Link
              to='/login'
              className='text-sm text-gray-500 hover:text-gray-700'
            >
              Already registered? Login
            </Link>
          )}
 
          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className='px-6 py-2 bg-blue-600 text-white rounded-lg
                         text-sm font-semibold hover:bg-blue-700
                         transition-colors'
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className='px-6 py-2 bg-blue-600 text-white rounded-lg
                         text-sm font-semibold hover:bg-blue-700
                         transition-colors disabled:opacity-50'
            >
              {loading ? 'Registering...' : 'Register Hospital ✓'}
            </button>
          )}
        </div>
 
      </div>
    </div>
  )
}
 
export default HospitalRegister