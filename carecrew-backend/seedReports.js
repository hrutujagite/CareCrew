/**
 * seedReports.js
 * Seeds 90 days of realistic disease report data for ML forecasting
 * Run from carecrew-backend folder:
 *   node seedReports.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const DiseaseReport = require('./models/DiseaseReport');

const WARDS = [
  // Main hospitals
  { wardName: 'Bhavani Peth',   hospitalName: 'Bhavani Peth General Hospital',   baseLoad: 15, facilityType: 'general' },
  { wardName: 'North Solapur',  hospitalName: 'North Solapur Municipal Hospital', baseLoad: 12, facilityType: 'general' },
  { wardName: 'Laxmi Peth',     hospitalName: 'Laxmi Peth Hospital',              baseLoad: 10, facilityType: 'general' },
  { wardName: 'Murarji Peth',   hospitalName: 'Murarji Peth PHC',                 baseLoad: 8,  facilityType: 'general' },
  { wardName: 'Kegaon',         hospitalName: 'Kegaon Urban Health Centre',       baseLoad: 8,  facilityType: 'general' },
  { wardName: 'Shukrawar Peth', hospitalName: 'Shukrawar Peth Clinic',            baseLoad: 8,  facilityType: 'general' },
  { wardName: 'Sakhar Peth',    hospitalName: 'Sakhar Peth Hospital',             baseLoad: 8,  facilityType: 'general' },
  { wardName: 'Budhwar Peth',   hospitalName: 'Budhwar Peth Hospital',            baseLoad: 8,  facilityType: 'general' },
  { wardName: 'Osmanabad Naka', hospitalName: 'Osmanabad Naka Clinic',            baseLoad: 8,  facilityType: 'general' },
  { wardName: 'Vijapur Road',   hospitalName: 'Vijapur Road Medical Centre',      baseLoad: 8,  facilityType: 'general' },
  // UPHCs
  { wardName: 'Bhavani Peth',   hospitalName: 'Bhavani Peth UPHC',    baseLoad: 4, facilityType: 'uphc' },
  { wardName: 'North Solapur',  hospitalName: 'North Solapur UPHC',   baseLoad: 4, facilityType: 'uphc' },
  { wardName: 'Laxmi Peth',     hospitalName: 'Laxmi Peth UPHC',      baseLoad: 4, facilityType: 'uphc' },
  { wardName: 'Murarji Peth',   hospitalName: 'Murarji Peth UPHC',    baseLoad: 4, facilityType: 'uphc' },
  { wardName: 'Kegaon',         hospitalName: 'Kegaon UPHC',          baseLoad: 4, facilityType: 'uphc' },
  { wardName: 'Shukrawar Peth', hospitalName: 'Shukrawar Peth UPHC',  baseLoad: 4, facilityType: 'uphc' },
  { wardName: 'Sakhar Peth',    hospitalName: 'Sakhar Peth UPHC',     baseLoad: 4, facilityType: 'uphc' },
  { wardName: 'Budhwar Peth',   hospitalName: 'Budhwar Peth UPHC',    baseLoad: 4, facilityType: 'uphc' },
  { wardName: 'Osmanabad Naka', hospitalName: 'Osmanabad Naka UPHC',  baseLoad: 4, facilityType: 'uphc' },
  { wardName: 'Vijapur Road',   hospitalName: 'Vijapur Road UPHC',    baseLoad: 4, facilityType: 'uphc' },
];

// ─────────────────────────────────────────────
// DISEASE CONFIG
// Each disease has:
//   peakDay     : day in the 90-day window where cases peak (0–89)
//   peakMult    : multiplier at peak (simulates seasonal surge)
//   weekendDrop : fraction to reduce cases on weekends (0 = no drop)
//   outbreakProb: chance of a random 1-day spike on any given day
// ─────────────────────────────────────────────
const DISEASE_CONFIG = {
  Dengue:   { peakDay: 60, peakMult: 2.5, weekendDrop: 0.15, outbreakProb: 0.03 },
  Malaria:  { peakDay: 45, peakMult: 2.0, weekendDrop: 0.10, outbreakProb: 0.02 },
  Typhoid:  { peakDay: 30, peakMult: 1.6, weekendDrop: 0.05, outbreakProb: 0.02 },
  Cholera:  { peakDay: 20, peakMult: 1.8, weekendDrop: 0.05, outbreakProb: 0.04 },
  TB:       { peakDay: 75, peakMult: 1.3, weekendDrop: 0.20, outbreakProb: 0.01 },
};

const DISEASES = Object.keys(DISEASE_CONFIG);

const SEED_DAYS = 90; // Change this to seed more/fewer days

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Gaussian-style noise: returns a value centred around 'mean' with spread 'stddev'
const gaussianNoise = (mean, stddev) => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(mean + z * stddev));
};

// Bell-curve seasonal factor: peaks at peakDay, returns multiplier 1.0–peakMult
const seasonalFactor = (dayIndex, peakDay, peakMult) => {
  const spread = SEED_DAYS / 3;
  const factor = 1 + (peakMult - 1) * Math.exp(-0.5 * Math.pow((dayIndex - peakDay) / spread, 2));
  return factor;
};

const isWeekend = (date) => {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
};

// ─────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────
const seedReports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');

    // Delete reports older than today so today's real data stays intact
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await DiseaseReport.deleteMany({ createdAt: { $lt: today } });
    console.log(`Old disease reports cleared (kept today's real data)`);

    const reports = [];

    for (let i = SEED_DAYS; i >= 1; i--) {
      const dayIndex = SEED_DAYS - i; // 0 = oldest day, SEED_DAYS-1 = yesterday

      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(rand(8, 14), rand(0, 59), 0, 0);

      const weekend = isWeekend(date);

      for (const ward of WARDS) {
        const isUPHC = ward.facilityType === 'uphc';

        // UPHCs report 1–2 diseases/day; general hospitals 1–3
        const numDiseases = isUPHC ? rand(1, 2) : rand(1, 3);
        const shuffled = [...DISEASES].sort(() => Math.random() - 0.5);
        const selectedDiseases = shuffled.slice(0, numDiseases);

        for (const disease of selectedDiseases) {
          const cfg = DISEASE_CONFIG[disease];

          // Base mean cases for this hospital
          let mean = ward.baseLoad * seasonalFactor(dayIndex, cfg.peakDay, cfg.peakMult);

          // Weekend drop — fewer people report on weekends
          if (weekend) mean *= (1 - cfg.weekendDrop);

          // Occasional outbreak spike (e.g. local cluster)
          const isOutbreakDay = Math.random() < cfg.outbreakProb;
          if (isOutbreakDay) mean *= rand(2, 4);

          // Add Gaussian noise (stddev = 30% of mean for realism)
          const confirmed = Math.max(1, gaussianNoise(mean, mean * 0.3));

          // Recovery rate: 50–75% of confirmed, takes a few days
          const recovered = Math.floor(confirmed * (rand(50, 75) / 100));

          // Deaths: rare, slightly higher for Cholera/TB
          const deathProb = disease === 'Cholera' ? 0.08
            : disease === 'TB' ? 0.06
            : 0.04;
          const deaths = Math.random() < deathProb ? 1 : 0;

          reports.push({
            hospitalName: ward.hospitalName,
            wardName: ward.wardName,
            diseaseName: disease,
            newConfirmed: confirmed,
            newRecovered: recovered,
            newDeaths: deaths,
            createdAt: date,
            updatedAt: date,
          });
        }
      }
    }

    await DiseaseReport.collection.insertMany(reports);
    console.log(`\n✅ ${reports.length} disease reports seeded for last ${SEED_DAYS} days`);
    console.log(`   Today's real data preserved.`);

    // ── Summary ──
    const totalByDisease = {};
    reports.forEach(r => {
      totalByDisease[r.diseaseName] = (totalByDisease[r.diseaseName] || 0) + r.newConfirmed;
    });

    console.log('\n📊 Total cases seeded by disease:');
    Object.entries(totalByDisease)
      .sort((a, b) => b[1] - a[1])
      .forEach(([d, c]) => console.log(`   ${d}: ${c} cases`));

    const uphcCount = reports.filter(r => r.hospitalName.includes('UPHC')).length;
    console.log(`\n🏥 UPHC reports: ${uphcCount}`);
    console.log(`🏨 General hospital reports: ${reports.length - uphcCount}`);
    console.log(`\n📅 Date range: ${SEED_DAYS} days back → yesterday`);
    console.log(`🤖 Data is ML-ready: seasonal curves, weekend drops, outbreak spikes, Gaussian noise`);

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedReports();
