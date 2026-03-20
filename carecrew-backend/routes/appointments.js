const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  POST /api/appointments/book
// @desc   Book an appointment (citizen only)
router.post('/book', protect, authorizeRoles('citizen'), async (req, res) => {
  try {
    const {
      hospitalName,
      ward,
      specialty,
      doctorName,
      preferredDate,
      timeSlot,
      chiefComplaint,
      citizenName,
      contact
    } = req.body;

    const appointment = await Appointment.create({
      citizenName,
      contact,
      hospitalName,
      ward,
      specialty,
      doctorName,
      preferredDate,
      timeSlot,
      chiefComplaint: chiefComplaint || '',
      bookedBy: req.user._id,
      status: 'Confirmed',
      bookingReference: 'CC' + Math.floor(100000 + Math.random() * 900000)
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

// @route  GET /api/appointments/my
// @desc   Get appointments for logged in citizen
router.get('/my', protect, authorizeRoles('citizen'), async (req, res) => {
  try {
    const appointments = await Appointment.find({
      bookedBy: req.user._id
    }).sort({ preferredDate: -1 });

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/appointments/hospital
// @desc   Get all appointments for this hospital (hospitalStaff only)
router.get('/hospital', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      hospitalName: req.user.hospitalName
    }).sort({ preferredDate: -1 }).limit(100);

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/appointments/all
// @desc   Get all appointments (healthOfficer only)
router.get('/all', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .sort({ preferredDate: -1 })
      .limit(100);

    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  PUT /api/appointments/:id/cancel
// @desc   Cancel an appointment (citizen only)
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
