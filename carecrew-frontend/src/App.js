import React, { useEffect, useState } from 'react'
import {
  BrowserRouter, Routes, Route, Navigate, useNavigate
} from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Login from './pages/Login'
import CitizenRegister from './pages/Register/CitizenRegister'

import HospitalHome from './pages/HospitalStaff/HospitalHome'
import DiseaseForm from './pages/HospitalStaff/DiseaseForm'
import CapacityForm from './pages/HospitalStaff/CapacityForm'
import History from './pages/HospitalStaff/History'
import HealthCampForm from './pages/HospitalStaff/HealthCampForm'

import AppointmentBooking from './pages/Citizen/AppointmentBooking'
import MyAppointments from './pages/Citizen/MyAppointments'
import CitizenHome from './pages/Citizen/Home'

import OfficerDashboard from './pages/HealthOfficer/Dashboard'

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to='/login' replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to='/login' replace />
  }
  return children
}

// Shared Navbar
const PlaceholderNav = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isMarathi, setIsMarathi] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const check = setInterval(() => {
      if (document.querySelector('.goog-te-combo')) {
        setReady(true)
        clearInterval(check)
      }
    }, 300)
    setTimeout(() => clearInterval(check), 10000)
    return () => clearInterval(check)
  }, [])

  const handleTranslate = () => {
    const select = document.querySelector('.goog-te-combo')
    if (!select) return
    if (!isMarathi) {
      select.value = 'mr'
      select.dispatchEvent(new Event('change'))
      setIsMarathi(true)
    } else {
      select.value = 'en'
      select.dispatchEvent(new Event('change'))
      setIsMarathi(false)
    }
  }

  const roleColors = {
    healthOfficer: 'bg-amber-100 text-amber-700',
    hospitalStaff: 'bg-teal-100 text-teal-700',
    citizen: 'bg-purple-100 text-purple-700'
  }
  const roleLabels = {
    healthOfficer: 'Health Officer',
    hospitalStaff: 'Hospital Staff',
    citizen: 'Citizen'
  }

  return (
    <div className='bg-white border-b border-gray-200 px-6 py-3
                    flex items-center justify-between sticky top-0 z-50'>
      <div className='flex items-center gap-3'>
        <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center
                        justify-center'>
          <span className='text-white text-sm font-bold'>+</span>
        </div>
        <span className='text-blue-600 font-bold text-lg'>SwasthSolapur</span>
        <span className='text-gray-300'>|</span>
        <span className='text-xs text-gray-500'>
          Solapur Municipal Corporation
        </span>
      </div>
      <div className='flex items-center gap-4'>
        <button
          onClick={handleTranslate}
          className='text-sm px-3 py-1 rounded-full border border-blue-200
                     text-blue-600 hover:bg-blue-50 transition-colors
                     font-medium'
        >
          🌐 {isMarathi ? 'English' : 'मराठी'}
        </button>
        {user && (
          <span className={`text-xs px-2 py-1 rounded-full font-medium
                           ${roleColors[user.role]}`}>
            {roleLabels[user.role]}
          </span>
        )}
        {user && (
          <span className='text-sm text-gray-600 font-medium'>
            {user.name}
          </span>
        )}
        <button
          onClick={() => { logout(); navigate('/login') }}
          className='text-sm text-red-500 hover:text-red-700 font-medium'
        >
          Logout
        </button>
      </div>
    </div>
  )
}

const HospitalDashboard = () => (
  <Routes>
    <Route path='dashboard' element={<HospitalHome />} />
    <Route path='disease-form' element={<DiseaseForm />} />
    <Route path='capacity-form' element={<CapacityForm />} />
    <Route path='history' element={<History />} />
    <Route path='create-camp' element={<HealthCampForm />} />
    <Route path='*' element={<Navigate to='dashboard' replace />} />
  </Routes>
)

const AppRoutes = () => {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public */}
      <Route
        path='/login'
        element={
          user ? (
            <Navigate
              to={
                user.role === 'healthOfficer'
                  ? '/officer/dashboard'
                  : user.role === 'hospitalStaff'
                    ? '/hospital/dashboard'
                    : '/citizen/home'
              }
              replace
            />
          ) : (
            <Login />
          )
        }
      />

      {/* Citizen Registration */}
      <Route
        path='/register/citizen'
        element={
          user
            ? <Navigate to='/citizen/home' replace />
            : <CitizenRegister />
        }
      />

      {/* Health Officer */}
      <Route
        path='/officer/*'
        element={
          <ProtectedRoute allowedRoles={['healthOfficer']}>
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Hospital Staff */}
      <Route
        path='/hospital/*'
        element={
          <ProtectedRoute allowedRoles={['hospitalStaff']}>
            <HospitalDashboard />
          </ProtectedRoute>
        }
      />

      {/* Citizen Portal */}
      <Route
        path='/citizen/home'
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <CitizenHome />
          </ProtectedRoute>
        }
      />
      <Route
        path='/citizen/appointments/book'
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <AppointmentBooking />
          </ProtectedRoute>
        }
      />
      <Route
        path='/citizen/my-appointments'
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <MyAppointments />
          </ProtectedRoute>
        }
      />

      {/* Default */}
      <Route path='/' element={<Navigate to='/login' replace />} />
      <Route path='*' element={<Navigate to='/login' replace />} />
    </Routes>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App