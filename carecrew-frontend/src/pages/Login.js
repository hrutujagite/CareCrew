import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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

  const fillCredentials = (email, password) => {
    setEmail(email)
    setPassword(password)
    setError('')
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-blue-100
                    flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-lg p-8 w-full max-w-md'>

        {/* Back to Homepage */}
        <div className='mb-4'>
          <a
            href='http://localhost:3001'
            className='flex items-center gap-1 text-sm text-gray-400
                       hover:text-blue-600 transition-colors w-fit'
          >
            ← Back to Homepage
          </a>
        </div>

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

        {/* Register link — goes to homepage portal cards */}
        <div className='mt-4 text-center'>
          <p className='text-sm text-gray-500'>
            Don't have an account?{' '}
            <a
              href='http://localhost:3001/#portals'
              className='text-blue-600 font-semibold hover:underline'
            >
              Register →
            </a>
          </p>
        </div>

        {/* Demo credentials */}
        <div className='mt-6 p-4 bg-gray-50 rounded-lg'>
          <p className='text-xs font-semibold text-gray-500 mb-3 uppercase
                        tracking-wide'>
            Demo Credentials — Click to Fill
          </p>
          <div className='flex flex-col gap-2'>
            {[
              {
                role: 'Health Officer',
                email: 'officer@smc.gov.in',
                password: 'officer123',
                color: 'text-amber-600 bg-amber-50 border-amber-200'
              },
              {
                role: 'Hospital Staff',
                email: 'staff.bhavani@hospital.com',
                password: 'hospital123',
                color: 'text-teal-600 bg-teal-50 border-teal-200'
              },
              {
                role: 'Citizen',
                email: 'rahul@citizen.com',
                password: 'citizen123',
                color: 'text-purple-600 bg-purple-50 border-purple-200'
              },
            ].map((cred, i) => (
              <button
                key={i}
                type='button'
                onClick={() => fillCredentials(cred.email, cred.password)}
                className={`w-full text-left px-3 py-2 rounded-lg border
                            text-xs transition-colors hover:opacity-80
                            ${cred.color}`}
              >
                <span className='font-semibold'>{cred.role}:</span>{' '}
                {cred.email}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Login