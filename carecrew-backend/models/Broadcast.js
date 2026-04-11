const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['health_advisory', 'outbreak_alert', 'preventive_tip', 'scheme_announcement', 'general'],
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['all_citizens', 'ward_citizens', 'all_hospitals', 'specific_hospital'],
    required: true
  },
  targetWard: {
    type: String,
    default: null   // only used when targetAudience = 'ward_citizens'
  },
  targetHospitalName: {
    type: String,
    default: null   // only used when targetAudience = 'specific_hospital'
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal'
  },
  message: {
    type: String,
    required: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Broadcast', broadcastSchema);