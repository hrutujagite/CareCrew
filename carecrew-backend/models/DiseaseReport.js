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
  // Core fields matching Hospital Dashboard doc exactly
  newConfirmed: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  newRecovered: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  newDeaths: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reportDate: {
    type: Date,
    default: Date.now
  },
  // Auto-derived in backend from reportDate
  month: {
    type: Number  // 1-12
  },
  year: {
    type: Number
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Auto-derive month and year before saving
diseaseReportSchema.pre('save', function(next) {
  const date = this.reportDate || new Date();
  this.month = date.getMonth() + 1;
  this.year = date.getFullYear();
  next();
});

module.exports = mongoose.model('DiseaseReport', diseaseReportSchema);
