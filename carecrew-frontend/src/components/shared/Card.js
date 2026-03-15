import React from 'react'

const Card = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 
                     shadow-sm p-5 ${className}`}>
      {title && (
        <h3 className='text-sm font-semibold text-gray-500 
                       uppercase tracking-wide mb-4'>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

export const StatCard = ({ title, value, subtitle, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm p-5'>
      <div className='flex items-center justify-between mb-3'>
        <p className='text-sm font-medium text-gray-500'>{title}</p>
        <span className={`text-xs px-2 py-1 rounded-full font-medium 
                         ${colors[color]}`}>
          Live
        </span>
      </div>
      <p className='text-3xl font-bold text-gray-800'>{value}</p>
      {subtitle && (
        <p className='text-xs text-gray-400 mt-1'>{subtitle}</p>
      )}
    </div>
  )
}

export default Card