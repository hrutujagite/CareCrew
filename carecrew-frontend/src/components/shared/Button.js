import React from 'react'

const Button = ({ label, onClick, variant = 'primary', disabled = false, fullWidth = false, type = 'button' }) => {
  const base = `px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300
                focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 focus:ring-primary-500',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5 focus:ring-red-500',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 focus:ring-emerald-500',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-lg hover:-translate-y-0.5 focus:ring-amber-400',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500'
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