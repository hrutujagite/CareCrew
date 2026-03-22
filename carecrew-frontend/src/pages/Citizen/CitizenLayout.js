import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../../components/shared/Navbar'
import ChatBot from './ChatBot'

const CitizenLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/citizen/home', label: 'Home', icon: '🏠' },
    { path: '/citizen/appointments/book', label: 'Appointment Booking', icon: '📅' },
    { path: '/citizen/my-appointments', label: 'My Appointments', icon: '📋' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className='flex min-h-screen bg-slate-50 relative overflow-hidden z-0'>
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary-200/30 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-brand/20 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply"></div>

      {/* Sidebar — always visible */}
      <div className='w-64 glass-panel border-r border-white/50 flex flex-col
                      fixed top-0 left-0 h-full z-40 shadow-soft'>

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
                  ? 'bg-gradient-to-r from-primary-500 to-brand text-white shadow-md translate-x-1'
                  : 'text-slate-500 hover:bg-white/60 hover:text-primary-600 hover:shadow-sm'}`}
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