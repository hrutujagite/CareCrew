const express = require('express');
const router = express.Router();
const DiseaseReport = require('../models/DiseaseReport');
const Alert = require('../models/Alert');
const Ward = require('../models/Ward');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  POST /api/disease/submit
// @desc   Submit disease report
router.post('/submit', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const {
      wardName,
      diseaseName,
      caseCount,
      labConfirmed,
      suspected,
      labName,
      testType,
      positiveCount,
      negativeCount,
      pendingCount,
      date
    } = req.body;

    // Create disease report
    const report = await DiseaseReport.create({
      hospitalName: req.user.hospitalName,
      wardName,
      diseaseName,
      caseCount,
      labConfirmed: labConfirmed || 0,
      suspected: suspected || 0,
      labName: labName || null,
      testType: testType || null,
      positiveCount: positiveCount || 0,
      negativeCount: negativeCount || 0,
      pendingCount: pendingCount || 0,
      submittedBy: req.user._id,
      date: date || Date.now()
    });

    // Update ward active case count
    const ward = await Ward.findOne({ wardName });
    if (ward) {
      ward.activeCaseCount += caseCount;
      ward.topDisease = diseaseName;
      ward.lastUpdated = Date.now();

      // Threshold logic - determine risk level
      let severity = 'Green';
      let alertMessage = '';

      if (ward.activeCaseCount > 50) {
        severity = 'Red';
        alertMessage = `Critical outbreak alert in ${wardName}: ${ward.activeCaseCount} active ${diseaseName} cases detected`;
      } else if (ward.activeCaseCount > 25) {
        severity = 'Yellow';
        alertMessage = `Warning: High ${diseaseName} cases in ${wardName}: ${ward.activeCaseCount} cases detected`;
      }

      ward.riskLevel = severity;

      // Calculate accessibility index
      const hospitalCount = ward.hospitals.length;
      const availableBeds = ward.hospitals.reduce(
        (sum, h) => sum + (h.availableBeds || 0), 0
      );
      ward.accessibilityIndex = Math.max(
        0,
        Math.min(
          100,
          (availableBeds / ward.population) * 1000 +
          hospitalCount * 10 -
          ward.activeCaseCount * 2
        )
      );

      await ward.save();

      // Create alert if Yellow or Red
      if (severity !== 'Green') {
        // Deactivate old alerts for this ward
        await Alert.updateMany(
          { wardName, alertType: 'outbreak', isActive: true },
          { isActive: false, resolvedDate: Date.now() }
        );

        // Create new alert
        await Alert.create({
          wardName,
          alertType: 'outbreak',
          severity,
          message: alertMessage,
          diseaseName,
          caseCount: ward.activeCaseCount,
          isActive: true
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Disease report submitted successfully',
      report,
      wardRiskLevel: ward ? ward.riskLevel : 'Green'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/disease/history
// @desc   Get disease report history for this hospital
router.get('/history', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const reports = await DiseaseReport.find({
      hospitalName: req.user.hospitalName
    }).sort({ date: -1 });

    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;