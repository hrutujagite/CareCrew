const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Ward = require('../models/Ward');

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Ward.deleteMany();
    console.log('Existing data cleared...');

    // Create 3 demo users
    await User.create([
      {
        name: 'SMC Health Officer',
        email: 'officer@smc.gov',
        password: 'officer123',
        role: 'healthOfficer',
        ward: null,
        hospitalName: null
      },
      {
        name: 'Civil Hospital Staff',
        email: 'hospital@kmc.in',
        password: 'hospital123',
        role: 'hospitalStaff',
        hospitalName: 'Solapur Civil Hospital',
        ward: 'Murarji Peth'
      },
      {
        name: 'Rahul Patil',
        email: 'citizen@gmail.com',
        password: 'citizen123',
        role: 'citizen',
        ward: 'Murarji Peth',
        hospitalName: null
      }
    ]);
    console.log('Demo users created...');

    // All 25 wards matching Heatmap.js exactly
    const wardsData = [
      // ZONE 1 — Central Solapur
      {
        wardName: 'Bhavani Peth',
        wardCode: 'W001',
        zone: 'Zone 1',
        population: 38500,
        activeCaseCount: 12,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Bhavani Peth General Hospital',
            address: 'Bhavani Peth, Solapur',
            contact: '0217-2600100',
            totalBeds: 120,
            availableBeds: 45,
            icuTotal: 12,
            icuAvailable: 5
          }
        ]
      },
      {
        wardName: 'Mangalwar Peth',
        wardCode: 'W002',
        zone: 'Zone 1',
        population: 36000,
        activeCaseCount: 8,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Mangalwar Peth PHC',
            address: 'Mangalwar Peth, Solapur',
            contact: '0217-2600200',
            totalBeds: 50,
            availableBeds: 30,
            icuTotal: 5,
            icuAvailable: 3
          }
        ]
      },
      {
        wardName: 'Budhwar Peth',
        wardCode: 'W003',
        zone: 'Zone 1',
        population: 42000,
        activeCaseCount: 28,
        riskLevel: 'Yellow',
        topDisease: 'Dengue',
        hospitals: [
          {
            hospitalName: 'Budhwar Peth Hospital',
            address: 'Budhwar Peth, Solapur',
            contact: '0217-2600300',
            totalBeds: 100,
            availableBeds: 22,
            icuTotal: 10,
            icuAvailable: 3
          }
        ]
      },

      // ZONE 2 — North Solapur
      {
        wardName: 'Shukrawar Peth',
        wardCode: 'W004',
        zone: 'Zone 2',
        population: 35000,
        activeCaseCount: 15,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Shukrawar Peth Clinic',
            address: 'Shukrawar Peth, Solapur',
            contact: '0217-2600400',
            totalBeds: 60,
            availableBeds: 35,
            icuTotal: 6,
            icuAvailable: 4
          }
        ]
      },
      {
        wardName: 'Guruwar Peth',
        wardCode: 'W005',
        zone: 'Zone 2',
        population: 33000,
        activeCaseCount: 9,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Guruwar Peth Health Post',
            address: 'Guruwar Peth, Solapur',
            contact: '0217-2600500',
            totalBeds: 40,
            availableBeds: 28,
            icuTotal: 4,
            icuAvailable: 3
          }
        ]
      },
      {
        wardName: 'Murarji Peth',
        wardCode: 'W006',
        zone: 'Zone 2',
        population: 38500,
        activeCaseCount: 12,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Solapur Civil Hospital',
            address: 'Murarji Peth, Solapur',
            contact: '0217-2600600',
            totalBeds: 200,
            availableBeds: 45,
            icuTotal: 20,
            icuAvailable: 8
          },
          {
            hospitalName: 'Murarji Peth PHC',
            address: 'Murarji Peth Road, Solapur',
            contact: '0217-2600700',
            totalBeds: 50,
            availableBeds: 18,
            icuTotal: 5,
            icuAvailable: 2
          }
        ]
      },

      // ZONE 3 — South Solapur
      {
        wardName: 'Hotgi Road',
        wardCode: 'W007',
        zone: 'Zone 3',
        population: 36000,
        activeCaseCount: 55,
        riskLevel: 'Red',
        topDisease: 'Malaria',
        hospitals: [
          {
            hospitalName: 'Hotgi Road District Hospital',
            address: 'Hotgi Road, Solapur',
            contact: '0217-2600800',
            totalBeds: 150,
            availableBeds: 12,
            icuTotal: 15,
            icuAvailable: 2
          }
        ]
      },
      {
        wardName: 'Laxmi Peth',
        wardCode: 'W008',
        zone: 'Zone 3',
        population: 34000,
        activeCaseCount: 18,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Laxmi Peth Hospital',
            address: 'Laxmi Peth, Solapur',
            contact: '0217-2600900',
            totalBeds: 80,
            availableBeds: 40,
            icuTotal: 8,
            icuAvailable: 5
          }
        ]
      },
      {
        wardName: 'Siddheshwar Peth',
        wardCode: 'W009',
        zone: 'Zone 3',
        population: 37000,
        activeCaseCount: 22,
        riskLevel: 'Yellow',
        topDisease: 'Dengue',
        hospitals: [
          {
            hospitalName: 'Siddheshwar Hospital',
            address: 'Siddheshwar Peth, Solapur',
            contact: '0217-2601000',
            totalBeds: 90,
            availableBeds: 25,
            icuTotal: 9,
            icuAvailable: 3
          }
        ]
      },

      // ZONE 4 — North West
      {
        wardName: 'Vijapur Road',
        wardCode: 'W010',
        zone: 'Zone 4',
        population: 39500,
        activeCaseCount: 18,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Vijapur Road Medical Centre',
            address: 'Vijapur Road, Solapur',
            contact: '0217-2601100',
            totalBeds: 80,
            availableBeds: 35,
            icuTotal: 8,
            icuAvailable: 5
          }
        ]
      },
      {
        wardName: 'Shanti Nagar',
        wardCode: 'W011',
        zone: 'Zone 4',
        population: 32000,
        activeCaseCount: 7,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Shanti Nagar PHC',
            address: 'Shanti Nagar, Solapur',
            contact: '0217-2601200',
            totalBeds: 40,
            availableBeds: 30,
            icuTotal: 4,
            icuAvailable: 4
          }
        ]
      },
      {
        wardName: 'Datta Nagar',
        wardCode: 'W012',
        zone: 'Zone 4',
        population: 31000,
        activeCaseCount: 5,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Datta Nagar Dispensary',
            address: 'Datta Nagar, Solapur',
            contact: '0217-2601300',
            totalBeds: 30,
            availableBeds: 25,
            icuTotal: 3,
            icuAvailable: 3
          }
        ]
      },

      // ZONE 5 — South East
      {
        wardName: 'Akkalkot Road',
        wardCode: 'W013',
        zone: 'Zone 5',
        population: 41000,
        activeCaseCount: 32,
        riskLevel: 'Yellow',
        topDisease: 'Typhoid',
        hospitals: [
          {
            hospitalName: 'Akkalkot Road Hospital',
            address: 'Akkalkot Road, Solapur',
            contact: '0217-2601400',
            totalBeds: 120,
            availableBeds: 28,
            icuTotal: 12,
            icuAvailable: 4
          }
        ]
      },
      {
        wardName: 'Osmanabad Naka',
        wardCode: 'W014',
        zone: 'Zone 5',
        population: 37500,
        activeCaseCount: 9,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Osmanabad Naka Clinic',
            address: 'Osmanabad Naka, Solapur',
            contact: '0217-2601500',
            totalBeds: 60,
            availableBeds: 40,
            icuTotal: 6,
            icuAvailable: 6
          }
        ]
      },
      {
        wardName: 'Kamgar Nagar',
        wardCode: 'W015',
        zone: 'Zone 5',
        population: 29000,
        activeCaseCount: 6,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Kamgar Nagar Health Post',
            address: 'Kamgar Nagar, Solapur',
            contact: '0217-2601600',
            totalBeds: 25,
            availableBeds: 20,
            icuTotal: 2,
            icuAvailable: 2
          }
        ]
      },

      // ZONE 6 — East Solapur
      {
        wardName: 'Kegaon',
        wardCode: 'W016',
        zone: 'Zone 6',
        population: 43000,
        activeCaseCount: 47,
        riskLevel: 'Yellow',
        topDisease: 'Dengue',
        hospitals: [
          {
            hospitalName: 'Kegaon Urban Health Centre',
            address: 'Kegaon, Solapur',
            contact: '0217-2601700',
            totalBeds: 90,
            availableBeds: 20,
            icuTotal: 9,
            icuAvailable: 3
          },
          {
            hospitalName: 'Kegaon PHC',
            address: 'Main Road, Kegaon',
            contact: '0217-2601800',
            totalBeds: 30,
            availableBeds: 9,
            icuTotal: 3,
            icuAvailable: 1
          }
        ]
      },
      {
        wardName: 'Mulegaon',
        wardCode: 'W017',
        zone: 'Zone 6',
        population: 28000,
        activeCaseCount: 11,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Mulegaon PHC',
            address: 'Mulegaon, Solapur',
            contact: '0217-2601900',
            totalBeds: 35,
            availableBeds: 22,
            icuTotal: 3,
            icuAvailable: 2
          }
        ]
      },
      {
        wardName: 'Kambar',
        wardCode: 'W018',
        zone: 'Zone 6',
        population: 35000,
        activeCaseCount: 14,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Kambar Community Hospital',
            address: 'Kambar, Solapur',
            contact: '0217-2602000',
            totalBeds: 70,
            availableBeds: 38,
            icuTotal: 7,
            icuAvailable: 5
          }
        ]
      },

      // ZONE 7 — West Solapur
      {
        wardName: 'Begam Peth',
        wardCode: 'W019',
        zone: 'Zone 7',
        population: 36000,
        activeCaseCount: 20,
        riskLevel: 'Yellow',
        topDisease: 'Malaria',
        hospitals: [
          {
            hospitalName: 'Begam Peth Hospital',
            address: 'Begam Peth, Solapur',
            contact: '0217-2602100',
            totalBeds: 75,
            availableBeds: 30,
            icuTotal: 7,
            icuAvailable: 4
          }
        ]
      },
      {
        wardName: 'Rajendra Nagar',
        wardCode: 'W020',
        zone: 'Zone 7',
        population: 31000,
        activeCaseCount: 8,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Rajendra Nagar PHC',
            address: 'Rajendra Nagar, Solapur',
            contact: '0217-2602200',
            totalBeds: 45,
            availableBeds: 32,
            icuTotal: 4,
            icuAvailable: 3
          }
        ]
      },
      {
        wardName: 'Ashok Nagar',
        wardCode: 'W021',
        zone: 'Zone 7',
        population: 29000,
        activeCaseCount: 6,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Ashok Nagar Dispensary',
            address: 'Ashok Nagar, Solapur',
            contact: '0217-2602300',
            totalBeds: 30,
            availableBeds: 24,
            icuTotal: 3,
            icuAvailable: 3
          }
        ]
      },

      // ZONE 8 — North East
      {
        wardName: 'Solapur North',
        wardCode: 'W022',
        zone: 'Zone 8',
        population: 40000,
        activeCaseCount: 16,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'North Solapur Hospital',
            address: 'Solapur North, Solapur',
            contact: '0217-2602400',
            totalBeds: 85,
            availableBeds: 42,
            icuTotal: 8,
            icuAvailable: 6
          }
        ]
      },
      {
        wardName: 'Bhuinj Naka',
        wardCode: 'W023',
        zone: 'Zone 8',
        population: 27000,
        activeCaseCount: 4,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Bhuinj Naka PHC',
            address: 'Bhuinj Naka, Solapur',
            contact: '0217-2602500',
            totalBeds: 30,
            availableBeds: 25,
            icuTotal: 3,
            icuAvailable: 3
          }
        ]
      },
      {
        wardName: 'Prakash Nagar',
        wardCode: 'W024',
        zone: 'Zone 8',
        population: 28000,
        activeCaseCount: 7,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Prakash Nagar Clinic',
            address: 'Prakash Nagar, Solapur',
            contact: '0217-2602600',
            totalBeds: 35,
            availableBeds: 28,
            icuTotal: 3,
            icuAvailable: 3
          }
        ]
      },
      {
        wardName: 'Sakhar Peth',
        wardCode: 'W025',
        zone: 'Zone 8',
        population: 32000,
        activeCaseCount: 13,
        riskLevel: 'Green',
        topDisease: null,
        hospitals: [
          {
            hospitalName: 'Sakhar Peth Hospital',
            address: 'Sakhar Peth, Solapur',
            contact: '0217-2602700',
            totalBeds: 65,
            availableBeds: 35,
            icuTotal: 6,
            icuAvailable: 4
          }
        ]
      }
    ]

    await Ward.insertMany(wardsData)
    console.log('25 wards seeded across 8 zones...')

    console.log('')
    console.log('=============================')
    console.log('SEED COMPLETE!')
    console.log('=============================')
    console.log('Demo Login Credentials:')
    console.log('')
    console.log('Health Officer:')
    console.log('  Email:    officer@smc.gov')
    console.log('  Password: officer123')
    console.log('')
    console.log('Hospital Staff:')
    console.log('  Email:    hospital@kmc.in')
    console.log('  Password: hospital123')
    console.log('')
    console.log('Citizen:')
    console.log('  Email:    citizen@gmail.com')
    console.log('  Password: citizen123')
    console.log('=============================')

    process.exit(0)
  } catch (error) {
    console.error('Seed error:', error)
    process.exit(1)
  }
}

seedDatabase()