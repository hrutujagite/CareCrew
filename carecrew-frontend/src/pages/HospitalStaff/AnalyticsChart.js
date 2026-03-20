import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const AnalyticsChart = ({ data, title, hideTitle }) => {
  return (
    <div className={`w-full bg-white p-6 rounded-xl ${hideTitle ? '' : 'border border-gray-100 shadow-sm mt-6'}`}>
      {!hideTitle && <h3 className="text-lg font-bold text-gray-800 mb-6">{title || "Disease Analytics"}</h3>}
      
      {true ? (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '13px', paddingBottom: '20px' }} />
              
              <Line 
                type="monotone"
                name="New Cases"
                dataKey="active" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone"
                name="Recovered"
                dataKey="recovered" 
                stroke="#22c55e" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }}
              />
              <Line 
                type="monotone"
                name="Deaths"
                dataKey="deaths" 
                stroke="#64748b" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#64748b', strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-72 w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-500">Not enough data to display analytics chart yet.</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsChart;
