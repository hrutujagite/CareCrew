const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');
const HospitalCapacity = require('../models/HospitalCapacity');
const DiseaseReport = require('../models/DiseaseReport');
const { protect } = require('../middleware/auth');

// @route  GET /api/hospitals
// @desc   Get all hospitals with live bed availability
router.get('/', protect, async (req, res) => {
  try {
    const wards = await Ward.find();

    const hospitals = [];

    for (const ward of wards) {
      for (const hospital of ward.hospitals) {
        // Get latest capacity for this hospital
        const latestCapacity = await HospitalCapacity.findOne({
          hospitalName: hospital.hospitalName
        }).sort({ lastUpdated: -1 });

        hospitals.push({
          hospitalName: hospital.hospitalName,
          ward: ward.wardName,
          address: hospital.address,
          contact: hospital.contact,
          totalBeds: latestCapacity
            ? latestCapacity.totalBeds
            : hospital.totalBeds,
          availableBeds: latestCapacity
            ? latestCapacity.availableBeds
            : hospital.availableBeds,
          icuTotal: latestCapacity
            ? latestCapacity.icuTotal
            : hospital.icuTotal,
          icuAvailable: latestCapacity
            ? latestCapacity.icuAvailable
            : hospital.icuAvailable,
          oxygenLevel: latestCapacity ? latestCapacity.oxygenLevel : 'Full',
          medicineLevel: latestCapacity
            ? latestCapacity.medicineLevel
            : 'Full',
          lastUpdated: latestCapacity ? latestCapacity.lastUpdated : null
        });
      }
    }

    // Sort by available beds descending
    hospitals.sort((a, b) => b.availableBeds - a.availableBeds);

    res.json({ success: true, hospitals });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/hospitals/:hospitalName
// @desc   Get single hospital details with submission history
router.get('/:hospitalName', protect, async (req, res) => {
  try {
    const { hospitalName } = req.params;

    // Get latest capacity
    const latestCapacity = await HospitalCapacity.findOne({
      hospitalName
    }).sort({ lastUpdated: -1 });

    // Get submission history
    const diseaseHistory = await DiseaseReport.find({
      hospitalName
    }).sort({ date: -1 }).limit(20);

    const capacityHistory = await HospitalCapacity.find({
      hospitalName
    }).sort({ lastUpdated: -1 }).limit(20);

    res.json({
      success: true,
      hospital: {
        hospitalName,
        latestCapacity,
        diseaseHistory,
        capacityHistory
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;