const mongoose = require('mongoose');

const indentRequestSchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    required: true
  },
  wardName: {
    type: String,
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  itemType: {
    type: String,
    enum: ['medicine', 'equipment', 'supply'],
    default: 'medicine'
  },
  quantityRequired: {
    type: Number,
    required: true
  },
  urgency: {
    type: String,
    enum: ['routine', 'urgent', 'critical'],
    default: 'routine'
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'fulfilled'],
    default: 'pending'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewNote: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('IndentRequest', indentRequestSchema);