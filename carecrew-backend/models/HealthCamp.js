const mongoose = require('mongoose');

const healthCampSchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    required: true
  },
  wardName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  campType: {
    type: String,
    required: true,
    enum: [
      // General Camps
      'Free General Checkup',
      'Medical & Dental Camp',
      'Eye Checkup Camp',
      'Blood Donation Drive',
      // Government NHM Programs
      'Routine Immunization Drive',
      'RBSK Screening',
      'NCD Screening Camp',
      'Maternal Health Camp',
      'TB Awareness & DOTS Camp',
      'Vector Disease Control Camp',
      // Awareness
      'Nutrition & Anaemia Awareness',
      'Mental Health Awareness',
      'Sanitation & Hygiene Drive',
      'Adolescent Health Session',
      // Other
      'Other'
    ]
  },

  // ✅ NEW — only used when campType = 'Other'
  customCampType: {
    type: String,
    default: null
  },

  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  timing: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  contactInfo: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Virtual: camp status based on dates
healthCampSchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.startDate) return 'Upcoming';
  if (now > this.endDate) return 'Completed';
  return 'Ongoing';
});

healthCampSchema.set('toJSON', { virtuals: true });
healthCampSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('HealthCamp', healthCampSchema);