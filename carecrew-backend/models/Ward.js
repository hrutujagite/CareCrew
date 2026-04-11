const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: {
    type: String,
    required: true  // e.g. "09:00 AM"
  },
  endTime: {
    type: String,
    required: true  // e.g. "01:00 PM"
  },
  maxAppointments: {
    type: Number,
    default: 20
  }
});

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  experience: { type: Number, default: 0 },
  rating: { type: Number, default: 4.0 },
  isVisiting: { type: Boolean, default: false }, // ✅ NEW
  schedule: [scheduleSlotSchema]                  // ✅ NEW — replaces slots
});

const hospitalSchema = new mongoose.Schema({
  hospitalName: { type: String, required: true },
  address: { type: String, default: '' },
  contact: { type: String, default: '' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  totalBeds: { type: Number, default: 0 },
  availableBeds: { type: Number, default: 0 },
  icuTotal: { type: Number, default: 0 },
  icuAvailable: { type: Number, default: 0 },
  specialties: [{ type: String }],
  doctors: [doctorSchema],

  // ✅ NEW — what kind of facility
  facilityType: {
    type: String,
    enum: ['uphc', 'maternity_home', 'general', 'private', 'id_hospital', 'specialty'],
    default: 'general'
  },

  // ✅ NEW — services/facilities checklist
  facilities: {
    opd:          { type: Boolean, default: false }, // OPD services
    inpatient:    { type: Boolean, default: false }, // Admitted beds
    emergency:    { type: Boolean, default: false }, // Emergency/Casualty
    maternity:    { type: Boolean, default: false }, // Delivery services
    icu:          { type: Boolean, default: false }, // ICU
    lab:          { type: Boolean, default: false }, // Basic laboratory
    xray:         { type: Boolean, default: false }, // X-Ray machine
    ultrasound:   { type: Boolean, default: false }, // Sonography
    ecg:          { type: Boolean, default: false }, // ECG machine
    bloodBank:    { type: Boolean, default: false }, // Blood bank
    pediatric:    { type: Boolean, default: false }, // Child health services
    dental:       { type: Boolean, default: false }, // Dental services
    eye:          { type: Boolean, default: false }, // Eye/Ophthalmology
    dotsTb:       { type: Boolean, default: false }, // TB treatment (DOTS)
    dialysis:     { type: Boolean, default: false }, // Dialysis
    ambulance:    { type: Boolean, default: false }, // Ambulance available
    pharmacy:     { type: Boolean, default: false }, // Pharmacy on premises
    immunization: { type: Boolean, default: false }  // Immunization services
  }
});

const wardSchema = new mongoose.Schema({
  wardName: {
    type: String,
    required: true,
    unique: true
  },
  wardCode: {
    type: String,
    required: true,
    unique: true
  },
  population: {
    type: Number,
    required: true
  },
  hospitals: [hospitalSchema],
  activeCaseCount: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['Green', 'Yellow', 'Red'],
    default: 'Green'
  },
  topDisease: {
    type: String,
    default: null
  },
  accessibilityIndex: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Ward', wardSchema);