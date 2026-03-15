import React from 'react'

const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  options = [],
  error = ''
}) => {
  const baseInput = `w-full px-3 py-2 border rounded-lg text-sm
                     text-gray-800 bg-white transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-transparent disabled:bg-gray-50
                     disabled:cursor-not-allowed
                     ${error ? 'border-red-400' : 'border-gray-300'}`

  return (
    <div className='flex flex-col gap-1'>
      {label && (
        <label className='text-sm font-medium text-gray-700'>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>
      )}

      {type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={baseInput}
        >
          <option value=''>-- Select --</option>
          {options.map((opt) => (
            <option key={opt.value || opt} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={4}
          className={baseInput}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={baseInput}
        />
      )}

      {error && (
        <p className='text-xs text-red-500'>{error}</p>
      )}
    </div>
  )
}

export default Input