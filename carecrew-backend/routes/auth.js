const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Ward = require('../models/Ward');
const HospitalCapacity = require('../models/HospitalCapacity');

// @route  POST /api/auth/register
// @desc   Register a new citizen user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, contact, hospitalName, ward } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      contact: contact || '',
      hospitalName: hospitalName || null,
      ward: ward || null
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contact: user.contact,
        hospitalName: user.hospitalName,
        ward: user.ward
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  POST /api/auth/register/hospital
// @desc   Register a new hospital + create hospitalStaff account
router.post('/register/hospital', async (req, res) => {
  try {
    const {
      staffName,
      email,
      password,
      confirmPassword,
      hospitalName,
      address,
      contact,
      ward,
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

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const existingHospital = await Ward.findOne({
      'hospitals.hospitalName': hospitalName
    })
    if (existingHospital) {
      return res.status(400).json({
        message: 'Hospital name already registered in our system'
      })
    }

    const targetWard = await Ward.findOne({ wardName: ward })
    if (!targetWard) {
      return res.status(404).json({ message: 'Ward not found' })
    }

    targetWard.hospitals.push({
      hospitalName,
      address: address || '',
      contact: contact || '',
      lat: parseFloat(lat) || 17.6799,
      lng: parseFloat(lng) || 75.9064,
      totalBeds: parseInt(totalBeds) || 0,
      availableBeds: parseInt(availableBeds) || 0,
      icuTotal: parseInt(icuTotal) || 0,
      icuAvailable: parseInt(icuAvailable) || 0,
      specialties: specialties || [],
      facilityType: facilityType || 'general',
      facilities: facilities || {},
      doctors: []
    })
    await targetWard.save()


    await HospitalCapacity.create({
  hospitalName,
  ward,
  totalBeds: parseInt(totalBeds) || 0,
  availableBeds: parseInt(availableBeds) || 0,
  icuTotal: parseInt(icuTotal) || 0,
  icuAvailable: parseInt(icuAvailable) || 0,
  emergencyBedsTotal: 0,      // ← add
  emergencyBedsAvailable: 0,  // ← add
  oxygenTotal: 0,             // ← was 100, now 0
  oxygenAvailable: 0,         // ← was 80, now 0
  medicineStockPercentage: 100,
  lastUpdated: new Date()
})

    const user = await User.create({
      name: staffName,
      email,
      password,
      role: 'hospitalStaff',
      hospitalName,
      ward,
      contact: contact || ''
    })

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: `Hospital "${hospitalName}" registered successfully!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospitalName: user.hospitalName,
        ward: user.ward
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// @route  POST /api/auth/register/officer
// @desc   Register a new Health Officer account
router.post('/register/officer', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'healthOfficer',
      ward: null,
      hospitalName: null
    })

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      message: 'Health Officer account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

// @route  POST /api/auth/login
// @desc   Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contact: user.contact || '',
        hospitalName: user.hospitalName,
        ward: user.ward
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
})

module.exports = router;