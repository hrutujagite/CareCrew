import React from 'react'

const Table = ({ columns = [], data = [], emptyMessage = 'No data found' }) => {
  return (
    <div className='w-full overflow-x-auto'>
      <table className='w-full text-sm text-left'>
        <thead>
          <tr className='bg-gray-50 border-b border-gray-200'>
            {columns.map((col, index) => (
              <th
                key={index}
                className='px-4 py-3 text-xs font-semibold text-gray-500 
                           uppercase tracking-wide'
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className='px-4 py-8 text-center text-gray-400 text-sm'
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className='border-b border-gray-100 hover:bg-gray-50 
                           transition-colors'
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className='px-4 py-3 text-gray-700'
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Table