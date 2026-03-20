import React from 'react'

const Badge = ({ severity, text }) => {
  const styles = {
    Green: 'bg-green-100 text-green-800 border border-green-200',
    Yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    Red: 'bg-red-100 text-red-800 border border-red-200',
    Confirmed: 'bg-green-100 text-green-800 border border-green-200',
    Pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    Cancelled: 'bg-red-100 text-red-800 border border-red-200',
    Good: 'bg-blue-100 text-blue-800 border border-blue-200',
    Moderate: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    Poor: 'bg-red-100 text-red-800 border border-red-200',
    // Capitalized (from DB)
    Outbreak: 'bg-red-100 text-red-800 border border-red-200',
    Shortage: 'bg-orange-100 text-orange-800 border border-orange-200',
    // Lowercase fallback
    outbreak: 'bg-red-100 text-red-800 border border-red-200',
    shortage: 'bg-orange-100 text-orange-800 border border-orange-200'
  }

  const labels = {
    Green: '● Safe',
    Yellow: '● Moderate Risk',
    Red: '● High Risk',
    Confirmed: '✓ Confirmed',
    Pending: '○ Pending',
    Cancelled: '✕ Cancelled',
    Good: '● Good',
    Moderate: '● Moderate',
    Poor: '● Poor',
    Outbreak: '⚠ Outbreak',
    Shortage: '⚠ Shortage',
    outbreak: '⚠ Outbreak',
    shortage: '⚠ Shortage'
  }

  const key = text || severity

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${styles[key] || 'bg-gray-100 text-gray-800'}`}>
      {labels[key] || key}
    </span>
  )
}

export default Badge
