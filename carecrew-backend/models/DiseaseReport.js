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

  // ✅ NEW — only used when diseaseName = 'Other'
  customDiseaseName: {
    type: String,
    default: null
  },

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
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('DiseaseReport', diseaseReportSchema);