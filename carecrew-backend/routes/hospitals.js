const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');
const HospitalCapacity = require('../models/HospitalCapacity');
const { protect } = require('../middleware/auth');

// @route  GET /api/hospitals
// @desc   Get all hospitals with live bed availability
// Public — no auth needed (citizen map, homepage)
router.get('/', async (req, res) => {
  try {
    const wards = await Ward.find();
    const hospitals = [];

    for (const ward of wards) {
      for (const hospital of ward.hospitals) {
        // Get latest capacity submission for this hospital
        const latestCapacity = await HospitalCapacity.findOne({
          hospitalName: hospital.hospitalName
        }).sort({ lastUpdated: -1 });

        const availableBeds = latestCapacity
          ? latestCapacity.availableBeds
          : hospital.availableBeds;
        const totalBeds = latestCapacity
          ? latestCapacity.totalBeds
          : hospital.totalBeds;

        // Bed status for map pin color
        let bedStatus = 'Normal';
        if (totalBeds > 0) {
          const pct = availableBeds / totalBeds;
          if (pct < 0.1) bedStatus = 'Critical';
          else if (pct < 0.3) bedStatus = 'Limited';
          else bedStatus = 'Normal';
        }

        hospitals.push({
          hospitalName: hospital.hospitalName,
          ward: ward.wardName,
          address: hospital.address || '',
          contact: hospital.contact || '',
          // GPS coordinates for Leaflet map pins
          lat: hospital.lat,
          lng: hospital.lng,
          // Bed data
          totalBeds,
          availableBeds,
          icuTotal: latestCapacity ? latestCapacity.icuTotal : hospital.icuTotal,
          icuAvailable: latestCapacity
            ? latestCapacity.icuAvailable
            : hospital.icuAvailable,
          // Ventilators
          ventilatorsTotal: latestCapacity
            ? latestCapacity.ventilatorsTotal : 0,
          ventilatorsAvailable: latestCapacity
            ? latestCapacity.ventilatorsAvailable : 0,
          // Oxygen — return both numeric and label
          oxygenAvailable: latestCapacity ? latestCapacity.oxygenAvailable : 0,
          oxygenTotal: latestCapacity ? latestCapacity.oxygenTotal : 0,
          oxygenStatus: latestCapacity ? latestCapacity.oxygenStatus : 'Unknown',
          // Medicine
          medicineStockPercentage: latestCapacity
            ? latestCapacity.medicineStockPercentage : 100,
          medicineStatus: latestCapacity
            ? latestCapacity.medicineStatus : 'Full',
          // Status
          bedStatus,
          lastUpdated: latestCapacity ? latestCapacity.lastUpdated : null,
          // Specialties and doctors for appointment booking
          specialties: hospital.specialties || [],
          doctors: hospital.doctors || []
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

// @route  GET /api/hospitals/:hospitalName/doctors
// @desc   Get doctors for a specific hospital (for appointment booking dropdown)
router.get('/:hospitalName/doctors', async (req, res) => {
  try {
    const { hospitalName } = req.params;
    const { specialty } = req.query;

    const ward = await Ward.findOne({
      'hospitals.hospitalName': hospitalName
    });

    if (!ward) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const hospital = ward.hospitals.find(
      h => h.hospitalName === hospitalName
    );

    let doctors = hospital.doctors || [];

    // Filter by specialty if provided
    if (specialty) {
      doctors = doctors.filter(d => d.specialty === specialty);
    }

    res.json({ success: true, doctors, specialties: hospital.specialties || [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/hospitals/:hospitalName
// @desc   Get single hospital detail
router.get('/:hospitalName', async (req, res) => {
  try {
    const { hospitalName } = req.params;

    const ward = await Ward.findOne({
      'hospitals.hospitalName': hospitalName
    });

    if (!ward) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const hospital = ward.hospitals.find(
      h => h.hospitalName === hospitalName
    );

    const latestCapacity = await HospitalCapacity.findOne({
      hospitalName
    }).sort({ lastUpdated: -1 });

    res.json({
      success: true,
      hospital: {
        ...hospital.toObject(),
        ward: ward.wardName,
        latestCapacity
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
