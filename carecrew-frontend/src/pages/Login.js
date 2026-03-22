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
        'https://carecrew-1.onrender.com/api/auth/login',
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
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-indigo-100
                    flex items-center justify-center p-6 relative overflow-hidden'>
      {/* Decorative blurred circles behind the card */}
      <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float'></div>
      <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float animate-delay-200'></div>

      <div className='glass-panel rounded-3xl p-10 w-full max-w-[420px] relative z-10'>

        {/* Back to Homepage */}
        <div className='mb-4'>
          <a
            href='http://localhost:3001'
            className='flex items-center gap-2 text-sm text-slate-400 font-medium
                       hover:text-primary-600 transition-colors tracking-wide w-fit
                       hover:-translate-x-1 duration-300'
          >
            ← Back to Portal
          </a>
        </div>

        {/* Logo */}
        <div className='flex flex-col items-center mb-10'>
          <div className='w-16 h-16 bg-gradient-to-br from-primary-500 to-brand rounded-2xl flex items-center
                          justify-center mb-4 shadow-xl transform transition hover:rotate-12 duration-300'>
            <span className='text-white text-3xl font-extrabold'>+</span>
          </div>
          <h1 className='text-3xl font-extrabold text-slate-800 tracking-tight'>SwasthSolapur</h1>
          <p className='text-sm font-medium text-slate-500 mt-2 tracking-wide'>
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
          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-semibold text-slate-700'>
              Email Address
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='Enter your email'
              required
              className='w-full px-4 py-3 border border-slate-200 rounded-xl
                         text-sm text-slate-800 bg-white/50 focus:bg-white transition-all
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         shadow-sm placeholder-slate-400'
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-semibold text-slate-700'>
              Password
            </label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Enter your password'
              required
              className='w-full px-4 py-3 border border-slate-200 rounded-xl
                         text-sm text-slate-800 bg-white/50 focus:bg-white transition-all
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         shadow-sm placeholder-slate-400'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-primary-600 text-white py-3 rounded-xl
                       font-bold text-sm tracking-wide shadow-lg shadow-primary-500/30
                       hover:bg-primary-700 hover:-translate-y-0.5 active:scale-[0.98]
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4'
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Register link */}
        <div className='mt-6 text-center'>
          <p className='text-sm font-medium text-slate-500'>
            Don't have an account?{' '}
            <a
              href='http://localhost:3001/#portals'
              className='text-primary-600 font-bold hover:text-brand transition-colors hover:underline underline-offset-4'
            >
              Register →
            </a>
          </p>
        </div>

        {/* Demo credentials perfectly kept, functionally and aesthetically */}
        <div className='mt-8 pt-6 border-t border-slate-100'>
          <p className='text-[11px] font-bold text-slate-400 mb-4 uppercase
                        tracking-widest flex items-center gap-2'>
            <span>Demo Credentials</span>
            <span className='h-px flex-1 bg-slate-100'></span>
          </p>
          <div className='flex flex-col gap-2'>
            {[
              {
                role: 'Health Officer',
                email: 'officer@smc.gov.in',
                password: 'officer123',
                color: 'text-amber-700 bg-amber-50/50 hover:bg-amber-50 border-amber-200 hover:border-amber-300'
              },
              {
                role: 'Hospital Staff',
                email: 'staff.bhavani@hospital.com',
                password: 'hospital123',
                color: 'text-teal-700 bg-teal-50/50 hover:bg-teal-50 border-teal-200 hover:border-teal-300'
              },
              {
                role: 'Citizen',
                email: 'rahul@citizen.com',
                password: 'citizen123',
                color: 'text-primary-700 bg-primary-50/50 hover:bg-primary-50 border-primary-200 hover:border-primary-300'
              },
            ].map((cred, i) => (
              <button
                key={i}
                type='button'
                onClick={() => fillCredentials(cred.email, cred.password)}
                className={`w-full text-left px-4 py-3 rounded-xl border
                            text-xs font-medium transition-all duration-300 shadow-sm
                            hover:shadow-md hover:-translate-y-0.5 focus:ring-2 focus:ring-offset-1 focus:ring-slate-300
                            ${cred.color}`}
              >
                <div className='flex justify-between items-center'>
                  <span className='font-bold'>{cred.role}</span>
                  <span className='opacity-70 text-[10px] tracking-wider uppercase'>Click</span>
                </div>
                <div className='mt-1 opacity-80'>{cred.email}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Login