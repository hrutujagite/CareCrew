const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const router = express.Router();
const DiseaseReport = require('../models/DiseaseReport');
const { protect } = require('../middleware/auth');

// @route  GET /api/forecast/:ward
// @desc   Get disease forecast for a ward
router.get('/:ward', protect, async (req, res) => {
  try {
    const { ward } = req.params;

    // Get last 14 days of data for this ward
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const reports = await DiseaseReport.find({
        wardName: ward,
        createdAt: { $gte: date, $lt: nextDate }
      });

      const totalCases = reports.reduce(
        (sum, r) => sum + (r.newConfirmed || 0), 0
      );

      last14Days.push({
        date: date.toISOString().split('T')[0],
        cases: totalCases
      });
    }

    // ✅ FIXED: Proper 3-day moving average forecast
    let allData = last14Days.map(d => d.cases);
    const predicted = [];

    // Safety check
    if (allData.length < 3) {
      return res.json({
        success: true,
        ward,
        actual: last14Days,
        predicted: []
      });
    }

    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const n = allData.length;

      let avg = (
        allData[n - 1] +
        allData[n - 2] +
        allData[n - 3]
      ) / 3;

      avg = Math.max(0, Math.round(avg));

      predicted.push({
        date: date.toISOString().split('T')[0],
        cases: avg
      });

      allData.push(avg); // ⭐ KEY FIX
    }

    res.json({
      success: true,
      ward,
      actual: last14Days,
      predicted
    });

  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
