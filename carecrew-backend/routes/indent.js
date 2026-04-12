const express = require('express');
const router = express.Router();
const IndentRequest = require('../models/IndentRequest');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  POST /api/indent/submit
// @desc   Raise an indent request (Hospital)
router.post('/submit', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const { itemName, itemType, quantityRequired, urgency, reason } = req.body;
    const request = await IndentRequest.create({
      hospitalName: req.user.hospitalName,
      wardName: req.user.ward,
      itemName,
      itemType,
      quantityRequired,
      urgency,
      reason,
      submittedBy: req.user._id
    });
    res.status(201).json({ success: true, request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/indent/hospital
// @desc   Get this hospital's requests
router.get('/hospital', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const requests = await IndentRequest.find({ hospitalName: req.user.hospitalName })
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/indent/all
// @desc   Get all indent requests (Officer)
router.get('/all', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const requests = await IndentRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/indent/:id
// @desc   Get single indent request
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await IndentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    // Auth check
    if (req.user.role !== 'healthOfficer' && request.hospitalName !== req.user.hospitalName) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PATCH /api/indent/:id/review
// @desc   Approve/reject request (Officer)
router.patch('/:id/review', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    const request = await IndentRequest.findByIdAndUpdate(
      req.params.id, 
      { 
        status, 
        reviewNote, 
        reviewedBy: req.user._id, 
        reviewedAt: Date.now() 
      }, 
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PATCH /api/indent/:id/cancel
// @desc   Cancel a pending indent request (Hospital)
router.patch('/:id/cancel', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const request = await IndentRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    if (request.hospitalName !== req.user.hospitalName) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only cancel pending requests' });
    }

    request.status = 'rejected'; // Or maybe you'd add 'cancelled' to Enum if schema permitted
    request.reviewNote = 'Cancelled by hospital';
    await request.save();
    
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
