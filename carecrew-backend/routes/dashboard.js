const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');
const Alert = require('../models/Alert');
const DiseaseReport = require('../models/DiseaseReport');
const HospitalCapacity = require('../models/HospitalCapacity');
const Appointment = require('../models/Appointment');
const { protect, authorizeRoles } = require('../middleware/auth');

// @route  GET /api/dashboard/public
// @desc   Public stats for homepage — NO login required
router.get('/public', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayReports = await DiseaseReport.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const activeCasesToday = todayReports.reduce(
      (sum, r) => sum + r.newConfirmed, 0
    );

    const hospitalsReporting = await HospitalCapacity.distinct(
      'hospitalName', { lastUpdated: { $gte: today } }
    );

    const latestCapacities = await HospitalCapacity.aggregate([
      { $sort: { lastUpdated: -1 } },
      { $group: { _id: '$hospitalName', availableBeds: { $first: '$availableBeds' } } }
    ]);
    const totalAvailableBeds = latestCapacities.reduce(
      (sum, h) => sum + (h.availableBeds || 0), 0
    );

    const appointmentsToday = await Appointment.countDocuments({
      preferredDate: { $gte: today, $lt: tomorrow },
      status: 'Confirmed'
    });

    const activeAlerts = await Alert.find({ isActive: true })
      .sort({ triggeredDate: -1 });

    res.json({
      success: true,
      stats: {
        activeCasesToday,
        hospitalsReporting: hospitalsReporting.length,
        totalAvailableBeds,
        appointmentsToday
      },
      alerts: activeAlerts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/dashboard/wards
// @desc   Get all wards with live data — Health Officer only
router.get('/wards', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const wards = await Ward.find();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const wardData = await Promise.all(
      wards.map(async (ward) => {
        try {
          const todayReports = await DiseaseReport.find({
            wardName: ward.wardName,
            createdAt: { $gte: today, $lt: tomorrow }
          });
          const todayCases = todayReports.reduce(
            (sum, r) => sum + r.newConfirmed, 0
          );

          const diseaseCounts = {};
          todayReports.forEach(r => {
            diseaseCounts[r.diseaseName] =
              (diseaseCounts[r.diseaseName] || 0) + r.newConfirmed;
          });
          const topDisease = Object.keys(diseaseCounts).sort(
            (a, b) => diseaseCounts[b] - diseaseCounts[a]
          )[0] || ward.topDisease || 'None';

          // ── Try multiple field names for ward in HospitalCapacity ──
          let latestCapacity = await HospitalCapacity.findOne({
            ward: ward.wardName
          }).sort({ lastUpdated: -1 });

          if (!latestCapacity) {
            latestCapacity = await HospitalCapacity.findOne({
              wardName: ward.wardName
            }).sort({ lastUpdated: -1 });
          }

          if (!latestCapacity && ward.hospitals && ward.hospitals.length > 0) {
            const hospitalNames = ward.hospitals.map(h => h.hospitalName).filter(Boolean);
            if (hospitalNames.length > 0) {
              latestCapacity = await HospitalCapacity.findOne({
                hospitalName: { $in: hospitalNames }
              }).sort({ lastUpdated: -1 });
            }
          }

          const defaultAvailableBeds = ward.hospitals ? ward.hospitals.reduce(
            (sum, h) => sum + (h.availableBeds || 0), 0
          ) : 0;
          const defaultTotalBeds = ward.hospitals ? ward.hospitals.reduce(
            (sum, h) => sum + (h.totalBeds || 0), 0
          ) : 0;
          const defaultIcuAvailable = ward.hospitals ? ward.hospitals.reduce(
            (sum, h) => sum + (h.icuAvailable || 0), 0
          ) : 0;
          const defaultIcuTotal = ward.hospitals ? ward.hospitals.reduce(
            (sum, h) => sum + (h.icuTotal || 0), 0
          ) : 0;

          const appointmentsToday = await Appointment.countDocuments({
            ward: ward.wardName,
            preferredDate: { $gte: today, $lt: tomorrow },
            status: 'Confirmed'
          });

          const reportingHospital = ward.hospitals && ward.hospitals.length > 0
            ? ward.hospitals[0].hospitalName
            : '';

          return {
            wardName: ward.wardName,
            wardCode: ward.wardCode || '',
            population: ward.population || 1,
            todayCases,
            activeCases: ward.activeCaseCount || 0,
            topDisease,
            availableBeds: latestCapacity
              ? latestCapacity.availableBeds
              : defaultAvailableBeds,
            totalBeds: latestCapacity
              ? latestCapacity.totalBeds
              : defaultTotalBeds,
            icuAvailable: latestCapacity
              ? latestCapacity.icuAvailable
              : defaultIcuAvailable,
            icuTotal: latestCapacity
              ? latestCapacity.icuTotal
              : defaultIcuTotal,
            emergencyBedsAvailable: latestCapacity
              ? latestCapacity.emergencyBedsAvailable
              : 0,
            emergencyBedsTotal: latestCapacity
              ? latestCapacity.emergencyBedsTotal
              : 0,
            hospitals: ward.hospitals ? ward.hospitals.length : 0,
            hospitalName: reportingHospital,
            appointmentsToday,
            riskLevel: ward.riskLevel || 'Green',
            accessibilityIndex: ward.accessibilityIndex || 0,
            medicineStockPercentage: latestCapacity
              ? latestCapacity.medicineStockPercentage
              : null,
            lastUpdated: ward.lastUpdated
          };
        } catch (wardErr) {
          console.error(`Error processing ward ${ward.wardName}:`, wardErr);
          return {
            wardName: ward.wardName,
            wardCode: ward.wardCode || '',
            population: ward.population || 1,
            todayCases: 0,
            activeCases: ward.activeCaseCount || 0,
            topDisease: ward.topDisease || 'None',
            availableBeds: 0,
            totalBeds: 0,
            icuAvailable: 0,
            icuTotal: 0,
            emergencyBedsAvailable: 0,
            emergencyBedsTotal: 0,
            hospitals: ward.hospitals ? ward.hospitals.length : 0,
            hospitalName: '',
            appointmentsToday: 0,
            riskLevel: ward.riskLevel || 'Green',
            accessibilityIndex: 0,
            medicineStockPercentage: null,
            lastUpdated: ward.lastUpdated
          };
        }
      })
    );

    res.json({
      success: true,
      wards: wardData
    });
  } catch (error) {
    console.error('Dashboard wards error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/dashboard/alerts
// @desc   Get active alerts — accessible to all logged in users
router.get('/alerts', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ isActive: true })
      .populate('acknowledgedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ triggeredDate: -1 });
    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/dashboard/charts
// @desc   Chart data — Health Officer only
router.get('/charts', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  try {
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const reports = await DiseaseReport.find({
        createdAt: { $gte: date, $lt: nextDate }
      });

      const dayEntry = { date: date.toISOString().split('T')[0] };
      reports.forEach(r => {
        dayEntry[r.diseaseName] = (dayEntry[r.diseaseName] || 0) + r.newConfirmed;
      });

      last14Days.push(dayEntry);
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekReports = await DiseaseReport.find({
      createdAt: { $gte: weekAgo }
    });

    const diseaseTotals = {};
    weekReports.forEach(r => {
      diseaseTotals[r.diseaseName] =
        (diseaseTotals[r.diseaseName] || 0) + r.newConfirmed;
    });

    const topDiseases = Object.entries(diseaseTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([disease, count]) => ({ disease, count }));

    res.json({
      success: true,
      dailyCases: last14Days,
      topDiseases
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route  GET /api/dashboard/hospital
// @desc   Hospital staff dashboard summary
router.get('/hospital', protect, authorizeRoles('hospitalStaff'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayReports = await DiseaseReport.find({
      hospitalName: req.user.hospitalName,
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const todayCases = todayReports.reduce((sum, r) => sum + r.newConfirmed, 0);

    const latestCapacity = await HospitalCapacity.findOne({
      hospitalName: req.user.hospitalName
    }).sort({ lastUpdated: -1 });

    const appointmentsToday = await Appointment.countDocuments({
      hospitalName: req.user.hospitalName,
      preferredDate: { $gte: today, $lt: tomorrow },
      status: 'Confirmed'
    });

    const activeAlerts = await Alert.find({
      wardName: req.user.ward,
      isActive: true
    });

    const wardDoc = await Ward.findOne({ wardName: req.user.ward });

    res.json({
      success: true,
      summary: {
        todayCases,
        availableBeds: latestCapacity ? latestCapacity.availableBeds : 0,
        appointmentsToday,
        activeAlerts: activeAlerts.length
      },
      latestCapacity,
      activeAlerts,
      riskLevel: wardDoc ? wardDoc.riskLevel : 'Green'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;