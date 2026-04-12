import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import HealthCampsDashboard from './pages/HospitalStaff/HealthCampsDashboard'
import HealthSchemes from './pages/Citizen/HealthSchemes'

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to='/login' replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to='/login' replace />
  }
  return children
}

const HospitalDashboard = () => (
  <Routes>
    <Route path='dashboard' element={<HospitalHome />} />
    <Route path='disease-form' element={<DiseaseForm />} />
    <Route path='capacity-form' element={<CapacityForm />} />
    <Route path='history' element={<History />} />
    <Route path='create-camp' element={<HealthCampForm />} />
    <Route path='health-camps' element={<HealthCampsDashboard />} />
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

      <Route
        path='/citizen/health-schemes'
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <HealthSchemes />
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