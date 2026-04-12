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
      emergencyBedsTotal,    // ✅ NEW
      emergencyBedsAvailable, // ✅ NEW
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
      emergencyBedsTotal: emergencyBedsTotal || 0,       // ✅ NEW
      emergencyBedsAvailable: emergencyBedsAvailable || 0, // ✅ NEW
      oxygenTotal: oxygenTotal || 0,
      oxygenAvailable: oxygenAvailable || 0,
      medicineStockPercentage: medicineStockPercentage || 100,
      submittedBy: req.user._id,
      lastUpdated: Date.now()
    });

    // Sync bed data back to Ward collection
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

    // General beds critical if available < 10% of total
    if (totalBeds > 0 && (availableBeds / totalBeds) < 0.1) {
      shortages.push('Beds');
    }

    // ✅ NEW — Emergency beds critical if available < 10% of total
    if (emergencyBedsTotal > 0 && (emergencyBedsAvailable / emergencyBedsTotal) < 0.1) {
      shortages.push('Emergency Beds');
    }

    // ✅ NEW — ICU critical if available = 0
    if (icuTotal > 0 && icuAvailable === 0) {
      shortages.push('ICU');
    }

    if (shortages.length > 0) {
      // ✅ BUG FIX 4 — scoped to this hospital only, not all hospitals in ward
      await Alert.updateMany(
        { 
          wardName: req.user.ward, 
          alertType: 'Shortage', 
          isActive: true,
          hospitalName: req.user.hospitalName // ✅ added
        },
        { isActive: false, resolvedDate: Date.now() }
      );

      await Alert.create({
        wardName: req.user.ward,
        alertType: 'Shortage',
        severity: 'Red',
        message: `Critical shortage at ${req.user.hospitalName} in ${req.user.ward}: ${shortages.join(', ')} stock is critically low`,
        isActive: true,
        hospitalName: req.user.hospitalName // ✅ BUG FIX 2 — added hospitalName
      });
    } else {
      // ✅ BUG FIX 4 — scoped to this hospital only when resolving
      await Alert.updateMany(
        { 
          wardName: req.user.ward, 
          alertType: 'Shortage', 
          isActive: true,
          hospitalName: req.user.hospitalName // ✅ added
        },
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

// @route  POST /api/capacity/shortage-flag
// @desc   Manually raise a shortage flag (medicine/oxygen)
router.post('/shortage-flag', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const { shortageType, severity, message } = req.body; // e.g., 'Medicine', 'Red', 'Critically low on Remdesivir'
    const alert = await Alert.create({
      wardName: req.user.ward,
      hospitalName: req.user.hospitalName,
      alertType: 'Shortage',
      severity: severity || 'Red',
      message: message || `Critical ${shortageType} shortage at ${req.user.hospitalName}`,
      isActive: true
    });
    res.status(201).json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/capacity/shortage-flags
// @desc   Get active shortage flags (Health Officer)
router.get('/shortage-flags', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const alerts = await Alert.find({ alertType: 'Shortage', isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PATCH /api/capacity/shortage-flag/:id/resolve
// @desc   Resolve a shortage flag
router.patch('/shortage-flag/:id/resolve', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    
    // Allow either the officer or the hospital that created it to resolve it
    if (req.user.role !== 'healthOfficer' && alert.hospitalName !== req.user.hospitalName) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    alert.isActive = false;
    alert.resolvedDate = Date.now();
    await alert.save();
    
    res.json({ success: true, message: 'Shortage resolved', alert });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;