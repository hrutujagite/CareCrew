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
  }
}, { timestamps: true });

appointmentSchema.pre('save', function(next) {
  if (!this.bookingReference) {
    this.bookingReference = 'CC' + Date.now().toString().slice(-6) +
      Math.floor(Math.random() * 1000)
  }
  next()
})

module.exports = mongoose.model('Appointment', appointmentSchema);