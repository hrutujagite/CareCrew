import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../../components/shared/Navbar'
import ChatBot from './ChatBot'

const CitizenLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/citizen/home', label: 'Home', icon: '🏠' },
    { path: '/citizen/appointments/book', label: 'Appointment Booking', icon: '📅' },
    { path: '/citizen/my-appointments', label: 'My Appointments', icon: '📋' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className='flex min-h-screen bg-gray-50'>

      {/* Sidebar — always visible */}
      <div className='w-64 bg-white border-r border-gray-200 flex flex-col
                      fixed top-0 left-0 h-full z-40'>

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
      </div>

      {/* Main content — offset by sidebar width */}
      <div className='flex-1 ml-64 flex flex-col min-h-screen'>
        {/* Navbar */}
        <Navbar />

        {/* Page content */}
        <div className='flex-1 p-6'>
          {children}
        </div>
      </div>

      {/* SwasthBot — floating on all citizen pages */}
      <ChatBot />
    </div>
  )
}

export default CitizenLayout
