import React from 'react';
import Card from '../../components/shared/Card';

const AlertsDashboard = ({ alerts }) => {
  return (
    <div className="flex flex-col gap-4">
      {alerts.length === 0 ? (
        <Card>
          <div className="text-center py-12 flex flex-col items-center">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300 mb-3" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-sm font-medium">No active alerts — everything is under control</p>
          </div>
        </Card>
      ) : (
        <>
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
              a.severity === 'Red' ? 'bg-red-50 border-red-200' : a.severity === 'Yellow' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${a.severity === 'Red' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    a.type === 'Outbreak' ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'
                  }`}>{a.type}</span>
                  <span className={`text-xs font-bold ${a.severity === 'Red' ? 'text-red-700' : 'text-yellow-700'}`}>{a.severity}</span>
                </div>
                <p className={`text-sm font-medium ${a.severity === 'Red' ? 'text-red-800' : 'text-yellow-800'}`}>{a.message}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-2">Alerts auto-generated from latest capacity and disease data.</p>
        </>
      )}
    </div>
  );
};

export default AlertsDashboard;
