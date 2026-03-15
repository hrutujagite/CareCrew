import React from 'react'

const Loader = ({ message = 'Loading...' }) => {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50'>
      <div className='flex flex-col items-center gap-4'>
        <div className='w-12 h-12 border-4 border-blue-200 border-t-blue-600 
                        rounded-full animate-spin'>
        </div>
        <p className='text-sm text-gray-500 font-medium'>{message}</p>
      </div>
    </div>
  )
}

export const InlineLoader = ({ message = 'Loading...' }) => {
  return (
    <div className='flex items-center justify-center py-8'>
      <div className='flex items-center gap-3'>
        <div className='w-5 h-5 border-2 border-blue-200 border-t-blue-600 
                        rounded-full animate-spin'>
        </div>
        <p className='text-sm text-gray-500'>{message}</p>
      </div>
    </div>
  )
}

export default Loader