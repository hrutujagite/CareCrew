import React from 'react'

const Card = ({ title, children, className = '' }) => {
  return (
    <div className={`glass-card rounded-2xl p-6 ${className}`}>
      {title && (
        <h3 className='text-xs font-bold text-slate-500 
                       uppercase tracking-wider mb-5'>
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
    <div className='glass-card rounded-2xl p-6 relative overflow-hidden'>
      <div className='flex items-center justify-between mb-4 relative z-10'>
        <p className='text-sm font-semibold text-slate-500'>{title}</p>
        <span className={`text-xs px-2 py-1 rounded-full font-medium 
                         ${colors[color]}`}>
          Live
        </span>
      </div>
      <p className='text-4xl font-extrabold text-slate-800 relative z-10'>{value}</p>
      {subtitle && (
        <p className='text-xs font-medium text-slate-400 mt-2 relative z-10'>{subtitle}</p>
      )}
    </div>
  )
}

export default Card