import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/AuthContext'

const BASE_URL = 'https://carecrew-1.onrender.com/api'

const CitizenRegister = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    contact: '',
    ward: ''
  })
  const [wards, setWards] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Load wards for dropdown
  useEffect(() => {
    const fetchWards = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/wards`)
        if (res.data.success) setWards(res.data.wards)
      } catch (err) {
        console.error('Failed to load wards')
      }
    }
    fetchWards()
  }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validations
    if (!form.name || !form.email || !form.password ||
        !form.contact || !form.ward) {
      setError('All fields are required')
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

    if (!/^\d{10}$/.test(form.contact)) {
      setError('Contact must be a valid 10-digit number')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post(`${BASE_URL}/auth/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
        contact: form.contact,
        ward: form.ward,
        role: 'citizen'
      })

      // Auto login after registration
      login(res.data.user, res.data.token)
      navigate('/citizen/home')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-blue-100
                    flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-lg p-8 w-full max-w-md'>

        {/* Logo */}
        <div className='flex flex-col items-center mb-8'>
          <div className='w-14 h-14 bg-blue-600 rounded-2xl flex items-center
                          justify-center mb-3'>
            <span className='text-white text-2xl font-bold'>+</span>
          </div>
          <h1 className='text-2xl font-bold text-gray-800'>SwasthSolapur</h1>
          <p className='text-sm text-gray-500 mt-1'>
            Solapur Municipal Corporation
          </p>
          <p className='text-xs text-gray-400 mt-1'>
            Create your citizen account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-3
                          mb-4'>
            <p className='text-sm text-red-600'>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>

          {/* Name */}
          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Full Name <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              name='name'
              value={form.name}
              onChange={handleChange}
              placeholder='Enter your full name'
              required
              className='w-full px-3 py-2 border border-gray-300 rounded-lg
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-blue-500'
            />
          </div>

          {/* Email */}
          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Email Address <span className='text-red-500'>*</span>
            </label>
            <input
              type='email'
              name='email'
              value={form.email}
              onChange={handleChange}
              placeholder='Enter your email'
              required
              className='w-full px-3 py-2 border border-gray-300 rounded-lg
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-blue-500'
            />
          </div>

          {/* Contact */}
          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Contact Number <span className='text-red-500'>*</span>
            </label>
            <input
              type='tel'
              name='contact'
              value={form.contact}
              onChange={handleChange}
              placeholder='10-digit mobile number'
              required
              maxLength={10}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-blue-500'
            />
          </div>

          {/* Ward */}
          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Your Ward <span className='text-red-500'>*</span>
            </label>
            <select
              name='ward'
              value={form.ward}
              onChange={handleChange}
              required
              className='w-full px-3 py-2 border border-gray-300 rounded-lg
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-blue-500 bg-white'
            >
              <option value=''>-- Select your ward --</option>
              {wards.map((w, i) => (
                <option key={i} value={w.wardName}>
                  {w.wardName}
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Password <span className='text-red-500'>*</span>
            </label>
            <input
              type='password'
              name='password'
              value={form.password}
              onChange={handleChange}
              placeholder='At least 6 characters'
              required
              className='w-full px-3 py-2 border border-gray-300 rounded-lg
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-blue-500'
            />
          </div>

          {/* Confirm Password */}
          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Confirm Password <span className='text-red-500'>*</span>
            </label>
            <input
              type='password'
              name='confirmPassword'
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder='Re-enter your password'
              required
              className='w-full px-3 py-2 border border-gray-300 rounded-lg
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-blue-500'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 text-white py-2 rounded-lg
                       font-medium text-sm hover:bg-blue-700
                       transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed mt-2'
          >
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        {/* Login link */}
        <div className='mt-6 text-center'>
          <p className='text-sm text-gray-500'>
            Already have an account?{' '}
            <Link
              to='/login'
              className='text-blue-600 font-semibold hover:underline'
            >
              Login here
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default CitizenRegister
