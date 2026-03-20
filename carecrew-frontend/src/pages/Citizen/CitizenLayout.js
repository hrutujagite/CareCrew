import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/shared/Navbar'

const CitizenLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/citizen/home', label: 'Home', icon: '🏠' },
    { path: '/citizen/appointments/book', label: 'Appointment Booking', icon: '📅' },
    { path: '/citizen/hospitals', label: 'Find Hospital', icon: '📍' },
    { path: '/citizen/beds', label: 'Bed Availability', icon: '🛏️' },
    { path: '/citizen/my-appointments', label: 'My Appointments', icon: '📋' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className='flex min-h-screen bg-gray-50'>
      {/* Sidebar */}
      <div className='w-64 bg-white border-r border-gray-200 flex flex-col
                      fixed top-0 left-0 h-full z-40'>
        {/* Logo */}
        <div className='p-5 border-b border-gray-100'>
          <div className='flex items-center gap-2'>
            <div className='w-9 h-9 bg-blue-600 rounded-xl flex items-center
                            justify-center'>
              <span className='text-white text-lg font-bold'>+</span>
            </div>
            <div>
              <p className='text-blue-600 font-bold text-base leading-tight'>
                CareCrew
              </p>
              <p className='text-gray-400 text-xs'>Your health, our priority</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className='flex-1 p-3 flex flex-col gap-1 overflow-y-auto'>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5
                         rounded-lg text-sm font-medium transition-colors
                         text-left
                         ${isActive(item.path)
                           ? 'bg-blue-600 text-white'
                           : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className='p-4 border-t border-gray-100'>
          <div className='flex items-center gap-3 mb-3'>
            <div className='w-9 h-9 bg-blue-100 rounded-full flex items-center
                            justify-center flex-shrink-0'>
              <span className='text-blue-600 text-sm font-bold'>
                {user?.name?.charAt(0)?.toUpperCase() || 'C'}
              </span>
            </div>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-gray-800 truncate'>
                {user?.name || 'Citizen'}
              </p>
              <p className='text-xs text-gray-400 truncate'>
                {user?.ward || 'Solapur'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='w-full text-xs text-gray-400 hover:text-red-500
                       transition-colors text-center py-1'
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className='flex-1 ml-64 flex flex-col min-h-screen'>
        {/* Shared Navbar - same across all 3 portals */}
        <Navbar />

        {/* Page content */}
        <div className='flex-1 p-6'>
          {children}
        </div>
      </div>
    </div>
  )
}

export default CitizenLayout
