const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const router = express.Router();
const DiseaseReport = require('../models/DiseaseReport');
const Ward = require('../models/Ward');
const { protect } = require('../middleware/auth');

// ─── Holt-Winters Double Exponential Smoothing ─────────────────────────────
// α (alpha) = level smoothing — how fast to react to new data
// β (beta)  = trend smoothing — how fast to update trend direction
// WHO/CDC epidemic forecasting typically uses α=0.3, β=0.1
const ALPHA = 0.3;
const BETA  = 0.1;

function holtWinters(series) {
  // Need at least 3 data points
  if (!series || series.length < 3) return null;

  // Filter out leading zeros to avoid flat initialisation
  // Find first non-zero index
  let startIdx = series.findIndex(v => v > 0);
  if (startIdx === -1) startIdx = 0; // all zeros — use as is

  const data = series.slice(startIdx);
  if (data.length < 3) {
    // Pad with the series as-is
    return null;
  }

  // Initialise level and trend
  let level = data[0];
  let trend = (data[data.length - 1] - data[0]) / Math.max(data.length - 1, 1);

  const smoothed = [];   // model's fitted values on training data
  const errors   = [];   // abs errors for confidence band calculation

  for (let i = 0; i < data.length; i++) {
    const prevLevel = level;
    const prevTrend = trend;

    // Update level and trend
    level = ALPHA * data[i] + (1 - ALPHA) * (prevLevel + prevTrend);
    trend = BETA  * (level - prevLevel) + (1 - BETA) * prevTrend;

    // One-step-ahead fitted value
    const fitted = prevLevel + prevTrend;
    smoothed.push(Math.max(0, Math.round(fitted)));
    errors.push(Math.abs(data[i] - fitted));
  }

  // Mean absolute error for confidence band
  const mae = errors.reduce((s, e) => s + e, 0) / errors.length;

  return { level, trend, mae, smoothed, startIdx };
}

// ─── Risk Score Calculator ─────────────────────────────────────────────────
// Combines: trend direction, week-over-week acceleration, and case density
function calcRiskScore(series, predicted, population) {
  const now = series;
  const n   = now.length;
  if (n < 7) return { score: 0, level: 'Low', color: 'green' };

  // 1. Trend component (0–40 pts)
  //    Compare average of last 3 days vs average of 4-7 days ago
  const recentAvg = (now[n-1] + now[n-2] + now[n-3]) / 3;
  const prevAvg   = (now[n-4] + now[n-5] + now[n-6] + (now[n-7] || 0)) / 4;
  let trendScore  = 0;
  if (prevAvg > 0) {
    const changePct = (recentAvg - prevAvg) / prevAvg;
    if      (changePct >  0.5) trendScore = 40;
    else if (changePct >  0.2) trendScore = 28;
    else if (changePct >  0)   trendScore = 15;
    else if (changePct > -0.2) trendScore = 5;
    else                       trendScore = 0;
  } else if (recentAvg > 0) {
    trendScore = 30; // new cases appearing where there were none
  }

  // 2. Acceleration component (0–30 pts)
  //    Is the predicted 7-day total higher than the last 7-day total?
  const last7Total  = now.slice(-7).reduce((s, v) => s + v, 0);
  const next7Total  = predicted.reduce((s, v) => s + v, 0);
  let accelScore = 0;
  if (last7Total > 0) {
    const accel = (next7Total - last7Total) / last7Total;
    if      (accel >  0.5) accelScore = 30;
    else if (accel >  0.2) accelScore = 20;
    else if (accel >  0)   accelScore = 10;
    else                   accelScore = 0;
  } else if (next7Total > 0) {
    accelScore = 20;
  }

  // 3. Case density component (0–30 pts)
  //    Cases per 1000 population in last 7 days
  let densityScore = 0;
  if (population > 0 && last7Total > 0) {
    const per1000 = (last7Total / population) * 1000;
    if      (per1000 > 5)   densityScore = 30;
    else if (per1000 > 2)   densityScore = 20;
    else if (per1000 > 0.5) densityScore = 10;
    else                    densityScore = 5;
  } else if (last7Total > 0) {
    densityScore = 10; // no population data — give partial score
  }

  const score = Math.min(100, Math.round(trendScore + accelScore + densityScore));

  let level, color, message;
  if (score >= 76) {
    level = 'Critical'; color = 'red';
    message = 'Outbreak likely — immediate intervention required';
  } else if (score >= 51) {
    level = 'High'; color = 'orange';
    message = 'Rising trend — prepare resources and increase surveillance';
  } else if (score >= 26) {
    level = 'Moderate'; color = 'yellow';
    message = 'Moderate activity — monitor closely over next 7 days';
  } else {
    level = 'Low'; color = 'green';
    message = 'Situation under control — continue routine monitoring';
  }

  return { score, level, color, message };
}

// ─── Sparse data fallback ──────────────────────────────────────────────────
// If recent days have zero cases, use last known non-zero values
// so chart doesn't flatline during low-reporting periods
function fillSparseData(data) {
  const filled = [...data];
  // Forward fill: replace zeros with last non-zero value
  // but only for last 5 days (so genuine zeros early are preserved)
  let lastNonZero = 0;
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] > 0) lastNonZero = filled[i];
  }
  // Only fill trailing zeros if we have some history
  if (lastNonZero > 0) {
    for (let i = filled.length - 1; i >= Math.max(0, filled.length - 5); i--) {
      if (filled[i] === 0) {
        // Use a small fraction of last known value (not full — don't inflate)
        filled[i] = Math.max(1, Math.round(lastNonZero * 0.3));
      } else {
        break; // stop as soon as we hit a real value
      }
    }
  }
  return filled;
}

// @route  GET /api/forecast/:ward
// @desc   Get disease forecast for a ward using Holt-Winters smoothing
router.get('/:ward', protect, async (req, res) => {
  try {
    const { ward } = req.params;

    // Get ward population for density score
    const wardDoc = await Ward.findOne({ wardName: ward });
    const population = wardDoc?.population || 0;

    // Collect last 21 days of data (more history = better smoothing)
    const last21Days = [];
    for (let i = 20; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const reports = await DiseaseReport.find({
        wardName: ward,
        createdAt: { $gte: date, $lt: nextDate }
      });

      const totalCases = reports.reduce((sum, r) => sum + (r.newConfirmed || 0), 0);

      last21Days.push({
        date: date.toISOString().split('T')[0],
        cases: totalCases
      });
    }

    // Apply sparse data fallback before smoothing
    const rawSeries   = last21Days.map(d => d.cases);
    const filledSeries = fillSparseData(rawSeries);

    // Run Holt-Winters
    const hw = holtWinters(filledSeries);

    // Build actual array for frontend (last 14 days shown)
    // We keep 21 for smoothing but only show last 14 to keep chart clean
    const actual = last21Days.slice(7).map((d, i) => ({
      date: d.date,
      cases: d.cases
    }));

    // Generate 7-day predictions
    const predicted = [];
    let allData = [...filledSeries];

    if (hw) {
      let { level, trend } = hw;

      for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        // Holt-Winters forecast: level + (steps × trend)
        const forecastValue = Math.max(0, Math.round(level + i * trend));

        // Confidence band widens with distance into future
        // Band = MAE × 1.96 (95% confidence) × sqrt(step) for growing uncertainty
        const bandWidth = Math.round(hw.mae * 1.96 * Math.sqrt(i));
        const upper = forecastValue + bandWidth;
        const lower = Math.max(0, forecastValue - bandWidth);

        predicted.push({
          date: date.toISOString().split('T')[0],
          cases: forecastValue,
          upper,
          lower
        });

        allData.push(forecastValue);
      }
    } else {
      // Fallback: simple average if not enough data for Holt-Winters
      const avg = Math.round(
        filledSeries.slice(-3).reduce((s, v) => s + v, 0) / 3
      );
      for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        predicted.push({
          date: date.toISOString().split('T')[0],
          cases: avg,
          upper: avg + 2,
          lower: Math.max(0, avg - 2)
        });
      }
    }

    // Calculate risk score
    const predictedValues = predicted.map(p => p.cases);
    const risk = calcRiskScore(filledSeries, predictedValues, population);

    // Week-over-week change for insight sentence
    const last7 = filledSeries.slice(-7).reduce((s, v) => s + v, 0);
    const prev7 = filledSeries.slice(-14, -7).reduce((s, v) => s + v, 0);
    const weekChange = prev7 > 0
      ? Math.round(((last7 - prev7) / prev7) * 100)
      : last7 > 0 ? 100 : 0;

    // Top disease in this ward this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekReports = await DiseaseReport.find({
      wardName: ward,
      createdAt: { $gte: weekAgo }
    });
    const diseaseTotals = {};
    weekReports.forEach(r => {
      const name = r.diseaseName === 'Other' && r.customDiseaseName
        ? r.customDiseaseName : r.diseaseName;
      diseaseTotals[name] = (diseaseTotals[name] || 0) + (r.newConfirmed || 0);
    });
    const topDisease = Object.entries(diseaseTotals)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    res.json({
      success: true,
      ward,
      actual,
      predicted,
      risk,
      insight: {
        last7Total: last7,
        prev7Total: prev7,
        weekChange,
        topDisease,
        population,
        method: 'Holt-Winters Double Exponential Smoothing (α=0.3, β=0.1)'
      }
    });

  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;