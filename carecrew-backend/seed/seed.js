const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const Ward = require('../models/Ward');
const User = require('../models/User');
const DiseaseReport = require('../models/DiseaseReport');
const HospitalCapacity = require('../models/HospitalCapacity');
const Alert = require('../models/Alert');
const Appointment = require('../models/Appointment');
const HealthCamp = require('../models/HealthCamp');

// ─────────────────────────────────────────────
// REAL SOLAPUR WARDS + HOSPITALS + DOCTORS
// Coordinates verified for Solapur, Maharashtra
// ─────────────────────────────────────────────
const wardData = [
  {
    wardName: 'Bhavani Peth',
    wardCode: 'BP01',
    population: 95000,
    hospitals: [
      {
        hospitalName: 'Bhavani Peth General Hospital',
        address: 'Bhavani Peth, Solapur - 413002',
        contact: '0217-2722001',
        lat: 17.6868,
        lng: 75.9064,
        totalBeds: 120,
        availableBeds: 45,
        icuTotal: 30,
        icuAvailable: 9,
        specialties: ['General', 'Paediatrics', 'Gynaecology', 'Emergency'],
        doctors: [
          { name: 'Dr. Priya Kulkarni', specialty: 'General', experience: 12, rating: 4.7, slots: ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM'] },
          { name: 'Dr. Suresh Patil', specialty: 'Paediatrics', experience: 8, rating: 4.5, slots: ['09:30 AM', '11:00 AM', '03:00 PM'] },
          { name: 'Dr. Anita Deshmukh', specialty: 'Gynaecology', experience: 15, rating: 4.8, slots: ['10:00 AM', '01:00 PM', '04:00 PM'] },
          { name: 'Dr. Rajesh More', specialty: 'Emergency', experience: 10, rating: 4.6, slots: ['08:00 AM', '02:00 PM', '08:00 PM'] }
        ]
      },
      {
        hospitalName: 'Shri Sai Clinic Bhavani Peth',
        address: 'Near Bhavani Temple, Solapur - 413002',
        contact: '0217-2724500',
        lat: 17.6880,
        lng: 75.9080,
        totalBeds: 30,
        availableBeds: 12,
        icuTotal: 5,
        icuAvailable: 2,
        specialties: ['General', 'Orthopaedics'],
        doctors: [
          { name: 'Dr. Mahesh Jadhav', specialty: 'General', experience: 6, rating: 4.3, slots: ['09:00 AM', '11:00 AM', '04:00 PM'] },
          { name: 'Dr. Kavita Shinde', specialty: 'Orthopaedics', experience: 9, rating: 4.4, slots: ['10:00 AM', '02:30 PM'] }
        ]
      }
    ]
  },
  {
    wardName: 'North Solapur',
    wardCode: 'NS02',
    population: 88000,
    hospitals: [
      {
        hospitalName: 'North Solapur Municipal Hospital',
        address: 'North Solapur, Solapur - 413006',
        contact: '0217-2741100',
        lat: 17.7120,
        lng: 75.9180,
        totalBeds: 85,
        availableBeds: 42,
        icuTotal: 20,
        icuAvailable: 8,
        specialties: ['General', 'Cardiology', 'Orthopaedics', 'Emergency'],
        doctors: [
          { name: 'Dr. Anil Kumbhar', specialty: 'General', experience: 14, rating: 4.6, slots: ['09:00 AM', '11:30 AM', '03:00 PM'] },
          { name: 'Dr. Sneha Reddy', specialty: 'Cardiology', experience: 11, rating: 4.9, slots: ['10:00 AM', '01:00 PM', '04:30 PM'] },
          { name: 'Dr. Vikram Salunkhe', specialty: 'Orthopaedics', experience: 7, rating: 4.4, slots: ['09:30 AM', '02:00 PM'] },
          { name: 'Dr. Pooja Naik', specialty: 'Emergency', experience: 5, rating: 4.2, slots: ['08:00 AM', '04:00 PM', '10:00 PM'] }
        ]
      }
    ]
  },
  {
    wardName: 'Laxmi Peth',
    wardCode: 'LP03',
    population: 72000,
    hospitals: [
      {
        hospitalName: 'Laxmi Peth Hospital',
        address: 'Laxmi Peth, Solapur - 413002',
        contact: '0217-2735000',
        lat: 17.6790,
        lng: 75.9020,
        totalBeds: 80,
        availableBeds: 22,
        icuTotal: 15,
        icuAvailable: 4,
        specialties: ['General', 'Neurology', 'Gynaecology'],
        doctors: [
          { name: 'Dr. Ramesh Gaikwad', specialty: 'General', experience: 18, rating: 4.8, slots: ['09:00 AM', '12:00 PM', '03:30 PM'] },
          { name: 'Dr. Meena Joshi', specialty: 'Neurology', experience: 13, rating: 4.7, slots: ['10:30 AM', '02:00 PM'] },
          { name: 'Dr. Sunita Pawar', specialty: 'Gynaecology', experience: 10, rating: 4.5, slots: ['09:30 AM', '01:30 PM', '04:00 PM'] }
        ]
      }
    ]
  },
  {
    wardName: 'Murarji Peth',
    wardCode: 'MP04',
    population: 65000,
    hospitals: [
      {
        hospitalName: 'Murarji Peth PHC',
        address: 'Murarji Peth, Solapur - 413001',
        contact: '0217-2712300',
        lat: 17.6920,
        lng: 75.8980,
        totalBeds: 50,
        availableBeds: 18,
        icuTotal: 10,
        icuAvailable: 3,
        specialties: ['General', 'Paediatrics', 'Emergency'],
        doctors: [
          { name: 'Dr. Santosh Kamble', specialty: 'General', experience: 9, rating: 4.4, slots: ['09:00 AM', '11:00 AM', '02:00 PM'] },
          { name: 'Dr. Ashwini Mane', specialty: 'Paediatrics', experience: 7, rating: 4.6, slots: ['10:00 AM', '01:00 PM', '03:30 PM'] }
        ]
      },
      {
        hospitalName: 'Datta Nagar Dispensary',
        address: 'Datta Nagar, Murarji Peth, Solapur',
        contact: '0217-2714400',
        lat: 17.6935,
        lng: 75.8995,
        totalBeds: 20,
        availableBeds: 8,
        icuTotal: 2,
        icuAvailable: 1,
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Prakash Lokhande', specialty: 'General', experience: 5, rating: 4.1, slots: ['09:00 AM', '12:00 PM', '04:00 PM'] }
        ]
      }
    ]
  },
  {
    wardName: 'Shukrawar Peth',
    wardCode: 'SP05',
    population: 78000,
    hospitals: [
      {
        hospitalName: 'Shukrawar Peth Clinic',
        address: 'Shukrawar Peth, Solapur - 413001',
        contact: '0217-2726600',
        lat: 17.6855,
        lng: 75.9100,
        totalBeds: 60,
        availableBeds: 35,
        icuTotal: 12,
        icuAvailable: 7,
        specialties: ['General', 'Dermatology', 'ENT'],
        doctors: [
          { name: 'Dr. Nilesh Kulkarni', specialty: 'General', experience: 11, rating: 4.5, slots: ['09:00 AM', '11:30 AM', '03:00 PM'] },
          { name: 'Dr. Archana Bhosale', specialty: 'Dermatology', experience: 8, rating: 4.7, slots: ['10:00 AM', '02:00 PM'] },
          { name: 'Dr. Sanjay Aware', specialty: 'ENT', experience: 12, rating: 4.6, slots: ['09:30 AM', '01:00 PM', '04:30 PM'] }
        ]
      }
    ]
  },
  {
    wardName: 'Sakhar Peth',
    wardCode: 'SKP06',
    population: 60000,
    hospitals: [
      {
        hospitalName: 'Sakhar Peth Hospital',
        address: 'Sakhar Peth, Solapur - 413005',
        contact: '0217-2755000',
        lat: 17.6750,
        lng: 75.9150,
        totalBeds: 70,
        availableBeds: 30,
        icuTotal: 15,
        icuAvailable: 6,
        specialties: ['General', 'Cardiology', 'Ophthalmology'],
        doctors: [
          { name: 'Dr. Vinod Chavan', specialty: 'General', experience: 16, rating: 4.7, slots: ['09:00 AM', '12:00 PM', '03:00 PM'] },
          { name: 'Dr. Rupali Patil', specialty: 'Cardiology', experience: 10, rating: 4.8, slots: ['10:30 AM', '02:30 PM'] },
          { name: 'Dr. Ganesh Nair', specialty: 'Ophthalmology', experience: 9, rating: 4.5, slots: ['09:30 AM', '01:00 PM', '04:00 PM'] }
        ]
      }
    ]
  },
  {
    wardName: 'Budhwar Peth',
    wardCode: 'BWP07',
    population: 55000,
    hospitals: [
      {
        hospitalName: 'Budhwar Peth Hospital',
        address: 'Budhwar Peth, Solapur - 413002',
        contact: '0217-2718000',
        lat: 17.6810,
        lng: 75.9040,
        totalBeds: 55,
        availableBeds: 20,
        icuTotal: 10,
        icuAvailable: 3,
        specialties: ['General', 'Orthopaedics', 'Gynaecology'],
        doctors: [
          { name: 'Dr. Deepak Wagh', specialty: 'General', experience: 8, rating: 4.3, slots: ['09:00 AM', '11:00 AM', '03:30 PM'] },
          { name: 'Dr. Smita Jagtap', specialty: 'Gynaecology', experience: 12, rating: 4.6, slots: ['10:00 AM', '02:00 PM'] }
        ]
      }
    ]
  },
  {
    wardName: 'Osmanabad Naka',
    wardCode: 'ON08',
    population: 50000,
    hospitals: [
      {
        hospitalName: 'Osmanabad Naka Clinic',
        address: 'Osmanabad Naka, Solapur - 413004',
        contact: '0217-2760100',
        lat: 17.6700,
        lng: 75.9200,
        totalBeds: 40,
        availableBeds: 15,
        icuTotal: 8,
        icuAvailable: 2,
        specialties: ['General', 'Emergency'],
        doctors: [
          { name: 'Dr. Harish Deshpande', specialty: 'General', experience: 7, rating: 4.2, slots: ['09:00 AM', '12:00 PM', '04:00 PM'] },
          { name: 'Dr. Geeta Rathod', specialty: 'Emergency', experience: 6, rating: 4.4, slots: ['08:00 AM', '02:00 PM', '08:00 PM'] }
        ]
      }
    ]
  },
  {
    wardName: 'Kegaon',
    wardCode: 'KG09',
    population: 82000,
    hospitals: [
      {
        hospitalName: 'Kegaon Urban Health Centre',
        address: 'Kegaon, Solapur - 413006',
        contact: '0217-2742200',
        lat: 17.7050,
        lng: 75.9300,
        totalBeds: 65,
        availableBeds: 28,
        icuTotal: 12,
        icuAvailable: 5,
        specialties: ['General', 'Paediatrics', 'Cardiology'],
        doctors: [
          { name: 'Dr. Pallavi Shete', specialty: 'General', experience: 10, rating: 4.5, slots: ['09:00 AM', '11:30 AM', '03:00 PM'] },
          { name: 'Dr. Ajay Mundhe', specialty: 'Cardiology', experience: 14, rating: 4.8, slots: ['10:00 AM', '01:30 PM'] },
          { name: 'Dr. Rekha Bhandare', specialty: 'Paediatrics', experience: 6, rating: 4.4, slots: ['09:30 AM', '02:00 PM', '04:30 PM'] }
        ]
      }
    ]
  },
  {
    wardName: 'Vijapur Road',
    wardCode: 'VR10',
    population: 70000,
    hospitals: [
      {
        hospitalName: 'Vijapur Road Medical Centre',
        address: 'Vijapur Road, Solapur - 413007',
        contact: '0217-2771500',
        lat: 17.6950,
        lng: 75.8850,
        totalBeds: 75,
        availableBeds: 32,
        icuTotal: 18,
        icuAvailable: 7,
        specialties: ['General', 'Neurology', 'Orthopaedics', 'Emergency'],
        doctors: [
          { name: 'Dr. Mohan Taware', specialty: 'General', experience: 20, rating: 4.9, slots: ['09:00 AM', '12:00 PM', '03:00 PM'] },
          { name: 'Dr. Vaishali Gore', specialty: 'Neurology', experience: 11, rating: 4.7, slots: ['10:30 AM', '02:30 PM'] },
          { name: 'Dr. Ravi Kale', specialty: 'Orthopaedics', experience: 8, rating: 4.5, slots: ['09:30 AM', '01:00 PM', '04:00 PM'] }
        ]
      }
    ]
  }
];

// ─────────────────────────────────────────────
// SEED USERS
// ─────────────────────────────────────────────
const userData = [
  // Health Officer
  {
    name: 'SMC Health Officer',
    email: 'officer@smc.gov.in',
    password: 'officer123',
    role: 'healthOfficer',
    hospitalName: null,
    ward: null
  },
  // Hospital Staff — one per hospital (first hospital of each ward)
  {
    name: 'Bhavani Peth Hospital Staff',
    email: 'staff.bhavani@hospital.com',
    password: 'hospital123',
    role: 'hospitalStaff',
    hospitalName: 'Bhavani Peth General Hospital',
    ward: 'Bhavani Peth'
  },
  {
    name: 'North Solapur Hospital Staff',
    email: 'staff.north@hospital.com',
    password: 'hospital123',
    role: 'hospitalStaff',
    hospitalName: 'North Solapur Municipal Hospital',
    ward: 'North Solapur'
  },
  {
    name: 'Laxmi Peth Hospital Staff',
    email: 'staff.laxmi@hospital.com',
    password: 'hospital123',
    role: 'hospitalStaff',
    hospitalName: 'Laxmi Peth Hospital',
    ward: 'Laxmi Peth'
  },
  {
    name: 'Murarji Peth Hospital Staff',
    email: 'staff.murarji@hospital.com',
    password: 'hospital123',
    role: 'hospitalStaff',
    hospitalName: 'Murarji Peth PHC',
    ward: 'Murarji Peth'
  },
  {
    name: 'Shukrawar Peth Hospital Staff',
    email: 'staff.shukrawar@hospital.com',
    password: 'hospital123',
    role: 'hospitalStaff',
    hospitalName: 'Shukrawar Peth Clinic',
    ward: 'Shukrawar Peth'
  },
  // Citizens
  {
    name: 'Rahul Patil',
    email: 'rahul@citizen.com',
    password: 'citizen123',
    role: 'citizen',
    hospitalName: null,
    ward: 'Bhavani Peth'
  },
  {
    name: 'Priya Sharma',
    email: 'priya@citizen.com',
    password: 'citizen123',
    role: 'citizen',
    hospitalName: null,
    ward: 'North Solapur'
  }
];

// ─────────────────────────────────────────────
// SEED HEALTH CAMPS
// ─────────────────────────────────────────────
const healthCampData = [
  {
    hospitalName: 'Bhavani Peth General Hospital',
    wardName: 'Bhavani Peth',
    title: 'Free Dengue Awareness & Checkup Camp',
    description: 'Free blood tests and dengue awareness for Bhavani Peth residents',
    campType: 'Free Checkup',
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    timing: '9:00 AM - 4:00 PM',
    location: 'Bhavani Peth Community Hall, Near Bhavani Temple',
    contactInfo: '0217-2722001'
  },
  {
    hospitalName: 'North Solapur Municipal Hospital',
    wardName: 'North Solapur',
    title: 'Free Eye Checkup Camp',
    description: 'Free eye examination and spectacles distribution for senior citizens',
    campType: 'Eye Checkup',
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    timing: '10:00 AM - 3:00 PM',
    location: 'North Solapur Ward Office',
    contactInfo: '0217-2741100'
  },
  {
    hospitalName: 'Laxmi Peth Hospital',
    wardName: 'Laxmi Peth',
    title: 'Blood Donation Drive',
    description: 'Voluntary blood donation camp in association with SMC',
    campType: 'Blood Donation',
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    timing: '8:00 AM - 1:00 PM',
    location: 'Laxmi Peth Hospital Premises',
    contactInfo: '0217-2735000'
  },
  {
    hospitalName: 'Kegaon Urban Health Centre',
    wardName: 'Kegaon',
    title: 'Child Vaccination Drive',
    description: 'Free vaccination for children under 5 years — Polio, DPT, Hepatitis B',
    campType: 'Vaccination',
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
    endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    timing: '9:00 AM - 5:00 PM',
    location: 'Kegaon Primary School Ground',
    contactInfo: '0217-2742200'
  },
  {
    hospitalName: 'Shukrawar Peth Clinic',
    wardName: 'Shukrawar Peth',
    title: 'Diabetes & BP Awareness Camp',
    description: 'Free blood sugar and blood pressure testing for all residents',
    campType: 'Awareness Drive',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    timing: '9:00 AM - 2:00 PM',
    location: 'Shukrawar Peth Garden',
    contactInfo: '0217-2726600'
  }
];

// ─────────────────────────────────────────────
// SEED DISEASE REPORTS (last 14 days of data)
// ─────────────────────────────────────────────
const diseases = ['Dengue', 'Malaria', 'TB', 'Typhoid', 'Cholera'];
const wardsForReports = [
  { wardName: 'Bhavani Peth', hospitalName: 'Bhavani Peth General Hospital' },
  { wardName: 'North Solapur', hospitalName: 'North Solapur Municipal Hospital' },
  { wardName: 'Laxmi Peth', hospitalName: 'Laxmi Peth Hospital' },
  { wardName: 'Murarji Peth', hospitalName: 'Murarji Peth PHC' },
  { wardName: 'Kegaon', hospitalName: 'Kegaon Urban Health Centre' }
];

// ─────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────
const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Clear all collections
    await Ward.deleteMany({});
    await User.deleteMany({});
    await DiseaseReport.deleteMany({});
    await HospitalCapacity.deleteMany({});
    await Alert.deleteMany({});
    await Appointment.deleteMany({});
    await HealthCamp.deleteMany({});
    console.log('All collections cleared');

    // Seed Wards
    const wards = await Ward.insertMany(wardData);
    console.log(`${wards.length} wards seeded`);

    // Seed Users
    const createdUsers = [];
    for (const u of userData) {
      const user = await User.create(u); // pre-save hook hashes password
      createdUsers.push(user);
    }
    console.log(`${createdUsers.length} users seeded`);

    const officerUser = createdUsers.find(u => u.role === 'healthOfficer');
    const citizenUser = createdUsers.find(u => u.email === 'rahul@citizen.com');
    const staffUsers = createdUsers.filter(u => u.role === 'hospitalStaff');

    // Seed Disease Reports — last 14 days
    const diseaseReports = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(10, 0, 0, 0);

      for (const ward of wardsForReports) {
        const staffUser = staffUsers.find(u => u.hospitalName === ward.hospitalName);
        // 1-2 reports per ward per day
        const numReports = Math.floor(Math.random() * 2) + 1;
        for (let r = 0; r < numReports; r++) {
          const disease = diseases[Math.floor(Math.random() * diseases.length)];
          const confirmed = Math.floor(Math.random() * 8) + 1;
          diseaseReports.push({
            hospitalName: ward.hospitalName,
            wardName: ward.wardName,
            diseaseName: disease,
            newConfirmed: confirmed,
            newRecovered: Math.floor(confirmed * 0.6),
            newDeaths: Math.random() > 0.9 ? 1 : 0,
            reportDate: date,
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            submittedBy: staffUser ? staffUser._id : null
          });
        }
      }
    }
    await DiseaseReport.insertMany(diseaseReports);
    console.log(`${diseaseReports.length} disease reports seeded`);

    // Seed Hospital Capacity
    const capacityRecords = [];
    for (const ward of wards) {
      for (const hospital of ward.hospitals) {
        const staffUser = staffUsers.find(
          u => u.hospitalName === hospital.hospitalName
        );
        capacityRecords.push({
          hospitalName: hospital.hospitalName,
          ward: ward.wardName,
          totalBeds: hospital.totalBeds,
          availableBeds: hospital.availableBeds,
          icuTotal: hospital.icuTotal,
          icuAvailable: hospital.icuAvailable,
          ventilatorsTotal: Math.floor(hospital.icuTotal * 0.8),
          ventilatorsAvailable: Math.floor(hospital.icuAvailable * 0.8),
          oxygenTotal: 100,
          oxygenAvailable: Math.floor(Math.random() * 40) + 40, // 40-80
          medicineStockPercentage: Math.floor(Math.random() * 40) + 50, // 50-90
          submittedBy: staffUser ? staffUser._id : null,
          lastUpdated: new Date()
        });
      }
    }
    await HospitalCapacity.insertMany(capacityRecords);
    console.log(`${capacityRecords.length} capacity records seeded`);

    // Update ward activeCaseCount and riskLevel from disease reports
    for (const ward of wards) {
      const allReports = await DiseaseReport.find({ wardName: ward.wardName });
      const totalConfirmed = allReports.reduce((s, r) => s + r.newConfirmed, 0);
      const totalRecovered = allReports.reduce((s, r) => s + r.newRecovered, 0);
      const totalDeaths = allReports.reduce((s, r) => s + r.newDeaths, 0);
      const activeCaseCount = Math.max(0, totalConfirmed - totalRecovered - totalDeaths);

      // topDisease
      const diseaseMap = {};
      allReports.forEach(r => {
        diseaseMap[r.diseaseName] = (diseaseMap[r.diseaseName] || 0) + r.newConfirmed;
      });
      const topDisease = Object.keys(diseaseMap).sort(
        (a, b) => diseaseMap[b] - diseaseMap[a]
      )[0] || null;

      // riskLevel
      let riskLevel = 'Green';
      if (activeCaseCount > 50) riskLevel = 'Red';
      else if (activeCaseCount > 25) riskLevel = 'Yellow';

      // HAI
      const totalAvailableBeds = ward.hospitals.reduce(
        (s, h) => s + (h.availableBeds || 0), 0
      );
      const accessibilityIndex = Math.round(Math.min(100, Math.max(0,
        (totalAvailableBeds / (ward.population || 1)) * 1000 +
        ward.hospitals.length * 10 -
        activeCaseCount * 2
      )));

      await Ward.findByIdAndUpdate(ward._id, {
        activeCaseCount,
        topDisease,
        riskLevel,
        accessibilityIndex,
        lastUpdated: new Date()
      });
    }
    console.log('Ward stats updated');

    // Seed Alerts for high-risk wards
    const updatedWards = await Ward.find({ riskLevel: { $in: ['Yellow', 'Red'] } });
    for (const ward of updatedWards) {
      await Alert.create({
        wardName: ward.wardName,
        alertType: 'Outbreak',
        severity: ward.riskLevel,
        message: `${ward.riskLevel === 'Red' ? 'Critical' : 'Warning'}: ${ward.activeCaseCount} active ${ward.topDisease} cases in ${ward.wardName}`,
        diseaseName: ward.topDisease,
        caseCount: ward.activeCaseCount,
        isActive: true
      });
    }
    console.log('Alerts seeded for high-risk wards');

    // Seed Health Camps
    for (const camp of healthCampData) {
      await HealthCamp.create(camp);
    }
    console.log(`${healthCampData.length} health camps seeded`);

    // Seed Sample Appointments
    if (citizenUser) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 30, 0, 0);

      await Appointment.create({
        citizenName: citizenUser.name,
        contact: '9664269817',
        hospitalName: 'Bhavani Peth General Hospital',
        ward: 'Bhavani Peth',
        specialty: 'General',
        doctorName: 'Dr. Priya Kulkarni',
        preferredDate: tomorrow,
        timeSlot: '10:30 AM',
        chiefComplaint: 'Fever and body ache for 3 days',
        bookedBy: citizenUser._id,
        status: 'Confirmed',
        bookingReference: 'CC' + Math.floor(100000 + Math.random() * 900000)
      });
      console.log('Sample appointment seeded');
    }

    console.log('\n✅ DATABASE SEEDED SUCCESSFULLY');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('Health Officer → officer@smc.gov.in / officer123');
    console.log('Hospital Staff → staff.bhavani@hospital.com / hospital123');
    console.log('Citizen       → rahul@citizen.com / citizen123');
    console.log('\n🏥 Wards seeded:', wards.map(w => w.wardName).join(', '));

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
