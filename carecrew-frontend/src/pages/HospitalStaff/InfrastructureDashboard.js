import React from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import axios from 'axios';

const InfrastructureDashboard = ({ hasCapacity, cap, diseaseHistory, navigate, token, fetchDashData }) => {
  const handleRaiseFlag = async () => {
    const type = window.prompt("What is critically short? (e.g., Oxygen, Medicine, ICU Beds)");
    if (!type) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('https://carecrew-1.onrender.com/api/capacity/shortage-flag',
        { shortageType: type, severity: 'Red' }, { headers });
      alert(`Emergency shortage flag raised for ${type}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to raise flag');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {!hasCapacity ? (
        <Card>
          <div className="text-center py-12 flex flex-col items-center">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300 mb-3" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-500 text-sm font-medium mb-4">No capacity data yet</p>
            <Button label="Submit First Capacity Report" onClick={() => navigate('/hospital/capacity-form')} variant="primary" />
          </div>
        </Card>
      ) : (
        <>
          {/* Real-Time Resource Burden Analysis — unchanged */}
          {(() => {
            const recentCasesCount = diseaseHistory.filter(r => new Date(r.createdAt) >= new Date(Date.now() - 14 * 86400000)).reduce((s, d) => s + (d.newConfirmed || 0), 0);
            const totalBedsAvailable = (cap.availableBeds || 0) + (cap.icuAvailable || 0);
            const totalBedsCount = (cap.totalBeds || 0) + (cap.icuTotal || 0);
            const occupancy = totalBedsCount > 0 ? ((totalBedsCount - totalBedsAvailable) / totalBedsCount) : 0;

            let bLevel = 'green';
            let bTitle = 'Adequate Capacity Available';
            let bDesc = `Your facility is currently operating within a safe margin. You have ${totalBedsAvailable} beds open against a backdrop of ${recentCasesCount} new cases recorded in the last 14 days. No immediate capacity threats detected.`;

            if (occupancy >= 0.85 || (recentCasesCount > 0 && totalBedsAvailable < Math.ceil(recentCasesCount * 0.2))) {
              bLevel = 'red';
              bTitle = 'Critical Disease Pressure';
              bDesc = `Severe capacity shortage detected! With a surge of ${recentCasesCount} confirmed cases over the last 14 days, your remaining ${totalBedsAvailable} open beds are critically insufficient. Immediate action and patient redirection may be required.`;
            } else if (occupancy >= 0.6 || recentCasesCount >= 30) {
              bLevel = 'orange';
              bTitle = 'Elevated Resource Strain';
              bDesc = `Recent disease activity is generating moderate pressure on your capacity. You have recorded ${recentCasesCount} confirmed cases over the last 14 days, leaving ${totalBedsAvailable} total beds open. Monitor admissions and prepare surge protocols.`;
            }

            const styles = {
              red:    { bg: 'bg-red-50',    border: 'border-red-200',    title: 'text-red-900',    text: 'text-red-800' },
              orange: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-900', text: 'text-orange-800' },
              green:  { bg: 'bg-green-50',  border: 'border-green-200',  title: 'text-green-900',  text: 'text-green-800' },
            }[bLevel];

            return (
              <div className={`w-full rounded-2xl border p-6 shadow-sm mb-2 ${styles.bg} ${styles.border}`}>
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 opacity-70">Real-Time Burden Analysis</h3>
                <h4 className={`text-xl font-bold mb-2 tracking-tight ${styles.title}`}>{bTitle}</h4>
                <p className={`text-base leading-relaxed font-medium opacity-90 ${styles.text} max-w-4xl`}>{bDesc}</p>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* General Beds */}
            <Card title="General Beds">
              <div className="flex flex-col mt-2">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-gray-800">{cap.availableBeds}</span>
                  <span className="text-sm text-gray-400 font-medium">/ {cap.totalBeds} available</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className={`h-2 rounded-full ${cap.availableBeds === 0 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${cap.totalBeds > 0 ? (cap.availableBeds / cap.totalBeds) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-gray-500 text-right">
                  {cap.totalBeds > 0 ? Math.round((cap.availableBeds / cap.totalBeds) * 100) : 0}% capacity remaining
                </p>
              </div>
            </Card>

            {/* ICU Beds */}
            <Card title="ICU Beds">
              <div className="flex flex-col mt-2">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-gray-800">{cap.icuAvailable}</span>
                  <span className="text-sm text-gray-400 font-medium">/ {cap.icuTotal} available</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${cap.icuTotal > 0 ? (cap.icuAvailable / cap.icuTotal) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-gray-500 text-right">
                  {cap.icuTotal > 0 ? Math.round((cap.icuAvailable / cap.icuTotal) * 100) : 0}% capacity remaining
                </p>
              </div>
            </Card>

            {/* Emergency Beds */}
            {(cap.emergencyBedsTotal > 0) && (
              <Card title="Emergency Beds">
                <div className="flex flex-col mt-2">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-3xl font-bold ${cap.emergencyBedsAvailable === 0 ? 'text-red-600' : 'text-gray-800'}`}>
                      {cap.emergencyBedsAvailable}
                    </span>
                    <span className="text-sm text-gray-400 font-medium">/ {cap.emergencyBedsTotal} available</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full ${cap.emergencyBedsAvailable === 0 ? 'bg-red-500' : cap.emergencyBedsAvailable / cap.emergencyBedsTotal < 0.3 ? 'bg-orange-500' : 'bg-green-500'}`}
                      style={{ width: `${cap.emergencyBedsTotal > 0 ? (cap.emergencyBedsAvailable / cap.emergencyBedsTotal) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 text-right">
                    {cap.emergencyBedsTotal > 0 ? Math.round((cap.emergencyBedsAvailable / cap.emergencyBedsTotal) * 100) : 0}% capacity remaining
                  </p>
                  {cap.emergencyBedsAvailable === 0 && (
                    <p className="text-xs text-red-500 font-semibold mt-1">⚠ All emergency beds occupied</p>
                  )}
                </div>
              </Card>
            )}

            {/* Overall Bed Occupancy */}
            <Card title="Overall Bed Occupancy">
              <div className="flex flex-col mt-2">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-bold text-gray-800">
                    {cap.totalBeds > 0 ? Math.round(((cap.totalBeds - cap.availableBeds) / cap.totalBeds) * 100) : 0}%
                    <span className="text-sm text-gray-400 font-normal ml-1">occupied</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full bg-orange-500"
                    style={{ width: `${cap.totalBeds > 0 ? ((cap.totalBeds - cap.availableBeds) / cap.totalBeds) * 100 : 0}%` }} />
                </div>
                <p className="text-xs text-gray-500 text-right">
                  {cap.totalBeds - cap.availableBeds} beds currently in use
                </p>
              </div>
            </Card>

            {/* Oxygen */}
            <Card title="Oxygen Supply">
              <div className="flex flex-col mt-2 h-[88px]">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-gray-800">{cap.oxygenAvailable || 0}</span>
                  <span className="text-sm text-gray-500">cylinders available</span>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <p className="text-xs text-gray-400">Total: <span className="font-semibold text-gray-600">{cap.oxygenTotal || 0}</span></p>
                  <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border ${
                    cap.oxygenStatus === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' :
                    cap.oxygenStatus === 'Low' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                    'bg-green-50 text-green-600 border-green-200'
                  }`}>{cap.oxygenStatus}</span>
                </div>
              </div>
            </Card>

            {/* Medicine */}
            <Card title="Medicine Stock">
              <div className="flex flex-col mt-2 h-[88px]">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-3xl font-bold ${cap.medicineStockPercentage < 20 ? 'text-red-600' : 'text-gray-800'}`}>
                    {cap.medicineStockPercentage}%
                  </span>
                  <span className="text-sm text-gray-500">stock remaining</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                  <div className={`h-1.5 rounded-full ${cap.medicineStockPercentage < 20 ? 'bg-red-500' : cap.medicineStockPercentage < 50 ? 'bg-yellow-400' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, cap.medicineStockPercentage)}%` }} />
                </div>
                <div className="flex items-center justify-end mt-auto">
                  <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border ${
                    cap.medicineStockPercentage < 20 ? 'bg-red-50 text-red-600 border-red-200' :
                    cap.medicineStockPercentage < 50 ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                    'bg-green-50 text-green-600 border-green-200'
                  }`}>{cap.medicineStatus}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Last Updated</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Capacity metrics were last updated on{' '}
                  <span className="font-medium text-gray-700">
                    {new Date(cap.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleRaiseFlag}
                  className="px-4 py-2 border-2 border-red-200 text-red-600 bg-red-50 font-semibold rounded-lg hover:bg-red-100 transition-colors text-sm">
                  Raise Emergency Flag
                </button>
                <Button label="Update Capacity" onClick={() => navigate('/hospital/capacity-form')} variant="secondary" />
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default InfrastructureDashboard;