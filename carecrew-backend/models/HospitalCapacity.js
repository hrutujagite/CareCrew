const mongoose = require('mongoose');

const hospitalCapacitySchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    required: true
  },
  ward: {
    type: String,
    required: true
  },
  // Beds
  totalBeds: {
    type: Number,
    required: true,
    min: 0
  },
  availableBeds: {
    type: Number,
    required: true,
    min: 0
  },
  // ICU
  icuTotal: {
    type: Number,
    default: 0
  },
  icuAvailable: {
    type: Number,
    default: 0
  },

  // ✅ NEW — Emergency Beds
  emergencyBedsTotal: {
    type: Number,
    default: 0
  },
  emergencyBedsAvailable: {
    type: Number,
    default: 0
  },

  // Ventilators
  ventilatorsTotal: {
    type: Number,
    default: 0
  },
  ventilatorsAvailable: {
    type: Number,
    default: 0
  },
  // Oxygen
  oxygenTotal: {
    type: Number,
    default: 0
  },
  oxygenAvailable: {
    type: Number,
    default: 0
  },
  // Medicine
  medicineStockPercentage: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Virtual: derive oxygen status label for citizen portal display
hospitalCapacitySchema.virtual('oxygenStatus').get(function() {
  if (!this.oxygenTotal || this.oxygenTotal === 0) return 'Unknown';
  const pct = (this.oxygenAvailable / this.oxygenTotal) * 100;
  if (pct > 50) return 'Full';
  if (pct > 20) return 'Medium';
  if (pct > 0) return 'Low';
  return 'Critical';
});

// Virtual: derive medicine status label
hospitalCapacitySchema.virtual('medicineStatus').get(function() {
  if (this.medicineStockPercentage > 50) return 'Full';
  if (this.medicineStockPercentage > 20) return 'Medium';
  if (this.medicineStockPercentage > 0) return 'Low';
  return 'Critical';
});

hospitalCapacitySchema.set('toJSON', { virtuals: true });
hospitalCapacitySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('HospitalCapacity', hospitalCapacitySchema);