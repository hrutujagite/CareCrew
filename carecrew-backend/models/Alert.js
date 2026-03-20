const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  wardName: {
    type: String,
    required: true
  },
  alertType: {
    type: String,
    // Capitalized to match Health Officer dashboard doc exactly
    enum: ['Outbreak', 'Shortage'],
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
  }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
