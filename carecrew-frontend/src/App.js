import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Login from './pages/Login'

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to='/login' replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to='/login' replace />
  }

  return children
}

// Placeholder navbar for all 3 portals
const PlaceholderNav = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
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
                    flex items-center justify-between'>
      <div className='flex items-center gap-3'>
        <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center
                        justify-center'>
          <span className='text-white text-sm font-bold'>CC</span>
        </div>
        <span className='text-blue-600 font-bold text-lg'>CareCrew</span>
        <span className='text-gray-300'>|</span>
        <span className='text-xs text-gray-500'>
          Solapur Municipal Corporation
        </span>
      </div>
      <div className='flex items-center gap-4'>
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
          onClick={handleLogout}
          className='text-sm text-red-500 hover:text-red-700
                     font-medium transition-colors'>
          Logout
        </button>
      </div>
    </div>
  )
}

// Placeholder pages
const OfficerDashboard = () => (
  <div className='min-h-screen bg-gray-50'>
    <PlaceholderNav />
    <div className='p-8 text-center'>
      <h1 className='text-2xl font-bold text-gray-800'>
        Health Officer Dashboard
      </h1>
      <p className='text-gray-500 mt-2'>
        Person B (Satya) will build this page
      </p>
      <p className='text-gray-400 text-sm mt-1'>
        Import Heatmap and ForecastGraph from ./pages/HealthOfficer/
      </p>
    </div>
  </div>
)

const HospitalDashboard = () => (
  <div className='min-h-screen bg-gray-50'>
    <PlaceholderNav />
    <div className='p-8 text-center'>
      <h1 className='text-2xl font-bold text-gray-800'>
        Hospital Staff Portal
      </h1>
      <p className='text-gray-500 mt-2'>Person C will build this page</p>
    </div>
  </div>
)

const CitizenHome = () => (
  <div className='min-h-screen bg-gray-50'>
    <PlaceholderNav />
    <div className='p-8 text-center'>
      <h1 className='text-2xl font-bold text-gray-800'>
        Citizen Portal
      </h1>
      <p className='text-gray-500 mt-2'>Person E will build this page</p>
    </div>
  </div>
)

const AppRoutes = () => {
  const { user } = useAuth()

  return (
    <Routes>
      {/* Public route */}
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

      {/* Health Officer routes */}
      <Route
        path='/officer/*'
        element={
          <ProtectedRoute allowedRoles={['healthOfficer']}>
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Hospital Staff routes */}
      <Route
        path='/hospital/*'
        element={
          <ProtectedRoute allowedRoles={['hospitalStaff']}>
            <HospitalDashboard />
          </ProtectedRoute>
        }
      />

      {/* Citizen routes */}
      <Route
        path='/citizen/*'
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <CitizenHome />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route
        path='/'
        element={<Navigate to='/login' replace />}
      />
      <Route
        path='*'
        element={<Navigate to='/login' replace />}
      />
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