const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  POST /api/appointments/book
// @desc   Book an OPD appointment
router.post('/book', protect, authorizeRoles('citizen'), async (req, res) => {
  try {
    const {
      hospitalName,
      ward,
      department,
      preferredDate,
      citizenName,
      contact
    } = req.body;

    const appointment = await Appointment.create({
      citizenName,
      contact,
      hospitalName,
      ward,
      department,
      preferredDate,
      bookedBy: req.user._id,
      status: 'Confirmed'
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment,
      bookingReference: appointment.bookingReference
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/appointments
// @desc   Get appointments for logged in citizen
router.get('/', protect, authorizeRoles('citizen'), async (req, res) => {
  try {
    const appointments = await Appointment.find({
      bookedBy: req.user._id
    }).sort({ bookingDate: -1 });

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/appointments/all
// @desc   Get all appointments for health officer
router.get('/all', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .sort({ bookingDate: -1 })
      .limit(50);

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PUT /api/appointments/:id/cancel
// @desc   Cancel an appointment
router.put('/:id/cancel', protect, authorizeRoles('citizen'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.bookedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    appointment.status = 'Cancelled';
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;