const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String, required: true },
  experience: { type: Number, default: 0 }, // years
  rating: { type: Number, default: 4.0 },
  slots: [{ type: String }] // e.g. ["09:00 AM", "10:30 AM", "02:00 PM"]
});

const hospitalSchema = new mongoose.Schema({
  hospitalName: { type: String, required: true },
  address: { type: String, default: '' },
  contact: { type: String, default: '' },
  lat: { type: Number, required: true },  // GPS latitude for Leaflet map
  lng: { type: Number, required: true },  // GPS longitude for Leaflet map
  totalBeds: { type: Number, default: 0 },
  availableBeds: { type: Number, default: 0 },
  icuTotal: { type: Number, default: 0 },
  icuAvailable: { type: Number, default: 0 },
  specialties: [{ type: String }], // e.g. ["General", "Cardiology", "Paediatrics"]
  doctors: [doctorSchema]
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
