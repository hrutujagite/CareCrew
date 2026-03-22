import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const OfficerRegister = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    setError('')

    if (!form.name || !form.email ||
        !form.password || !form.confirmPassword) {
      setError('Please fill all fields')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        'https://carecrew-1.onrender.com/api/auth/register/officer',
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
            message: 'Health Officer account created! Please login.'
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
      <div className='bg-white rounded-2xl shadow-lg w-full max-w-md'>

        {/* Header */}
        <div className='p-6 border-b border-gray-100'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-blue-600 rounded-xl flex items-center
                            justify-center'>
              <span className='text-white text-lg font-bold'>+</span>
            </div>
            <div>
              <h1 className='text-lg font-bold text-gray-800'>
                Health Officer Registration
              </h1>
              <p className='text-xs text-gray-500'>
                SwasthSolapur — SMC Health Platform
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className='p-6 flex flex-col gap-4'>

          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
              <p className='text-sm text-red-600'>{error}</p>
            </div>
          )}

          <div className='bg-blue-50 border border-blue-100 rounded-lg p-3'>
            <p className='text-xs text-blue-700'>
              ⚠️ Health Officer accounts are for SMC officials only.
              Your account will have access to all ward data and alerts.
            </p>
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Full Name <span className='text-red-500'>*</span>
            </label>
            <input
              name='name'
              value={form.name}
              onChange={handleChange}
              placeholder='Your full name'
              className='w-full px-3 py-2 border border-gray-300
                         rounded-lg text-sm focus:outline-none
                         focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Email Address <span className='text-red-500'>*</span>
            </label>
            <input
              name='email'
              value={form.email}
              onChange={handleChange}
              type='email'
              placeholder='officer@smc.gov.in'
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

          <button
            onClick={handleSubmit}
            disabled={loading}
            className='w-full bg-blue-600 text-white py-2.5 rounded-lg
                       font-semibold text-sm hover:bg-blue-700
                       transition-colors disabled:opacity-50 mt-2'
          >
            {loading ? 'Creating Account...' : 'Create Health Officer Account →'}
          </button>

          <p className='text-center text-sm text-gray-500'>
            Already have an account?{' '}
            <Link to='/login'
              className='text-blue-600 font-medium hover:underline'>
              Login here
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}

export default OfficerRegister