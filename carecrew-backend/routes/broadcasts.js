const express = require('express');
const router = express.Router();
const Broadcast = require('../models/Broadcast');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  POST /api/broadcasts
// @desc   Create broadcast (Officer)
router.post('/', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const { title, category, targetAudience, targetWard, targetHospitalName, priority, message, expiresAt } = req.body;
    const broadcast = await Broadcast.create({
      title,
      category,
      targetAudience,
      targetWard,
      targetHospitalName,
      priority,
      message,
      expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      postedBy: req.user._id
    });
    res.status(201).json({ success: true, broadcast });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/broadcasts/public
// @desc   Get all active broadcasts for public homepage (no auth required)
router.get('/public', async (req, res) => {
  try {
    const now = new Date();
    const broadcasts = await Broadcast.find({
      isActive: true,
      expiresAt: { $gt: now }
    }).sort({ createdAt: -1 });
    res.json({ success: true, broadcasts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/broadcasts
// @desc   Get all broadcasts (Officer)
router.get('/', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 });
    res.json({ success: true, broadcasts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/broadcasts/hospital
// @desc   Get broadcasts for this hospital
router.get('/hospital', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const now = new Date();
    const broadcasts = await Broadcast.find({
      isActive: true,
      expiresAt: { $gt: now },
      $or: [
        { targetAudience: 'all_hospitals' },
        { targetAudience: 'specific_hospital', targetHospitalName: req.user.hospitalName },
        { targetAudience: 'ward_citizens', targetWard: req.user.ward }
      ]
    }).sort({ createdAt: -1 });
    res.json({ success: true, broadcasts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/broadcasts/citizen
// @desc   Get broadcasts for citizen's ward (No auth needed)
router.get('/citizen', async (req, res) => {
  try {
    const ward = req.query.ward;
    const now = new Date();
    
    const query = { isActive: true, expiresAt: { $gt: now } };
    
    if (ward) {
      query.$or = [
        { targetAudience: 'all_citizens' },
        { targetAudience: 'ward_citizens', targetWard: ward }
      ];
    } else {
      query.targetAudience = 'all_citizens';
    }

    const broadcasts = await Broadcast.find(query).sort({ createdAt: -1 });
    res.json({ success: true, broadcasts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/broadcasts/:id
// @desc   Get single broadcast
router.get('/:id', protect, async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, broadcast });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PATCH /api/broadcasts/:id
// @desc   Edit broadcast (Officer)
router.patch('/:id', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const broadcast = await Broadcast.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, broadcast });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  DELETE /api/broadcasts/:id
// @desc   Delete broadcast (Officer)
router.delete('/:id', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const broadcast = await Broadcast.findByIdAndDelete(req.params.id);
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PATCH /api/broadcasts/:id/view
// @desc   Increment viewCount
router.patch('/:id/view', async (req, res) => {
  try {
    const broadcast = await Broadcast.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, broadcast });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;