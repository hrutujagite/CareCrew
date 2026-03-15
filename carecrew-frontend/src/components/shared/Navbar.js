import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

const Navbar = () => {
  const { user, logout } = useAuth()
  const { language, toggle, t } = useLanguage()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleLabels = {
    healthOfficer: 'Health Officer',
    hospitalStaff: 'Hospital Staff',
    citizen: 'Citizen'
  }

  const roleColors = {
    healthOfficer: 'bg-amber-100 text-amber-700',
    hospitalStaff: 'bg-teal-100 text-teal-700',
    citizen: 'bg-purple-100 text-purple-700'
  }

  return (
    <nav className='bg-white border-b border-gray-200 px-6 py-3 
                    flex items-center justify-between sticky top-0 z-50'>
      {/* Left - Logo */}
      <div className='flex items-center gap-3'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center 
                          justify-center'>
            <span className='text-white text-sm font-bold'>CC</span>
          </div>
          <span className='text-blue-600 font-bold text-lg'>CareCrew</span>
        </div>
        <span className='text-gray-300'>|</span>
        <span className='text-xs text-gray-500'>
          Solapur Municipal Corporation
        </span>
      </div>

      {/* Right - User info + controls */}
      <div className='flex items-center gap-4'>
        {/* Language toggle */}
        <button
          onClick={toggle}
          className='text-sm px-3 py-1 rounded-full border border-gray-200 
                     text-gray-600 hover:bg-gray-50 transition-colors'
        >
          {language === 'en' ? 'मराठी' : 'English'}
        </button>

        {/* Role badge */}
        {user && (
          <span className={`text-xs px-2 py-1 rounded-full font-medium 
                           ${roleColors[user.role]}`}>
            {roleLabels[user.role]}
          </span>
        )}

        {/* User name */}
        {user && (
          <span className='text-sm text-gray-600 font-medium'>
            {user.name}
          </span>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className='text-sm text-red-500 hover:text-red-700 
                     font-medium transition-colors'
        >
          {t('logout')}
        </button>
      </div>
    </nav>
  )
}

export default Navbar