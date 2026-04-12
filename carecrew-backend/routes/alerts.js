const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  POST /api/alerts
// @desc   Save a threshold-triggered alert to DB (called from frontend when threshold is crossed)
// @access Health Officer only
router.post('/', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const {
      wardName,
      alertType,
      severity,
      message,
      recommendation,
      isThreshold
    } = req.body;

    if (!wardName || !alertType || !severity || !message) {
      return res.status(400).json({
        success: false,
        message: 'wardName, alertType, severity, and message are required'
      });
    }

    // Avoid duplicate active threshold alerts for same ward + type
    const existing = await Alert.findOne({
      wardName,
      alertType,
      isActive: true,
      isThreshold: true,
      status: { $in: ['pending', 'acknowledged'] }
    });

    if (existing) {
      // Update the message in case the value changed (e.g. cases went higher)
      existing.message = message;
      existing.recommendation = recommendation || existing.recommendation;
      existing.triggeredDate = new Date();
      await existing.save();
      return res.json({ success: true, alert: existing, updated: true });
    }

    const alert = await Alert.create({
      wardName,
      alertType,
      severity,
      message,
      recommendation: recommendation || null,
      isThreshold: isThreshold || true,
      isActive: true,
      status: 'pending',
      triggeredDate: new Date()
    });

    res.status(201).json({ success: true, alert, created: true });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PATCH /api/alerts/:id/acknowledge
// @desc   Mark alert as acknowledged
// @access Health Officer only
router.patch('/:id/acknowledge', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (alert.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already resolved and cannot be acknowledged'
      });
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = req.user._id;
    alert.acknowledgedAt = new Date();
    await alert.save();

    // Populate acknowledgedBy name for response
    await alert.populate('acknowledgedBy', 'name email');

    res.json({ success: true, alert });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PATCH /api/alerts/:id/resolve
// @desc   Mark alert as resolved (also sets isActive to false)
// @access Health Officer only
router.patch('/:id/resolve', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (alert.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already resolved'
      });
    }

    alert.status = 'resolved';
    alert.isActive = false;
    alert.resolvedBy = req.user._id;
    alert.resolvedAt = new Date();
    alert.resolvedDate = new Date();
    await alert.save();

    await alert.populate('resolvedBy', 'name email');

    res.json({ success: true, alert });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/alerts
// @desc   Get all alerts with optional status filter
// @access Health Officer only
router.get('/', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const { status, wardName, isActive } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (wardName) filter.wardName = wardName;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const alerts = await Alert.find(filter)
      .populate('acknowledgedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ triggeredDate: -1 });

    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/alerts/history
// @desc   Get resolved alerts (audit log)
// @access Health Officer only
router.get('/history', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const alerts = await Alert.find({ status: 'resolved' })
      .populate('acknowledgedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ resolvedAt: -1 })
      .limit(100);

    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
