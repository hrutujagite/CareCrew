const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');
const { protect } = require('../middleware/auth');

// @route  GET /api/wards/all
// @desc   Get all wards
router.get('/all', protect, async (req, res) => {
  try {
    const wards = await Ward.find();
    res.json({ success: true, wards });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/wards/:wardName/index
// @desc   Get Healthcare Accessibility Index for a ward
router.get('/:wardName/index', protect, async (req, res) => {
  try {
    const { wardName } = req.params;
    const ward = await Ward.findOne({ wardName });

    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    const totalAvailableBeds = ward.hospitals.reduce(
      (sum, h) => sum + (h.availableBeds || 0), 0
    );
    const hospitalCount = ward.hospitals.length;

    const index = Math.max(
      0,
      Math.min(
        100,
        (totalAvailableBeds / ward.population) * 1000 +
        hospitalCount * 10 -
        ward.activeCaseCount * 2
      )
    );

    let indexLevel = 'Good';
    if (index < 40) indexLevel = 'Poor';
    else if (index < 70) indexLevel = 'Moderate';

    res.json({
      success: true,
      wardName,
      accessibilityIndex: Math.round(index),
      indexLevel,
      totalAvailableBeds,
      hospitalCount,
      activeCaseCount: ward.activeCaseCount,
      population: ward.population
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/wards/:wardName
// @desc   Get single ward details
router.get('/:wardName', protect, async (req, res) => {
  try {
    const ward = await Ward.findOne({ wardName: req.params.wardName });

    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    res.json({ success: true, ward });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;