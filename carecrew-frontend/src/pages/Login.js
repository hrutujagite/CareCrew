import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await axios.post(
        'http://localhost:5000/api/auth/login',
        { email, password }
      )

      login(res.data.user, res.data.token)

      // Redirect based on role
      if (res.data.user.role === 'healthOfficer') {
        navigate('/officer/dashboard')
      } else if (res.data.user.role === 'hospitalStaff') {
        navigate('/hospital/dashboard')
      } else if (res.data.user.role === 'citizen') {
        navigate('/citizen/home')
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Please try again.'
      )
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
            <span className='text-white text-2xl font-bold'>CC</span>
          </div>
          <h1 className='text-2xl font-bold text-gray-800'>CareCrew</h1>
          <p className='text-sm text-gray-500 mt-1'>
            Solapur Municipal Corporation
          </p>
          <p className='text-xs text-gray-400 mt-1'>
            Smart Public Health Management System
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-3 
                          mb-4'>
            <p className='text-sm text-red-600'>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Email Address
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='Enter your email'
              required
              className='w-full px-3 py-2 border border-gray-300 rounded-lg 
                         text-sm focus:outline-none focus:ring-2 
                         focus:ring-blue-500 focus:border-transparent'
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-sm font-medium text-gray-700'>
              Password
            </label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Enter your password'
              required
              className='w-full px-3 py-2 border border-gray-300 rounded-lg 
                         text-sm focus:outline-none focus:ring-2 
                         focus:ring-blue-500 focus:border-transparent'
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Demo credentials */}
        <div className='mt-6 p-4 bg-gray-50 rounded-lg'>
          <p className='text-xs font-semibold text-gray-500 mb-2'>
            DEMO CREDENTIALS
          </p>
          <div className='flex flex-col gap-1'>
            <p className='text-xs text-gray-500'>
              Health Officer: officer@smc.gov / officer123
            </p>
            <p className='text-xs text-gray-500'>
              Hospital Staff: hospital@kmc.in / hospital123
            </p>
            <p className='text-xs text-gray-500'>
              Citizen: citizen@gmail.com / citizen123
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Login