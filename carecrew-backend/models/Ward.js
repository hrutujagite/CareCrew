const mongoose = require('mongoose');

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
  hospitals: [
    {
      hospitalName: String,
      address: String,
      contact: String,
      totalBeds: Number,
      availableBeds: Number,
      icuTotal: Number,
      icuAvailable: Number
    }
  ],
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