import React from 'react'

const Button = ({ label, onClick, variant = 'primary', disabled = false, fullWidth = false, type = 'button' }) => {
  const base = `px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 
                focus:outline-none focus:ring-2 focus:ring-offset-2 
                disabled:opacity-50 disabled:cursor-not-allowed`

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {label}
    </button>
  )
}

export default Button