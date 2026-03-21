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

// @route  GET /api/hospitals/nearest?lat=17.68&lng=75.90
// @desc   Returns 3 nearest hospitals sorted by GPS distance
// Public — no auth needed
router.get('/nearest', async (req, res) => {
  try {
    const userLat = parseFloat(req.query.lat);
    const userLng = parseFloat(req.query.lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query params are required'
      });
    }

    // Haversine formula — distance in km between two GPS coordinates
    const haversine = (lat1, lng1, lat2, lng2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const wards = await Ward.find();
    const hospitals = [];

    for (const ward of wards) {
      for (const hospital of ward.hospitals) {
        // Skip hospitals without GPS coords
        if (!hospital.lat || !hospital.lng) continue;

        const latestCapacity = await HospitalCapacity.findOne({
          hospitalName: hospital.hospitalName
        }).sort({ lastUpdated: -1 });

        const availableBeds = latestCapacity
          ? latestCapacity.availableBeds
          : hospital.availableBeds;
        const totalBeds = latestCapacity
          ? latestCapacity.totalBeds
          : hospital.totalBeds;
        const icuAvailable = latestCapacity
          ? latestCapacity.icuAvailable
          : hospital.icuAvailable;
        const icuTotal = latestCapacity
          ? latestCapacity.icuTotal
          : hospital.icuTotal;

        let bedStatus = 'Normal';
        if (totalBeds > 0) {
          const pct = availableBeds / totalBeds;
          if (pct < 0.1) bedStatus = 'Critical';
          else if (pct < 0.3) bedStatus = 'Limited';
        }

        const distanceKm = haversine(
          userLat, userLng,
          hospital.lat, hospital.lng
        );

        hospitals.push({
          hospitalName: hospital.hospitalName,
          ward: ward.wardName,
          address: hospital.address || '',
          contact: hospital.contact || '',
          lat: hospital.lat,
          lng: hospital.lng,
          availableBeds,
          totalBeds,
          icuAvailable,
          icuTotal,
          bedStatus,
          distanceKm: Math.round(distanceKm * 10) / 10,
          lastUpdated: latestCapacity ? latestCapacity.lastUpdated : null
        });
      }
    }

    // Sort by distance, return closest 3
    const nearest = hospitals
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);

    res.json({ success: true, hospitals: nearest });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  POST /api/hospitals/add
// @desc   Add a new hospital to an existing ward
// @access Protected — healthOfficer only
router.post('/add', protect, async (req, res) => {
  try {
    const {
      wardName,
      hospitalName,
      address,
      contact,
      lat,
      lng,
      totalBeds,
      availableBeds,
      icuTotal,
      icuAvailable,
      specialties
    } = req.body;

    // Validate required fields
    if (!wardName || !hospitalName || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'wardName, hospitalName, lat and lng are required'
      });
    }

    // Find the ward
    const ward = await Ward.findOne({ wardName });
    if (!ward) {
      return res.status(404).json({
        success: false,
        message: `Ward "${wardName}" not found`
      });
    }

    // Check if hospital already exists in this ward
    const exists = ward.hospitals.find(
      h => h.hospitalName.toLowerCase() === hospitalName.toLowerCase()
    );
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Hospital "${hospitalName}" already exists in ${wardName}`
      });
    }

    // Add hospital to ward
    ward.hospitals.push({
      hospitalName,
      address: address || '',
      contact: contact || '',
      lat,
      lng,
      totalBeds: totalBeds || 0,
      availableBeds: availableBeds || 0,
      icuTotal: icuTotal || 0,
      icuAvailable: icuAvailable || 0,
      specialties: specialties || [],
      doctors: []
    });

    await ward.save();

    // Also seed initial capacity record so it shows up in bed availability
    await HospitalCapacity.create({
      hospitalName,
      ward: wardName,
      totalBeds: totalBeds || 0,
      availableBeds: availableBeds || 0,
      icuTotal: icuTotal || 0,
      icuAvailable: icuAvailable || 0,
      ventilatorsTotal: 0,
      ventilatorsAvailable: 0,
      oxygenTotal: 0,
      oxygenAvailable: 0,
      medicineStockPercentage: 100,
      lastUpdated: new Date()
    });

    res.status(201).json({
      success: true,
      message: `Hospital "${hospitalName}" added to ${wardName} successfully`,
      hospital: ward.hospitals[ward.hospitals.length - 1]
    });
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
