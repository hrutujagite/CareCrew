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
import HospitalRegister from './pages/Register/HospitalRegister'
import OfficerRegister from './pages/Register/OfficerRegister'

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
    <div className='glass-panel px-8 py-4 flex items-center justify-between sticky top-0 z-50'>
      <div className='flex items-center gap-4'>
        <div className='w-10 h-10 bg-gradient-to-br from-primary-500 to-brand rounded-xl flex items-center justify-center shadow-lg transform transition hover:rotate-12'>
          <span className='text-white text-lg font-bold'>+</span>
        </div>
        <span className='text-gradient font-extrabold text-2xl tracking-tight'>SwasthSolapur</span>
        <span className='text-gray-300'>|</span>
        <span className='text-xs text-gray-500'>
          Solapur Municipal Corporation
        </span>
      </div>
      <div className='flex items-center gap-4'>
        <button
          onClick={handleTranslate}
          className='text-sm px-4 py-2 rounded-full border border-primary-200 bg-white/50
                     text-primary-700 hover:bg-primary-50 hover:shadow-sm transition-all
                     font-medium backdrop-blur-sm'
        >
          🌐 {isMarathi ? 'English' : 'मराठी'}
        </button>
        {user && (
          <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm border border-white/50
                           ${roleColors[user.role]}`}>
            {roleLabels[user.role]}
          </span>
        )}
        {user && (
          <span className='text-sm text-slate-700 font-semibold px-2'>
            {user.name}
          </span>
        )}
        <button
          onClick={() => { logout(); navigate('/login') }}
          className='text-sm text-slate-500 hover:text-red-500 font-semibold transition-colors
                     px-3 py-2 rounded-lg hover:bg-red-50'
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
      {/* Hospital Registration — public */}
      <Route
        path='/register/hospital'
        element={
          user
            ? <Navigate to='/hospital/dashboard' replace />
            : <HospitalRegister />
        }
      />

      {/* Health Officer Registration — public */}
      <Route
        path='/register/officer'
        element={
          user
            ? <Navigate to='/officer/dashboard' replace />
            : <OfficerRegister />
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