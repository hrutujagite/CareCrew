const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  citizenName: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    default: ''
  },
  hospitalName: {
    type: String,
    required: true
  },
  ward: {
    type: String,
    required: true
  },
  specialty: {
    type: String,
    required: true,
    enum: [
      'General', 'Cardiology', 'Paediatrics', 'Orthopaedics',
      'Gynaecology', 'Neurology', 'Dermatology', 'ENT',
      'Ophthalmology', 'Emergency'
    ]
  },
  doctorName: {
    type: String,
    required: true
  },
  preferredDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  chiefComplaint: {
    type: String,
    default: ''
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Confirmed', 'Pending', 'Cancelled'],
    default: 'Pending'
  },
  bookingReference: {
    type: String,
    unique: true,
    sparse: true
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  }
}, { timestamps: true });

// FIX: use async pre-save hook (no next parameter) — compatible with Mongoose 7+
// Generates a collision-resistant booking reference if one isn't already set.
appointmentSchema.pre('save', async function () {
  if (!this.bookingReference) {
    this.bookingReference =
      'CC' +
      Date.now().toString().slice(-8) +
      Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  }
});

module.exports = mongoose.model('Appointment', appointmentSchema);