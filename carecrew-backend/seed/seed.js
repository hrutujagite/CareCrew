const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/User');
const Ward = require('../models/Ward');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Ward.deleteMany();
    console.log('Existing data cleared...');

    // Create 3 demo users
    const users = await User.create([
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

    // Create 8 zones with wards and 25 hospitals
    const wardsData = [
      // ZONE 1
      {
        wardName: 'Murarji Peth',
        wardCode: 'W001',
        zone: 'Zone 1',
        population: 38500,
        activeCaseCount: 12,
        riskLevel: 'Green',
        hospitals: [
          {
            hospitalName: 'Solapur Civil Hospital',
            address: 'Murarji Peth, Solapur',
            contact: '0217-2600100',
            totalBeds: 200,
            availableBeds: 45,
            icuTotal: 20,
            icuAvailable: 8
          },
          {
            hospitalName: 'Peth Primary Health Centre',
            address: 'Murarji Peth Road, Solapur',
            contact: '0217-2601200',
            totalBeds: 50,
            availableBeds: 18,
            icuTotal: 5,
            icuAvailable: 2
          }
        ]
      },
      // ZONE 2
      {
        wardName: 'Budhwar Peth',
        wardCode: 'W002',
        zone: 'Zone 2',
        population: 42000,
        activeCaseCount: 28,
        riskLevel: 'Yellow',
        hospitals: [
          {
            hospitalName: 'Budhwar General Hospital',
            address: 'Budhwar Peth, Solapur',
            contact: '0217-2612300',
            totalBeds: 100,
            availableBeds: 22,
            icuTotal: 10,
            icuAvailable: 3
          },
          {
            hospitalName: 'Peth Community Clinic',
            address: 'Main Road, Budhwar Peth',
            contact: '0217-2612400',
            totalBeds: 30,
            availableBeds: 10,
            icuTotal: 3,
            icuAvailable: 1
          }
        ]
      },
      // ZONE 3
      {
        wardName: 'Hotgi Road',
        wardCode: 'W003',
        zone: 'Zone 3',
        population: 36000,
        activeCaseCount: 55,
        riskLevel: 'Red',
        hospitals: [
          {
            hospitalName: 'Hotgi Road District Hospital',
            address: 'Hotgi Road, Solapur',
            contact: '0217-2623400',
            totalBeds: 150,
            availableBeds: 12,
            icuTotal: 15,
            icuAvailable: 2
          },
          {
            hospitalName: 'Hotgi PHC',
            address: 'Hotgi Naka, Solapur',
            contact: '0217-2623500',
            totalBeds: 40,
            availableBeds: 8,
            icuTotal: 4,
            icuAvailable: 0
          }
        ]
      },
      // ZONE 4
      {
        wardName: 'Vijapur Road',
        wardCode: 'W004',
        zone: 'Zone 4',
        population: 39500,
        activeCaseCount: 18,
        riskLevel: 'Green',
        hospitals: [
          {
            hospitalName: 'Vijapur Road Medical Centre',
            address: 'Vijapur Road, Solapur',
            contact: '0217-2634500',
            totalBeds: 80,
            availableBeds: 35,
            icuTotal: 8,
            icuAvailable: 5
          },
          {
            hospitalName: 'North Solapur Health Post',
            address: 'Vijapur Road Extension',
            contact: '0217-2634600',
            totalBeds: 25,
            availableBeds: 14,
            icuTotal: 2,
            icuAvailable: 2
          }
        ]
      },
      // ZONE 5
      {
        wardName: 'Akkalkot Road',
        wardCode: 'W005',
        zone: 'Zone 5',
        population: 41000,
        activeCaseCount: 32,
        riskLevel: 'Yellow',
        hospitals: [
          {
            hospitalName: 'Akkalkot Road Hospital',
            address: 'Akkalkot Road, Solapur',
            contact: '0217-2645600',
            totalBeds: 120,
            availableBeds: 28,
            icuTotal: 12,
            icuAvailable: 4
          },
          {
            hospitalName: 'South Solapur PHC',
            address: 'Akkalkot Naka, Solapur',
            contact: '0217-2645700',
            totalBeds: 35,
            availableBeds: 11,
            icuTotal: 3,
            icuAvailable: 1
          }
        ]
      },
      // ZONE 6
      {
        wardName: 'Osmanabad Naka',
        wardCode: 'W006',
        zone: 'Zone 6',
        population: 37500,
        activeCaseCount: 9,
        riskLevel: 'Green',
        hospitals: [
          {
            hospitalName: 'Osmanabad Naka Clinic',
            address: 'Osmanabad Naka, Solapur',
            contact: '0217-2656700',
            totalBeds: 60,
            availableBeds: 40,
            icuTotal: 6,
            icuAvailable: 6
          },
          {
            hospitalName: 'East Zone Health Centre',
            address: 'Near Osmanabad Naka',
            contact: '0217-2656800',
            totalBeds: 20,
            availableBeds: 15,
            icuTotal: 2,
            icuAvailable: 2
          }
        ]
      },
      // ZONE 7
      {
        wardName: 'Kegaon',
        wardCode: 'W007',
        zone: 'Zone 7',
        population: 43000,
        activeCaseCount: 47,
        riskLevel: 'Yellow',
        hospitals: [
          {
            hospitalName: 'Kegaon Urban Health Centre',
            address: 'Kegaon, Solapur',
            contact: '0217-2667800',
            totalBeds: 90,
            availableBeds: 20,
            icuTotal: 9,
            icuAvailable: 3
          },
          {
            hospitalName: 'Kegaon PHC',
            address: 'Main Road, Kegaon',
            contact: '0217-2667900',
            totalBeds: 30,
            availableBeds: 9,
            icuTotal: 3,
            icuAvailable: 1
          },
          {
            hospitalName: 'Kegaon Maternity Home',
            address: 'Kegaon Colony, Solapur',
            contact: '0217-2668000',
            totalBeds: 25,
            availableBeds: 12,
            icuTotal: 2,
            icuAvailable: 1
          }
        ]
      },
      // ZONE 8
      {
        wardName: 'Kambar',
        wardCode: 'W008',
        zone: 'Zone 8',
        population: 35000,
        activeCaseCount: 14,
        riskLevel: 'Green',
        hospitals: [
          {
            hospitalName: 'Kambar Community Hospital',
            address: 'Kambar, Solapur',
            contact: '0217-2678900',
            totalBeds: 70,
            availableBeds: 38,
            icuTotal: 7,
            icuAvailable: 5
          },
          {
            hospitalName: 'Kambar Health Post',
            address: 'Kambar Road, Solapur',
            contact: '0217-2679000',
            totalBeds: 20,
            availableBeds: 12,
            icuTotal: 2,
            icuAvailable: 2
          },
          {
            hospitalName: 'West Zone Dispensary',
            address: 'Kambar Colony, Solapur',
            contact: '0217-2679100',
            totalBeds: 15,
            availableBeds: 8,
            icuTotal: 1,
            icuAvailable: 1
          }
        ]
      }
    ];

    await Ward.insertMany(wardsData);
    console.log('Wards and hospitals seeded...');

    console.log('');
    console.log('=============================');
    console.log('SEED COMPLETE!');
    console.log('=============================');
    console.log('Demo Login Credentials:');
    console.log('');
    console.log('Health Officer:');
    console.log('  Email:    officer@smc.gov');
    console.log('  Password: officer123');
    console.log('');
    console.log('Hospital Staff:');
    console.log('  Email:    hospital@kmc.in');
    console.log('  Password: hospital123');
    console.log('');
    console.log('Citizen:');
    console.log('  Email:    citizen@gmail.com');
    console.log('  Password: citizen123');
    console.log('=============================');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();