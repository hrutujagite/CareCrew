const express = require('express');
const router = express.Router();
const HealthCamp = require('../models/HealthCamp');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  GET /api/healthcamps
// @desc   Get all active/upcoming health camps — PUBLIC
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const camps = await HealthCamp.find({
      isActive: true,
      endDate: { $gte: now }
    }).sort({ startDate: 1 });

    res.json({ success: true, camps });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/healthcamps/all
// @desc   Get all camps including completed (hospitalStaff only)
router.get('/all', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const camps = await HealthCamp.find({
      hospitalName: req.user.hospitalName
    }).sort({ startDate: -1 });

    res.json({ success: true, camps });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  POST /api/healthcamps/create
// @desc   Create a health camp (hospitalStaff only)
router.post('/create', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const {
      title,
      description,
      campType,
      customCampType, // ✅ NEW
      startDate,
      endDate,
      timing,
      location,
      contactInfo
    } = req.body;

    // ✅ NEW — if Other selected, customCampType is required
    if (campType === 'Other' && !customCampType) {
      return res.status(400).json({
        message: 'Please specify the camp type'
      });
    }

    const camp = await HealthCamp.create({
      hospitalName: req.user.hospitalName,
      wardName: req.user.ward,
      title,
      description: description || '',
      campType,
      customCampType: campType === 'Other' ? customCampType : null, // ✅ NEW
      startDate,
      endDate,
      timing,
      location,
      contactInfo,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Health camp created successfully',
      camp
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PUT /api/healthcamps/:id
// @desc   Update a health camp (hospitalStaff only)
router.put('/:id', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const camp = await HealthCamp.findById(req.params.id);

    if (!camp) {
      return res.status(404).json({ message: 'Health camp not found' });
    }

    if (camp.hospitalName !== req.user.hospitalName) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // ✅ NEW — validate customCampType on update too
    if (req.body.campType === 'Other' && !req.body.customCampType) {
      return res.status(400).json({
        message: 'Please specify the camp type'
      });
    }

    // ✅ NEW — clear customCampType if campType changed away from Other
    if (req.body.campType && req.body.campType !== 'Other') {
      req.body.customCampType = null;
    }

    const updated = await HealthCamp.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );

    res.json({ success: true, camp: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  DELETE /api/healthcamps/:id
// @desc   Cancel a health camp
router.delete('/:id', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const camp = await HealthCamp.findById(req.params.id);

    if (!camp) {
      return res.status(404).json({ message: 'Health camp not found' });
    }

    if (camp.hospitalName !== req.user.hospitalName) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    camp.isActive = false;
    await camp.save();

    res.json({ success: true, message: 'Health camp cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;