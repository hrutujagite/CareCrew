import React, { useState } from 'react'

const Alert = ({ alerts = [] }) => {
  const [dismissed, setDismissed] = useState([])

  const activeAlerts = alerts.filter(
    alert => !dismissed.includes(alert._id)
  )

  if (activeAlerts.length === 0) return null

  const styles = {
    Red: {
      container: 'bg-red-50 border-red-400',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'text-red-500 hover:text-red-700',
      icon: '🔴'
    },
    Yellow: {
      container: 'bg-yellow-50 border-yellow-400',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'text-yellow-500 hover:text-yellow-700',
      icon: '🟡'
    },
    Green: {
      container: 'bg-green-50 border-green-400',
      title: 'text-green-800',
      message: 'text-green-700',
      button: 'text-green-500 hover:text-green-700',
      icon: '🟢'
    }
  }

  return (
    <div className='flex flex-col gap-2 mb-4'>
      {activeAlerts.map((alert) => {
        const style = styles[alert.severity] || styles.Yellow
        return (
          <div
            key={alert._id}
            className={`border-l-4 rounded-lg p-4 flex items-start 
                        justify-between ${style.container}`}
          >
            <div className='flex items-start gap-3'>
              <span className='text-lg'>{style.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${style.title}`}>
                  {alert.alertType === 'outbreak'
                    ? '⚠ Outbreak Alert'
                    : '⚠ Shortage Alert'}{' '}
                  — {alert.wardName}
                </p>
                <p className={`text-sm mt-1 ${style.message}`}>
                  {alert.message}
                </p>
                <p className='text-xs text-gray-400 mt-1'>
                  {new Date(alert.triggeredDate).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(prev => [...prev, alert._id])}
              className={`text-lg font-bold ml-4 ${style.button}`}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default Alert