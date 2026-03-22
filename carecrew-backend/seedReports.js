/**
 * seedReports.js
 * Seeds 14 days of realistic disease report data
 * Run from carecrew-backend folder:
 *   node seedReports.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const DiseaseReport = require('./models/DiseaseReport');

const WARDS = [
  { wardName: 'Bhavani Peth',   hospitalName: 'Bhavani Peth General Hospital' },
  { wardName: 'North Solapur',  hospitalName: 'North Solapur Municipal Hospital' },
  { wardName: 'Laxmi Peth',     hospitalName: 'Laxmi Peth Hospital' },
  { wardName: 'Murarji Peth',   hospitalName: 'Murarji Peth PHC' },
  { wardName: 'Kegaon',         hospitalName: 'Kegaon Urban Health Centre' },
  { wardName: 'Shukrawar Peth', hospitalName: 'Shukrawar Peth Clinic' },
  { wardName: 'Sakhar Peth',    hospitalName: 'Sakhar Peth Hospital' },
  { wardName: 'Budhwar Peth',   hospitalName: 'Budhwar Peth Hospital' },
]

const DISEASES = ['Dengue', 'Malaria', 'TB', 'Typhoid', 'Cholera']

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const seedReports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected...')

    // Delete only disease reports older than today so today's real data stays
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    await DiseaseReport.deleteMany({ createdAt: { $lt: today } })
    console.log('Old disease reports cleared')

    const reports = []

    for (let i = 13; i >= 1; i--) {
      // Skip today (i=0) — keep real data
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(rand(8, 14), rand(0, 59), 0, 0) // random time between 8am-2pm

      for (const ward of WARDS) {
        // Each ward reports 1-3 diseases per day
        const numDiseases = rand(1, 3)
        const shuffled = [...DISEASES].sort(() => Math.random() - 0.5)
        const selectedDiseases = shuffled.slice(0, numDiseases)

        for (const disease of selectedDiseases) {
          // Realistic case numbers — some wards busier than others
          const baseLoad = ward.wardName === 'Bhavani Peth' ? 15
            : ward.wardName === 'North Solapur' ? 12
            : ward.wardName === 'Laxmi Peth' ? 10
            : 8

          // Add slight upward trend over time to make chart interesting
          const trendFactor = 1 + ((13 - i) * 0.05)
          const confirmed = Math.round(rand(1, baseLoad) * trendFactor)
          const recovered = Math.floor(confirmed * rand(4, 7) / 10)
          const deaths = Math.random() > 0.92 ? 1 : 0

          reports.push({
            hospitalName: ward.hospitalName,
            wardName: ward.wardName,
            diseaseName: disease,
            newConfirmed: confirmed,
            newRecovered: recovered,
            newDeaths: deaths,
            createdAt: date,
            updatedAt: date,
          })
        }
      }
    }

    // Use insertMany with timestamps: false to preserve our custom createdAt
    await DiseaseReport.collection.insertMany(reports)
    console.log(`✅ ${reports.length} disease reports seeded for last 13 days`)
    console.log('Today\'s real data is preserved.')

    // Quick summary
    const totalByDisease = {}
    reports.forEach(r => {
      totalByDisease[r.diseaseName] = (totalByDisease[r.diseaseName] || 0) + r.newConfirmed
    })
    console.log('\n📊 Cases seeded by disease:')
    Object.entries(totalByDisease).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => {
      console.log(`   ${d}: ${c} cases`)
    })

    process.exit(0)
  } catch (err) {
    console.error('Seed error:', err)
    process.exit(1)
  }
}

seedReports()
