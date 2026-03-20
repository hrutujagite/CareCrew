const express = require('express');
const router = express.Router();
const HospitalCapacity = require('../models/HospitalCapacity');
const Alert = require('../models/Alert');
const Ward = require('../models/Ward');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  POST /api/capacity/submit
// @desc   Submit hospital capacity update (hospitalStaff only)
router.post('/submit', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const {
      totalBeds,
      availableBeds,
      icuTotal,
      icuAvailable,
      ventilatorsTotal,
      ventilatorsAvailable,
      oxygenTotal,
      oxygenAvailable,
      medicineStockPercentage
    } = req.body;

    const capacity = await HospitalCapacity.create({
      hospitalName: req.user.hospitalName,
      ward: req.user.ward,
      totalBeds,
      availableBeds,
      icuTotal: icuTotal || 0,
      icuAvailable: icuAvailable || 0,
      ventilatorsTotal: ventilatorsTotal || 0,
      ventilatorsAvailable: ventilatorsAvailable || 0,
      oxygenTotal: oxygenTotal || 0,
      oxygenAvailable: oxygenAvailable || 0,
      medicineStockPercentage: medicineStockPercentage || 100,
      submittedBy: req.user._id,
      lastUpdated: Date.now()
    });

    // Sync bed data back to Ward collection so hospitals.js stays accurate
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

    // Check for shortage alerts using numeric thresholds
    const shortages = [];

    // Oxygen critical if available < 20% of total
    if (oxygenTotal > 0 && (oxygenAvailable / oxygenTotal) < 0.2) {
      shortages.push('Oxygen');
    }

    // Medicine critical if stock < 20%
    if (medicineStockPercentage < 20) {
      shortages.push('Medicine');
    }

    // Beds critical if available < 10% of total
    if (totalBeds > 0 && (availableBeds / totalBeds) < 0.1) {
      shortages.push('Beds');
    }

    if (shortages.length > 0) {
      // Deactivate old shortage alerts for this ward
      await Alert.updateMany(
        { wardName: req.user.ward, alertType: 'Shortage', isActive: true },
        { isActive: false, resolvedDate: Date.now() }
      );

      await Alert.create({
        wardName: req.user.ward,
        alertType: 'Shortage',
        severity: 'Red',
        message: `Critical shortage at ${req.user.hospitalName} in ${req.user.ward}: ${shortages.join(', ')} stock is critically low`,
        isActive: true
      });
    } else {
      // Resolve any existing shortage alerts if all back to normal
      await Alert.updateMany(
        { wardName: req.user.ward, alertType: 'Shortage', isActive: true },
        { isActive: false, resolvedDate: Date.now() }
      );
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

// @route  GET /api/capacity/history
// @desc   Get capacity submission history for this hospital
router.get('/history', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const history = await HospitalCapacity.find({
      hospitalName: req.user.hospitalName
    }).sort({ lastUpdated: -1 }).limit(30);

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
