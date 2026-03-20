import React from 'react';
import Card, { StatCard } from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';

const AppointmentsDashboard = ({ appointments, todayAppts, onConfirm, onCancel }) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Today" value={todayAppts.filter(a => a.status !== 'Cancelled').length} subtitle="Scheduled today" color="blue" />
        <StatCard title="Total" value={appointments.filter(a => a.status !== 'Cancelled').length} subtitle="All time" color="purple" />
        <StatCard title="Pending" value={appointments.filter(a => a.status === 'Pending').length} subtitle="Awaiting confirmation" color="orange" />
      </div>
      {appointments.length === 0 ? (
        <Card>
          <div className="text-center py-12 flex flex-col items-center">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300 mb-3" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-gray-500 text-sm font-medium">No appointments booked yet</p>
            <p className="text-xs text-gray-400 mt-1">Citizens can book through the Citizen Portal</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Dept / Doctor</th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments
                  .filter(appt => appt.status !== 'Cancelled')
                  .slice(0, 20)
                  .map((appt, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-800">{appt.citizenName}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[120px]" title={appt.chiefComplaint || 'No complaint listed'}>
                          {appt.chiefComplaint || 'No complaint'}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-gray-500">{appt.contact}</td>
                      <td className="py-3 px-3 text-gray-600">
                        {new Date(appt.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        <span className="text-gray-400 ml-1 block text-xs">{appt.timeSlot}</span>
                      </td>
                      <td className="py-3 px-3"><span className="text-gray-800 font-medium">{appt.specialty}</span>
                        <span className="text-gray-400 text-xs block">{appt.doctorName}</span>
                      </td>
                      <td className="py-3 px-3"><Badge severity={appt.status} /></td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs">
                          {appt.status !== 'Confirmed' && (
                            <button 
                              onClick={() => onConfirm(appt._id)}
                              className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded font-bold hover:bg-green-100 transition-colors"
                            >
                              Confirm
                            </button>
                          )}
                          <button 
                            onClick={() => onCancel(appt._id)}
                            className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded font-bold hover:bg-red-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AppointmentsDashboard;
