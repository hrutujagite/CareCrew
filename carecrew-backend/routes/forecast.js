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
        reportDate: { $gte: date, $lt: nextDate }
      })
      // ── ONLY CHANGE: r.caseCount → r.newConfirmed (matches seed field name)
      const totalCases = reports.reduce((sum, r) => sum + r.newConfirmed, 0);

      last14Days.push({
        date: date.toISOString().split('T')[0],
        cases: totalCases
      });
    }

    // Calculate 3-day moving average for prediction
    const movingAverages = [];
    for (let i = 2; i < last14Days.length; i++) {
      const avg = (
        last14Days[i].cases +
        last14Days[i - 1].cases +
        last14Days[i - 2].cases
      ) / 3;
      movingAverages.push(avg);
    }

    // Calculate trend (slope of last 5 days)
    const recentDays = last14Days.slice(-5);
    const avgRecent = recentDays.reduce(
      (sum, d) => sum + d.cases, 0
    ) / recentDays.length;

    const trend = recentDays[recentDays.length - 1].cases -
      recentDays[0].cases;
    const dailyTrend = trend / 4;

    // Project next 7 days
    const predicted = [];
    let lastValue = last14Days[last14Days.length - 1].cases;

    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      // Moving average projection
      lastValue = Math.max(0, lastValue + dailyTrend * 0.5);

      predicted.push({
        date: date.toISOString().split('T')[0],
        cases: Math.round(lastValue)
      });
    }

    res.json({
      success: true,
      ward,
      actual: last14Days,
      predicted
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
