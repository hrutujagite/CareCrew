import React from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';

const HealthCampsDashboard = ({ healthCamps, navigate }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{healthCamps.length} camp{healthCamps.length !== 1 ? 's' : ''} created</p>
        <Button label="+ Create Camp" onClick={() => navigate('/hospital/create-camp')} variant="primary" />
      </div>
      {healthCamps.length === 0 ? (
        <Card>
          <div className="text-center py-12 flex flex-col items-center">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300 mb-3" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-500 text-sm font-medium">No health camps created yet</p>
            <p className="text-xs text-gray-400 mt-1">Create a health camp to inform citizens about upcoming events</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {healthCamps.map((camp, idx) => {
            const statusColor = camp.status === 'Ongoing' ? 'bg-green-100 text-green-700 border-green-200'
              : camp.status === 'Upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200'
              : 'bg-gray-100 text-gray-500 border-gray-200';
            return (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{camp.title}</h3>
                    <span className="text-xs text-gray-400">{camp.campType}</span>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor}`}>{camp.status}</span>
                </div>
                {camp.description && <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{camp.description}</p>}
                <div className="flex flex-col gap-2.5 text-xs text-gray-500 font-medium">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-gray-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    <span>{new Date(camp.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {camp.endDate && camp.startDate !== camp.endDate && <> — {new Date(camp.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-gray-400"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    <span>{camp.timing}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span className="truncate">{camp.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    <span className="truncate">{camp.contactInfo}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HealthCampsDashboard;
