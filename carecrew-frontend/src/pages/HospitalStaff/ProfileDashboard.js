import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://carecrew-1.onrender.com';

const FACILITY_OPTIONS = [
  { key: 'opd', label: 'OPD Services', icon: '🏥' },
  { key: 'inpatient', label: 'Inpatient / Admitted', icon: '🛏️' },
  { key: 'emergency', label: 'Emergency / Casualty', icon: '🚨' },
  { key: 'maternity', label: 'Maternity / Delivery', icon: '👶' },
  { key: 'icu', label: 'ICU', icon: '💉' },
  { key: 'lab', label: 'Laboratory', icon: '🔬' },
  { key: 'xray', label: 'X-Ray', icon: '📷' },
  { key: 'ultrasound', label: 'Ultrasound / Sonography', icon: '📡' },
  { key: 'ecg', label: 'ECG', icon: '💓' },
  { key: 'bloodBank', label: 'Blood Bank', icon: '🩸' },
  { key: 'pediatric', label: 'Pediatric Care', icon: '🧒' },
  { key: 'dental', label: 'Dental', icon: '🦷' },
  { key: 'eye', label: 'Eye / Ophthalmology', icon: '👁️' },
  { key: 'dotsTb', label: 'TB DOTS Center', icon: '💊' },
  { key: 'dialysis', label: 'Dialysis', icon: '🫀' },
  { key: 'ambulance', label: 'Ambulance', icon: '🚑' },
  { key: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { key: 'immunization', label: 'Immunization', icon: '💉' },
];

const FACILITY_TYPE_LABELS = {
  general: 'General Hospital',
  uphc: 'UPHC (Urban Primary Health Center)',
  maternity_home: 'Maternity Home',
  private: 'Private Clinic / Hospital',
  id_hospital: 'Infectious Disease Hospital',
  specialty: 'Specialty Center',
};

const FACILITY_TYPES = Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
    <span className="text-sm font-medium text-gray-800">{value || <span className="text-gray-400 italic">Not set</span>}</span>
  </div>
);

const ProfileDashboard = ({ token }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    facilityType: 'general',
    address: '',
    contact: '',
    specialties: '',
    facilities: {},
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchProfile(); }, [token]);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/api/hospitals/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const p = res.data.profile;
      setProfile(p);
      setForm({
        facilityType: p.facilityType || 'general',
        address: p.address || '',
        contact: p.contact || '',
        specialties: Array.isArray(p.specialties) ? p.specialties.join(', ') : '',
        facilities: p.facilities ? { ...p.facilities } : {},
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile. The backend may not be deployed yet.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
      };
      await axios.put(`${API}/api/hospitals/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditing(false);
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save. Ensure the backend is deployed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleFacility = (key) => {
    setForm(prev => ({
      ...prev,
      facilities: { ...prev.facilities, [key]: !prev.facilities[key] },
    }));
  };

  // ─── Loading / Error states ────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Loading hospital profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm font-medium">
      ⚠️ {error}
      <p className="mt-2 text-xs text-red-500">This feature requires the latest backend to be deployed on Render. Push your changes and redeploy.</p>
    </div>
  );

  // ─── VIEW MODE ─────────────────────────────────────────────────────────────
  if (!editing) return (
    <div className="flex flex-col gap-6">

      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
        <div className="flex items-start justify-between relative">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
              🏥
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{profile?.hospitalName}</h2>
              <p className="text-blue-200 text-sm mt-1 font-medium">
                {FACILITY_TYPE_LABELS[profile?.facilityType] || 'General Hospital'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-xl text-sm hover:bg-blue-50 transition-colors shadow-lg"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Edit Profile
          </button>
        </div>
      </div>

      {/* Hospital Details Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-5">Hospital Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoRow label="Address" value={profile?.address} />
          <InfoRow label="Contact Number" value={profile?.contact} />
          <InfoRow label="Facility Type" value={FACILITY_TYPE_LABELS[profile?.facilityType]} />
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Medical Specialties</span>
            {profile?.specialties?.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {profile.specialties.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">{s}</span>
                ))}
              </div>
            ) : <span className="text-sm text-gray-400 italic">No specialties added</span>}
          </div>
        </div>
      </div>

      {/* Services & Facilities */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-5">Services & Facilities</h3>
        {FACILITY_OPTIONS.filter(f => profile?.facilities?.[f.key]).length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No facilities configured yet.</p>
            <button onClick={() => setEditing(true)} className="text-blue-500 font-semibold text-xs mt-2 hover:underline">
              Click Edit Profile to add your services →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {FACILITY_OPTIONS.filter(f => profile?.facilities?.[f.key]).map(f => (
              <div key={f.key} className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <span className="text-base">{f.icon}</span>
                <span className="text-xs font-semibold text-green-800">{f.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── EDIT MODE ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Edit header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit Hospital Profile</h2>
          <p className="text-gray-500 text-sm mt-0.5">Update your hospital's information and available services.</p>
        </div>
        <button
          onClick={() => { setEditing(false); fetchProfile(); }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 font-medium text-sm rounded-xl hover:bg-gray-50 transition-colors"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
          Cancel
        </button>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-5">Basic Information</h3>

          {/* Hospital name — read only */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hospital Name</label>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
              🔒 {profile?.hospitalName}
              <span className="ml-auto text-xs text-gray-400">Cannot be changed</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Facility Type</label>
              <select
                value={form.facilityType}
                onChange={e => setForm({ ...form, facilityType: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Contact Number</label>
              <input
                type="text"
                placeholder="e.g. 0217-2722001"
                value={form.contact}
                onChange={e => setForm({ ...form, contact: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
              <textarea
                rows="2"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Medical Specialties</label>
              <input
                type="text"
                placeholder="e.g. General, Pediatrics, Orthopedics"
                value={form.specialties}
                onChange={e => setForm({ ...form, specialties: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Separate multiple specialties with commas</p>
            </div>
          </div>
        </div>

        {/* Facilities Checklist */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Services & Facilities</h3>
            <span className="text-xs text-gray-400">
              {Object.values(form.facilities).filter(Boolean).length} selected
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FACILITY_OPTIONS.map(opt => (
              <label
                key={opt.key}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.facilities[opt.key]
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  checked={!!form.facilities[opt.key]}
                  onChange={() => toggleFacility(opt.key)}
                />
                <span className="text-base">{opt.icon}</span>
                <span className={`text-sm font-medium ${form.facilities[opt.key] ? 'text-blue-900' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Save / Cancel buttons */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => { setEditing(false); fetchProfile(); }}
            className="px-6 py-2.5 border border-gray-300 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? 'Saving...' : '💾 Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileDashboard;
