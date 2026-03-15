const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  citizenName: {
    type: String,
    required: true,
    trim: true
  },
  contact: {
    type: String,
    required: true
  },
  hospitalName: {
    type: String,
    required: true
  },
  ward: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    enum: ['General', 'Paediatrics', 'Orthopaedics', 'Gynaecology', 'Emergency']
  },
  preferredDate: {
    type: Date,
    required: true
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Confirmed', 'Pending', 'Cancelled'],
    default: 'Confirmed'
  },
  bookingReference: {
    type: String,
    unique: true
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Auto generate booking reference before saving
appointmentSchema.pre('save', function(next) {
  if (!this.bookingReference) {
    this.bookingReference = 'CC' + Date.now().toString().slice(-6) + 
                            Math.floor(Math.random() * 1000);
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);