const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');
const Alert = require('../models/Alert');
const DiseaseReport = require('../models/DiseaseReport');
const HospitalCapacity = require('../models/HospitalCapacity');
const Appointment = require('../models/Appointment');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  GET /api/dashboard/wards
// @desc   Get all wards with live data for dashboard
router.get('/wards', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const wards = await Ward.find();

    // For each ward get today's case count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const wardData = await Promise.all(
      wards.map(async (ward) => {
        // Get today's reports for this ward
        const todayReports = await DiseaseReport.find({
          wardName: ward.wardName,
          date: { $gte: today }
        });

        // Get total cases today
        const todayCases = todayReports.reduce(
          (sum, r) => sum + r.caseCount, 0
        );

        // Get top disease today
        const diseaseCounts = {};
        todayReports.forEach(r => {
          diseaseCounts[r.diseaseName] =
            (diseaseCounts[r.diseaseName] || 0) + r.caseCount;
        });
        const topDisease = Object.keys(diseaseCounts).sort(
          (a, b) => diseaseCounts[b] - diseaseCounts[a]
        )[0] || ward.topDisease || 'None';

        // Get latest capacity for hospitals in this ward
        const latestCapacity = await HospitalCapacity.findOne({
          ward: ward.wardName
        }).sort({ lastUpdated: -1 });

        return {
          wardName: ward.wardName,
          wardCode: ward.wardCode,
          population: ward.population,
          todayCases,
          activeCaseCount: ward.activeCaseCount,
          topDisease,
          availableBeds: latestCapacity ? latestCapacity.availableBeds : 0,
          totalBeds: latestCapacity ? latestCapacity.totalBeds : 0,
          icuAvailable: latestCapacity ? latestCapacity.icuAvailable : 0,
          icuTotal: latestCapacity ? latestCapacity.icuTotal : 0,
          riskLevel: ward.riskLevel,
          accessibilityIndex: ward.accessibilityIndex,
          lastUpdated: ward.lastUpdated
        };
      })
    );

    // Summary stats
    const totalCasesToday = wardData.reduce((sum, w) => sum + w.todayCases, 0);
    const wardsOnAlert = wardData.filter(
      w => w.riskLevel === 'Yellow' || w.riskLevel === 'Red'
    ).length;
    const hospitalsReporting = await HospitalCapacity.distinct('hospitalName', {
      lastUpdated: { $gte: today }
    });
    const appointmentsToday = await Appointment.countDocuments({
      bookingDate: { $gte: today }
    });

    res.json({
      success: true,
      summary: {
        totalCasesToday,
        wardsOnAlert,
        hospitalsReporting: hospitalsReporting.length,
        appointmentsToday
      },
      wards: wardData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/dashboard/alerts
// @desc   Get all active alerts
router.get('/alerts', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ isActive: true }).sort({
      triggeredDate: -1
    });

    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/dashboard/charts
// @desc   Get chart data - top diseases and daily cases
router.get('/charts', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    // Last 14 days daily case counts
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const reports = await DiseaseReport.find({
        date: { $gte: date, $lt: nextDate }
      });

      const totalCases = reports.reduce((sum, r) => sum + r.caseCount, 0);

      last14Days.push({
        date: date.toISOString().split('T')[0],
        cases: totalCases
      });
    }

    // Top 5 diseases this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekReports = await DiseaseReport.find({
      date: { $gte: weekAgo }
    });

    const diseaseTotals = {};
    weekReports.forEach(r => {
      diseaseTotals[r.diseaseName] =
        (diseaseTotals[r.diseaseName] || 0) + r.caseCount;
    });

    const topDiseases = Object.entries(diseaseTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      success: true,
      dailyCases: last14Days,
      topDiseases
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;