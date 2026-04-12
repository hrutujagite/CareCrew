import React from 'react';
import axios from 'axios';
import Card from '../../components/shared/Card';

const BroadcastsDashboard = ({ broadcasts, token, refreshData }) => {
  
  const handleView = async (id) => {
    try {
      await axios.patch(`https://carecrew-1.onrender.com/api/broadcasts/${id}/view`);
      // Optionally refresh to update view count globally, but local read state is better.
      if (refreshData) refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Official Broadcasts</h2>
          <p className="text-sm text-gray-500">Updates and alerts from the SMC Health Officer</p>
        </div>
      </div>

      {broadcasts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300 mx-auto mb-3" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-500 text-sm">No active broadcasts at the moment.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {broadcasts.map((b, i) => {
            const isUrgent = b.priority === 'urgent';
            return (
              <div key={b._id || i} onClick={() => handleView(b._id)} className={`bg-white border rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md cursor-pointer ${isUrgent ? 'border-red-200 border-l-4 border-l-red-500' : 'border-gray-200 border-l-4 border-l-blue-500'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold text-base ${isUrgent ? 'text-red-700' : 'text-gray-800'}`}>{b.title}</h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{new Date(b.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 mb-3">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                    {b.priority}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 capitalize">
                    {b.category.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{b.message}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-gray-400 capitalize">Audience: {b.targetAudience.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    {b.viewCount} views
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BroadcastsDashboard;
