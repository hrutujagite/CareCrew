const mongoose = require('mongoose');

const diseaseReportSchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    required: true
  },
  wardName: {
    type: String,
    required: true
  },
  diseaseName: {
    type: String,
    required: true,
    enum: ['Dengue', 'Malaria', 'TB', 'COVID-19', 'Cholera', 'Typhoid', 'Other']
  },
  caseCount: {
    type: Number,
    required: true,
    min: 0
  },
  labConfirmed: {
    type: Number,
    default: 0
  },
  suspected: {
    type: Number,
    default: 0
  },
  labName: {
    type: String,
    default: null
  },
  testType: {
    type: String,
    enum: ['Blood', 'Urine', 'Sputum', 'Swab', null],
    default: null
  },
  positiveCount: {
    type: Number,
    default: 0
  },
  negativeCount: {
    type: Number,
    default: 0
  },
  pendingCount: {
    type: Number,
    default: 0
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('DiseaseReport', diseaseReportSchema);