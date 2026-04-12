import React, { useState } from 'react';
import axios from 'axios';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';

const IndentDashboard = ({ indents, token, refreshData }) => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    itemName: '',
    itemType: 'medicine',
    quantityRequired: '',
    urgency: 'routine',
    reason: ''
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('https://carecrew-1.onrender.com/api/indent/submit', form, { headers });
      setShowForm(false);
      setForm({ itemName: '', itemType: 'medicine', quantityRequired: '', urgency: 'routine', reason: '' });
      if (refreshData) refreshData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit indent');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLine = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`https://carecrew-1.onrender.com/api/indent/${id}/cancel`, {}, { headers });
      if (refreshData) refreshData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel indent');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Inventory & Indents</h2>
          <p className="text-sm text-gray-500">Manage medicine and equipment requests to the Health Officer</p>
        </div>
        <Button label={showForm ? "Close Form" : "+ Request Supplies"} onClick={() => setShowForm(!showForm)} variant={showForm ? "secondary" : "primary"} />
      </div>

      {showForm && (
        <Card title="New Indent Request">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Item Name</label>
                <input required type="text" name="itemName" value={form.itemName} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="e.g. Paracetamol 500mg" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Item Type</label>
                <select required name="itemType" value={form.itemType} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="medicine">Medicine</option>
                  <option value="equipment">Equipment</option>
                  <option value="supply">General Supply</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Quantity Required</label>
                <input required type="number" min="1" name="quantityRequired" value={form.quantityRequired} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="e.g. 500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Urgency</label>
                <select required name="urgency" value={form.urgency} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Reason / Justification</label>
              <textarea name="reason" value={form.reason} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="e.g. Stock extremely low due to surge..." rows="2"></textarea>
            </div>
            <div className="flex justify-end">
              <Button type="submit" label={loading ? "Submitting..." : "Submit Request"} disabled={loading} variant="primary" />
            </div>
          </form>
        </Card>
      )}

      {indents.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No indent requests made yet.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-4 font-semibold text-gray-500">Item</th>
                  <th className="py-3 px-4 font-semibold text-gray-500">Qty</th>
                  <th className="py-3 px-4 font-semibold text-gray-500">Urgency</th>
                  <th className="py-3 px-4 font-semibold text-gray-500">Date</th>
                  <th className="py-3 px-4 font-semibold text-gray-500">Status</th>
                  <th className="py-3 px-4 font-semibold text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {indents.map((ind, i) => (
                  <tr key={ind._id || i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {ind.itemName} <span className="block text-xs text-gray-400 capitalize">{ind.itemType}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold">{ind.quantityRequired}</td>
                    <td className="py-3 px-4 capitalize">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${ind.urgency === 'critical' ? 'text-red-700 bg-red-100' : ind.urgency === 'urgent' ? 'text-orange-700 bg-orange-100' : 'text-gray-600 bg-gray-100'}`}>
                        {ind.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{new Date(ind.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Badge severity={ind.status === 'approved' || ind.status === 'fulfilled' ? 'Confirmed' : ind.status === 'rejected' ? 'Cancelled' : 'Pending'} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {ind.status === 'pending' && (
                        <button onClick={() => handleCancelLine(ind._id)} className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded font-medium transition-colors">
                          Cancel
                        </button>
                      )}
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

export default IndentDashboard;
