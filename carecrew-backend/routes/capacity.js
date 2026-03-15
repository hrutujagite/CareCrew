const express = require('express');
const router = express.Router();
const HospitalCapacity = require('../models/HospitalCapacity');
const Alert = require('../models/Alert');
const Ward = require('../models/Ward');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  POST /api/capacity/submit
// @desc   Submit hospital capacity update
router.post('/submit', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const {
      totalBeds,
      availableBeds,
      icuTotal,
      icuAvailable,
      oxygenLevel,
      medicineLevel
    } = req.body;

    // Create or update capacity record
    const capacity = await HospitalCapacity.create({
      hospitalName: req.user.hospitalName,
      ward: req.user.ward,
      totalBeds,
      availableBeds,
      icuTotal: icuTotal || 0,
      icuAvailable: icuAvailable || 0,
      oxygenLevel,
      medicineLevel,
      submittedBy: req.user._id,
      lastUpdated: Date.now()
    });

    // Update ward hospital bed data
    const ward = await Ward.findOne({ wardName: req.user.ward });
    if (ward) {
      const hospitalIndex = ward.hospitals.findIndex(
        h => h.hospitalName === req.user.hospitalName
      );
      if (hospitalIndex !== -1) {
        ward.hospitals[hospitalIndex].totalBeds = totalBeds;
        ward.hospitals[hospitalIndex].availableBeds = availableBeds;
        ward.hospitals[hospitalIndex].icuTotal = icuTotal || 0;
        ward.hospitals[hospitalIndex].icuAvailable = icuAvailable || 0;
      }
      await ward.save();
    }

    // Check for shortage alerts
    const shortages = [];
    if (oxygenLevel === 'Critical') {
      shortages.push('Oxygen');
    }
    if (medicineLevel === 'Critical') {
      shortages.push('Medicine');
    }

    if (shortages.length > 0) {
      const shortageMessage = `Critical shortage alert at ${req.user.hospitalName} 
        in ${req.user.ward}: ${shortages.join(' and ')} stock is Critical`;

      // Deactivate old shortage alerts for this hospital
      await Alert.updateMany(
        {
          wardName: req.user.ward,
          alertType: 'shortage',
          isActive: true
        },
        { isActive: false, resolvedDate: Date.now() }
      );

      // Create new shortage alert
      await Alert.create({
        wardName: req.user.ward,
        alertType: 'shortage',
        severity: 'Red',
        message: shortageMessage,
        isActive: true
      });
    }

    res.status(201).json({
      success: true,
      message: 'Capacity updated successfully',
      capacity,
      shortageAlert: shortages.length > 0 ? shortages : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/capacity/latest
// @desc   Get latest capacity for this hospital
router.get('/latest', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const capacity = await HospitalCapacity.findOne({
      hospitalName: req.user.hospitalName
    }).sort({ lastUpdated: -1 });

    res.json({ success: true, capacity });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;