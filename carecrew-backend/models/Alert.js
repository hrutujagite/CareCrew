const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  wardName: {
    type: String,
    required: true
  },
  alertType: {
    type: String,
    // ✅ expanded enum — added new alert types
    enum: ['Outbreak', 'Shortage', 'BedShortage', 'ICUFull', 'OxygenCritical', 'MedicineLow', 'General'],
    required: true
  },
  severity: {
    type: String,
    enum: ['Green', 'Yellow', 'Red'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  diseaseName: {
    type: String,
    default: null
  },
  caseCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  triggeredDate: {
    type: Date,
    default: Date.now
  },
  resolvedDate: {
    type: Date,
    default: null
  },

  // ✅ NEW — which hospital triggered this alert
  hospitalName: {
    type: String,
    default: null
  },
  // ✅ NEW — who dismissed this alert and when
  dismissedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  dismissedAt: {
    type: Date,
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);