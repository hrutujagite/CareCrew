const mongoose = require('mongoose');

const healthCampSchema = new mongoose.Schema({
  // Matches Hospital Dashboard doc exactly
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
      'Free Checkup',
      'Vaccination',
      'Blood Donation',
      'Eye Checkup',
      'Dental Checkup',
      'Awareness Drive',
      'Other'
    ]
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
    type: String,  // e.g. "9:00 AM - 4:00 PM"
    required: true
  },
  location: {
    type: String,  // e.g. "Bhavani Peth Community Hall"
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
