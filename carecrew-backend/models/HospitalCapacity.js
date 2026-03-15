const mongoose = require('mongoose');

const hospitalCapacitySchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    required: true
  },
  ward: {
    type: String,
    required: true
  },
  totalBeds: {
    type: Number,
    required: true,
    min: 0
  },
  availableBeds: {
    type: Number,
    required: true,
    min: 0
  },
  icuTotal: {
    type: Number,
    default: 0
  },
  icuAvailable: {
    type: Number,
    default: 0
  },
  oxygenLevel: {
    type: String,
    enum: ['Full', 'Medium', 'Low', 'Critical'],
    default: 'Full'
  },
  medicineLevel: {
    type: String,
    enum: ['Full', 'Medium', 'Low', 'Critical'],
    default: 'Full'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('HospitalCapacity', hospitalCapacitySchema);