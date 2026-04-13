const express = require('express');
const router = express.Router();
const DiseaseReport = require('../models/DiseaseReport');
const Alert = require('../models/Alert');
const Ward = require('../models/Ward');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  POST /api/disease/submit
// @desc   Submit disease report (hospitalStaff only)
router.post('/submit', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);   
    const {
      wardName,
      diseaseName,
      newConfirmed,
      newRecovered,
      newDeaths,
      customDiseaseName, // ✅ NEW
    } = req.body;

    // ✅ NEW — if Other selected, customDiseaseName is required
    if (diseaseName === 'Other' && !customDiseaseName) {
      return res.status(400).json({ 
        message: 'Custom disease name is required when selecting Other' 
      });
    }

    // Create disease report
    const report = await DiseaseReport.create({
      hospitalName: req.user.hospitalName,
      wardName,
      diseaseName,
      customDiseaseName: diseaseName === 'Other' ? customDiseaseName : null, // ✅ NEW
      newConfirmed: newConfirmed || 0,
      newRecovered: newRecovered || 0,
      newDeaths: newDeaths || 0,
      submittedBy: req.user._id
    });

    // Update ward
    const ward = await Ward.findOne({ wardName });
    if (ward) {
      ward.activeCaseCount = Math.max(
        0,
        (ward.activeCaseCount || 0) + Number(newConfirmed || 0) - Number(newRecovered || 0) - Number(newDeaths || 0)
      );
      ward.lastUpdated = Date.now();

      // topDisease = disease with highest total confirmed cases for this ward
      const allReports = await DiseaseReport.find({ wardName });
      const diseaseMap = {};
      allReports.forEach(r => {
        // ✅ NEW — use customDiseaseName if Other, else use diseaseName
        const name = r.diseaseName === 'Other' && r.customDiseaseName 
          ? r.customDiseaseName 
          : r.diseaseName;
        diseaseMap[name] = (diseaseMap[name] || 0) + r.newConfirmed;
      });
      ward.topDisease = Object.keys(diseaseMap).sort(
        (a, b) => diseaseMap[b] - diseaseMap[a]
      )[0] || null;

      // Risk level based on activeCaseCount
      let severity = 'Green';
      if (ward.activeCaseCount > 50) severity = 'Red';
      else if (ward.activeCaseCount > 25) severity = 'Yellow';
      ward.riskLevel = severity;

      // Recalculate HAI score
      const totalAvailableBeds = ward.hospitals.reduce(
        (sum, h) => sum + (h.availableBeds || 0), 0
      );
      ward.accessibilityIndex = Math.round(Math.min(100, Math.max(0,
        (totalAvailableBeds / (ward.population || 1)) * 1000 +
        ward.hospitals.length * 10 -
        ward.activeCaseCount * 2
      )));

      ward.lastUpdated = Date.now();
      await ward.save();

      // Create alert if Yellow or Red
      if (severity !== 'Green') {
        await Alert.updateMany(
          { wardName, alertType: 'Outbreak', isActive: true },
          { isActive: false, resolvedDate: Date.now() }
        );

        await Alert.create({
          wardName,
          alertType: 'Outbreak',
          severity,
          message: `${severity === 'Red' ? 'Critical' : 'Warning'}: ${ward.activeCaseCount} active ${ward.topDisease} cases detected in ${wardName}`,
          diseaseName: ward.topDisease,
          caseCount: ward.activeCaseCount,
          isActive: true,
          hospitalName: req.user.hospitalName // ✅ BUG FIX 3 — added hospitalName
        });
      } else {
        await Alert.updateMany(
          { wardName, alertType: 'Outbreak', isActive: true },
          { isActive: false, resolvedDate: Date.now() }
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Disease report submitted successfully',
      report,
      wardRiskLevel: ward ? ward.riskLevel : 'Green',
      wardActiveCases: ward ? ward.activeCaseCount : 0
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
    }).sort({ createdAt: -1 }); // ✅ BUG FIX 2 — reportDate → createdAt

    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/disease/analytics
// @desc   Get analytics for hospital dashboard
router.get('/analytics', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const reports = await DiseaseReport.find({
      hospitalName: req.user.hospitalName
    });

    const totalConfirmed = reports.reduce((sum, r) => sum + r.newConfirmed, 0);
    const totalRecovered = reports.reduce((sum, r) => sum + r.newRecovered, 0);
    const totalDeaths = reports.reduce((sum, r) => sum + r.newDeaths, 0);
    const activeCases = Math.max(0, totalConfirmed - totalRecovered - totalDeaths);

    // Disease-wise breakdown
    const diseaseMap = {};
    reports.forEach(r => {
      // ✅ NEW — show customDiseaseName in breakdown instead of "Other"
      const name = r.diseaseName === 'Other' && r.customDiseaseName
        ? r.customDiseaseName
        : r.diseaseName;
      if (!diseaseMap[name]) {
        diseaseMap[name] = { confirmed: 0, recovered: 0, deaths: 0 };
      }
      diseaseMap[name].confirmed += r.newConfirmed;
      diseaseMap[name].recovered += r.newRecovered;
      diseaseMap[name].deaths += r.newDeaths;
    });

    // Daily trend - last 30 days
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayReports = reports.filter(r => {
        const rd = new Date(r.createdAt); // ✅ BUG FIX 1 — reportDate → createdAt
        return rd >= date && rd < nextDate;
      });

      last30Days.push({
        date: date.toISOString().split('T')[0],
        confirmed: dayReports.reduce((sum, r) => sum + r.newConfirmed, 0),
        recovered: dayReports.reduce((sum, r) => sum + r.newRecovered, 0),
        deaths: dayReports.reduce((sum, r) => sum + r.newDeaths, 0)
      });
    }

    res.json({
      success: true,
      summary: { totalConfirmed, totalRecovered, totalDeaths, activeCases },
      diseaseBreakdown: diseaseMap,
      dailyTrend: last30Days
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;