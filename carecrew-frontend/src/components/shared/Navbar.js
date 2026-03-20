import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

const Navbar = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [isMarathi, setIsMarathi] = useState(false)
  const [translateReady, setTranslateReady] = useState(false)
  const intervalRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Poll for Google Translate widget to be ready
    intervalRef.current = setInterval(() => {
      const select = document.querySelector('.goog-te-combo')
      if (select) {
        setTranslateReady(true)
        clearInterval(intervalRef.current)
        clearTimeout(timeoutRef.current)
      }
    }, 300)

    // Give up after 15 seconds
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current)
    }, 15000)

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const applyTranslation = (select) => {
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

  const handleTranslate = () => {
    const select = document.querySelector('.goog-te-combo')
    if (!select) {
      // Widget not ready — retry after short delay
      setTimeout(() => {
        const retrySelect = document.querySelector('.goog-te-combo')
        if (retrySelect) applyTranslation(retrySelect)
      }, 500)
      return
    }
    applyTranslation(select)
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

      {/* Left — Logo */}
      <div className='flex items-center gap-3'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center
                          justify-center'>
            <span className='text-white text-sm font-bold'>+</span>
          </div>
          <span className='text-blue-600 font-bold text-lg'>CareCrew</span>
        </div>
        <span className='text-gray-300'>|</span>
        <span className='text-xs text-gray-500'>
          Solapur Municipal Corporation
        </span>
      </div>

      {/* Right */}
      <div className='flex items-center gap-4'>

        {/* Language toggle */}
        <button
          onClick={handleTranslate}
          title={translateReady ? 'Toggle language' : 'Loading translator...'}
          className={`text-sm px-3 py-1 rounded-full border transition-colors
                     flex items-center gap-1
                     ${translateReady
                       ? 'border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer'
                       : 'border-gray-100 text-gray-300 cursor-wait'
                     }`}
        >
          🌐 {isMarathi ? 'English' : 'मराठी'}
          {!translateReady && (
            <span className='text-xs animate-pulse'>···</span>
          )}
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
