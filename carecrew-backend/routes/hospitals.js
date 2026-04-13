const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');
const HospitalCapacity = require('../models/HospitalCapacity');
const { protect, authorizeRoles } = require('../middleware/auth');

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
          doctors: hospital.doctors || [],
          facilityType: hospital.facilityType || 'general',
          facilities: hospital.facilities || {}
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
      specialties,
      facilityType,
      facilities
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
      facilityType: facilityType || 'general',
      facilities: facilities || {},
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
      emergencyBedsTotal: 0,
      emergencyBedsAvailable: 0,
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
// @route  GET /api/hospitals/profile
// @desc   Get the logged-in hospital's profile (facilities, type, etc)
// @access Protected — hospitalStaff only
router.get('/profile', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const ward = await Ward.findOne({ 'hospitals.hospitalName': req.user.hospitalName });
    if (!ward) return res.status(404).json({ success: false, message: 'Hospital not found in any ward' });

    const hospital = ward.hospitals.find(h => h.hospitalName === req.user.hospitalName);
    res.json({ success: true, profile: hospital });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route  PUT /api/hospitals/profile
// @desc   Update hospital profile (facilityType, facilities checklist, address, etc)
// @access Protected — hospitalStaff only
router.put('/profile', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const { facilityType, facilities, address, contact, specialties } = req.body;

    const ward = await Ward.findOne({ 'hospitals.hospitalName': req.user.hospitalName });
    if (!ward) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const hospital = ward.hospitals.find(h => h.hospitalName === req.user.hospitalName);

    if (facilityType) hospital.facilityType = facilityType;
    if (address) hospital.address = address;
    if (contact) hospital.contact = contact;
    if (specialties) hospital.specialties = specialties;
    if (facilities) {
      hospital.facilities = { ...hospital.facilities.toObject(), ...facilities };
    }

    await ward.save();
    res.json({ success: true, message: 'Profile updated successfully', profile: hospital });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// @route  POST /api/hospitals/doctors
// @desc   Add a doctor to hospital staff's hospital (hospitalStaff only)
router.post('/doctors', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const {
      name,
      specialty,
      experience,
      isVisiting,  // ✅ NEW
      schedule     // ✅ NEW — array of { day, startTime, endTime, maxAppointments }
    } = req.body;

    if (!name || !specialty) {
      return res.status(400).json({ success: false, message: 'Name and specialty are required' });
    }

    // ✅ NEW — validate schedule if provided
    if (schedule && schedule.length > 0) {
      for (const slot of schedule) {
        if (!slot.day || !slot.startTime || !slot.endTime) {
          return res.status(400).json({
            success: false,
            message: 'Each schedule slot must have day, startTime and endTime'
          });
        }
      }
    }

    const ward = await Ward.findOne({ 'hospitals.hospitalName': req.user.hospitalName });
    if (!ward) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const hospitalIndex = ward.hospitals.findIndex(h => h.hospitalName === req.user.hospitalName);
    if (hospitalIndex === -1) return res.status(404).json({ success: false, message: 'Hospital not found' });

    ward.hospitals[hospitalIndex].doctors.push({
      name,
      specialty,
      experience: experience || 0,
      isVisiting: isVisiting || false, // ✅ NEW
      schedule: schedule || []          // ✅ NEW
    });
    await ward.save();

    const newDoctor = ward.hospitals[hospitalIndex].doctors[ward.hospitals[hospitalIndex].doctors.length - 1];
    res.status(201).json({ success: true, message: 'Doctor added successfully', doctor: newDoctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PUT /api/hospitals/doctors/:doctorId
// @desc   Edit a doctor (hospitalStaff only)
router.put('/doctors/:doctorId', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const {
      name,
      specialty,
      experience,
      isVisiting,  // ✅ NEW
      schedule     // ✅ NEW
    } = req.body;

    const ward = await Ward.findOne({ 'hospitals.hospitalName': req.user.hospitalName });
    if (!ward) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const hospital = ward.hospitals.find(h => h.hospitalName === req.user.hospitalName);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const doctor = hospital.doctors.id(req.params.doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    if (name) doctor.name = name;
    if (specialty) doctor.specialty = specialty;
    if (experience !== undefined) doctor.experience = experience;
    if (isVisiting !== undefined) doctor.isVisiting = isVisiting; // ✅ NEW

    // ✅ NEW — validate and update schedule
    if (schedule) {
      for (const slot of schedule) {
        if (!slot.day || !slot.startTime || !slot.endTime) {
          return res.status(400).json({
            success: false,
            message: 'Each schedule slot must have day, startTime and endTime'
          });
        }
      }
      doctor.schedule = schedule;
    }

    await ward.save();
    res.json({ success: true, message: 'Doctor updated successfully', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// @route  DELETE /api/hospitals/doctors/:doctorId
// @desc   Remove a doctor (hospitalStaff only)
router.delete('/doctors/:doctorId', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const ward = await Ward.findOne({ 'hospitals.hospitalName': req.user.hospitalName });
    if (!ward) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const hospital = ward.hospitals.find(h => h.hospitalName === req.user.hospitalName);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    const doctorIndex = hospital.doctors.findIndex(d => d._id.toString() === req.params.doctorId);
    if (doctorIndex === -1) return res.status(404).json({ success: false, message: 'Doctor not found' });

    hospital.doctors.splice(doctorIndex, 1);
    await ward.save();

    res.json({ success: true, message: 'Doctor removed successfully' });
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
