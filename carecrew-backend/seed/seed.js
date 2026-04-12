const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);
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
const Broadcast = require('../models/Broadcast');
const IndentRequest = require('../models/IndentRequest');

// ─────────────────────────────────────────────
// HELPER: Convert time slots to schedule array
// ─────────────────────────────────────────────
const makeSchedule = (startTime, endTime) => {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => ({
    day,
    startTime,
    endTime,
    maxAppointments: 20
  }));
};

// ─────────────────────────────────────────────
// REAL SOLAPUR WARDS + HOSPITALS + UPHCS + DOCTORS
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: true, maternity: true,
          icu: true, lab: true, xray: true, ultrasound: true, ecg: true,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: true, pharmacy: true, immunization: true
        },
        specialties: ['General', 'Paediatrics', 'Gynaecology', 'Emergency'],
        doctors: [
          { name: 'Dr. Priya Kulkarni', specialty: 'General', experience: 12, rating: 4.7, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Suresh Patil', specialty: 'Paediatrics', experience: 8, rating: 4.5, isVisiting: false, schedule: makeSchedule('09:30 AM', '01:00 PM') },
          { name: 'Dr. Anita Deshmukh', specialty: 'Gynaecology', experience: 15, rating: 4.8, isVisiting: true, schedule: makeSchedule('10:00 AM', '02:00 PM') },
          { name: 'Dr. Rajesh More', specialty: 'Emergency', experience: 10, rating: 4.6, isVisiting: false, schedule: makeSchedule('08:00 AM', '02:00 PM') }
        ]
      },
      {
        hospitalName: 'Bhavani Peth UPHC',
        address: 'Near Bhavani Temple, Bhavani Peth, Solapur - 413002',
        contact: '0217-2724500',
        lat: 17.6880,
        lng: 75.9080,
        totalBeds: 4,
        availableBeds: 3,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Mahesh Jadhav', specialty: 'General', experience: 6, rating: 4.3, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: true, maternity: false,
          icu: true, lab: true, xray: true, ultrasound: false, ecg: true,
          bloodBank: false, pediatric: false, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: true, pharmacy: true, immunization: true
        },
        specialties: ['General', 'Cardiology', 'Orthopaedics', 'Emergency'],
        doctors: [
          { name: 'Dr. Anil Kumbhar', specialty: 'General', experience: 14, rating: 4.6, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Sneha Reddy', specialty: 'Cardiology', experience: 11, rating: 4.9, isVisiting: true, schedule: makeSchedule('10:00 AM', '02:00 PM') },
          { name: 'Dr. Vikram Salunkhe', specialty: 'Orthopaedics', experience: 7, rating: 4.4, isVisiting: false, schedule: makeSchedule('09:30 AM', '01:30 PM') },
          { name: 'Dr. Pooja Naik', specialty: 'Emergency', experience: 5, rating: 4.2, isVisiting: false, schedule: makeSchedule('08:00 AM', '02:00 PM') }
        ]
      },
      {
        hospitalName: 'North Solapur UPHC',
        address: 'North Solapur Ward, Solapur - 413006',
        contact: '0217-2741200',
        lat: 17.7130,
        lng: 75.9190,
        totalBeds: 4,
        availableBeds: 2,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Kavita Shinde', specialty: 'General', experience: 5, rating: 4.2, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: true, maternity: true,
          icu: true, lab: true, xray: true, ultrasound: true, ecg: true,
          bloodBank: true, pediatric: false, dental: false, eye: false,
          dotsTb: false, dialysis: false, ambulance: true, pharmacy: true, immunization: false
        },
        specialties: ['General', 'Neurology', 'Gynaecology'],
        doctors: [
          { name: 'Dr. Ramesh Gaikwad', specialty: 'General', experience: 18, rating: 4.8, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Meena Joshi', specialty: 'Neurology', experience: 13, rating: 4.7, isVisiting: true, schedule: makeSchedule('10:30 AM', '02:30 PM') },
          { name: 'Dr. Sunita Pawar', specialty: 'Gynaecology', experience: 10, rating: 4.5, isVisiting: false, schedule: makeSchedule('09:30 AM', '01:30 PM') }
        ]
      },
      {
        hospitalName: 'Laxmi Peth UPHC',
        address: 'Laxmi Peth, Solapur - 413002',
        contact: '0217-2735100',
        lat: 17.6795,
        lng: 75.9025,
        totalBeds: 4,
        availableBeds: 4,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Seema Kulkarni', specialty: 'General', experience: 7, rating: 4.3, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: true, maternity: false,
          icu: true, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General', 'Paediatrics', 'Emergency'],
        doctors: [
          { name: 'Dr. Santosh Kamble', specialty: 'General', experience: 9, rating: 4.4, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Ashwini Mane', specialty: 'Paediatrics', experience: 7, rating: 4.6, isVisiting: false, schedule: makeSchedule('10:00 AM', '02:00 PM') }
        ]
      },
      {
        hospitalName: 'Murarji Peth UPHC',
        address: 'Datta Nagar, Murarji Peth, Solapur',
        contact: '0217-2714400',
        lat: 17.6935,
        lng: 75.8995,
        totalBeds: 4,
        availableBeds: 2,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Prakash Lokhande', specialty: 'General', experience: 5, rating: 4.1, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: false, maternity: false,
          icu: true, lab: true, xray: true, ultrasound: false, ecg: true,
          bloodBank: false, pediatric: false, dental: true, eye: true,
          dotsTb: false, dialysis: false, ambulance: false, pharmacy: true, immunization: false
        },
        specialties: ['General', 'Dermatology', 'ENT'],
        doctors: [
          { name: 'Dr. Nilesh Kulkarni', specialty: 'General', experience: 11, rating: 4.5, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Archana Bhosale', specialty: 'Dermatology', experience: 8, rating: 4.7, isVisiting: true, schedule: makeSchedule('10:00 AM', '02:00 PM') },
          { name: 'Dr. Sanjay Aware', specialty: 'ENT', experience: 12, rating: 4.6, isVisiting: true, schedule: makeSchedule('09:30 AM', '01:30 PM') }
        ]
      },
      {
        hospitalName: 'Shukrawar Peth UPHC',
        address: 'Shukrawar Peth, Solapur - 413001',
        contact: '0217-2726700',
        lat: 17.6860,
        lng: 75.9105,
        totalBeds: 4,
        availableBeds: 3,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Rekha Patil', specialty: 'General', experience: 4, rating: 4.0, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: true, maternity: false,
          icu: true, lab: true, xray: true, ultrasound: true, ecg: true,
          bloodBank: true, pediatric: false, dental: false, eye: true,
          dotsTb: false, dialysis: true, ambulance: true, pharmacy: true, immunization: false
        },
        specialties: ['General', 'Cardiology', 'Ophthalmology'],
        doctors: [
          { name: 'Dr. Vinod Chavan', specialty: 'General', experience: 16, rating: 4.7, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Rupali Patil', specialty: 'Cardiology', experience: 10, rating: 4.8, isVisiting: true, schedule: makeSchedule('10:30 AM', '02:30 PM') },
          { name: 'Dr. Ganesh Nair', specialty: 'Ophthalmology', experience: 9, rating: 4.5, isVisiting: true, schedule: makeSchedule('09:30 AM', '01:30 PM') }
        ]
      },
      {
        hospitalName: 'Sakhar Peth UPHC',
        address: 'Sakhar Peth, Solapur - 413005',
        contact: '0217-2755100',
        lat: 17.6755,
        lng: 75.9155,
        totalBeds: 4,
        availableBeds: 4,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Anand Kale', specialty: 'General', experience: 6, rating: 4.2, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: false, maternity: true,
          icu: true, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: false, dental: false, eye: false,
          dotsTb: false, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General', 'Orthopaedics', 'Gynaecology'],
        doctors: [
          { name: 'Dr. Deepak Wagh', specialty: 'General', experience: 8, rating: 4.3, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Smita Jagtap', specialty: 'Gynaecology', experience: 12, rating: 4.6, isVisiting: true, schedule: makeSchedule('10:00 AM', '02:00 PM') }
        ]
      },
      {
        hospitalName: 'Budhwar Peth UPHC',
        address: 'Budhwar Peth, Solapur - 413002',
        contact: '0217-2718100',
        lat: 17.6815,
        lng: 75.9045,
        totalBeds: 4,
        availableBeds: 2,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Prachi More', specialty: 'General', experience: 3, rating: 4.1, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: true, maternity: false,
          icu: true, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: false, dental: false, eye: false,
          dotsTb: false, dialysis: false, ambulance: false, pharmacy: true, immunization: false
        },
        specialties: ['General', 'Emergency'],
        doctors: [
          { name: 'Dr. Harish Deshpande', specialty: 'General', experience: 7, rating: 4.2, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Geeta Rathod', specialty: 'Emergency', experience: 6, rating: 4.4, isVisiting: false, schedule: makeSchedule('08:00 AM', '02:00 PM') }
        ]
      },
      {
        hospitalName: 'Osmanabad Naka UPHC',
        address: 'Osmanabad Naka, Solapur - 413004',
        contact: '0217-2760200',
        lat: 17.6705,
        lng: 75.9205,
        totalBeds: 4,
        availableBeds: 3,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Sunil Patil', specialty: 'General', experience: 4, rating: 4.0, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: true, maternity: true,
          icu: true, lab: true, xray: true, ultrasound: false, ecg: true,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: true, pharmacy: true, immunization: true
        },
        specialties: ['General', 'Paediatrics', 'Cardiology'],
        doctors: [
          { name: 'Dr. Pallavi Shete', specialty: 'General', experience: 10, rating: 4.5, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Ajay Mundhe', specialty: 'Cardiology', experience: 14, rating: 4.8, isVisiting: true, schedule: makeSchedule('10:00 AM', '02:00 PM') },
          { name: 'Dr. Rekha Bhandare', specialty: 'Paediatrics', experience: 6, rating: 4.4, isVisiting: false, schedule: makeSchedule('09:30 AM', '01:30 PM') }
        ]
      },
      {
        hospitalName: 'Kegaon UPHC',
        address: 'Kegaon, Solapur - 413006',
        contact: '0217-2742300',
        lat: 17.7055,
        lng: 75.9305,
        totalBeds: 4,
        availableBeds: 2,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Vijay Salunkhe', specialty: 'General', experience: 5, rating: 4.2, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
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
        facilityType: 'general',
        facilities: {
          opd: true, inpatient: true, emergency: true, maternity: false,
          icu: true, lab: true, xray: true, ultrasound: true, ecg: true,
          bloodBank: false, pediatric: false, dental: false, eye: false,
          dotsTb: false, dialysis: false, ambulance: true, pharmacy: true, immunization: false
        },
        specialties: ['General', 'Neurology', 'Orthopaedics', 'Emergency'],
        doctors: [
          { name: 'Dr. Mohan Taware', specialty: 'General', experience: 20, rating: 4.9, isVisiting: false, schedule: makeSchedule('09:00 AM', '01:00 PM') },
          { name: 'Dr. Vaishali Gore', specialty: 'Neurology', experience: 11, rating: 4.7, isVisiting: true, schedule: makeSchedule('10:30 AM', '02:30 PM') },
          { name: 'Dr. Ravi Kale', specialty: 'Orthopaedics', experience: 8, rating: 4.5, isVisiting: true, schedule: makeSchedule('09:30 AM', '01:30 PM') }
        ]
      },
      {
        hospitalName: 'Vijapur Road UPHC',
        address: 'Vijapur Road, Solapur - 413007',
        contact: '0217-2771600',
        lat: 17.6955,
        lng: 75.8855,
        totalBeds: 4,
        availableBeds: 4,
        icuTotal: 0,
        icuAvailable: 0,
        facilityType: 'uphc',
        facilities: {
          opd: true, inpatient: false, emergency: false, maternity: true,
          icu: false, lab: true, xray: false, ultrasound: false, ecg: false,
          bloodBank: false, pediatric: true, dental: false, eye: false,
          dotsTb: true, dialysis: false, ambulance: false, pharmacy: true, immunization: true
        },
        specialties: ['General'],
        doctors: [
          { name: 'Dr. Nandini Jadhav', specialty: 'General', experience: 4, rating: 4.1, isVisiting: false, schedule: makeSchedule('09:00 AM', '04:00 PM') }
        ]
      }
    ]
  }
];

// ─────────────────────────────────────────────
// SEED USERS
// ─────────────────────────────────────────────
const userData = [
  {
    name: 'SMC Health Officer',
    email: 'officer@smc.gov.in',
    password: 'officer123',
    role: 'healthOfficer',
    hospitalName: null,
    ward: null
  },
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
  // UPHC Staff
  {
    name: 'Bhavani Peth UPHC Staff',
    email: 'uphc.bhavani@smc.gov.in',
    password: 'uphc123',
    role: 'hospitalStaff',
    hospitalName: 'Bhavani Peth UPHC',
    ward: 'Bhavani Peth'
  },
  {
    name: 'Kegaon UPHC Staff',
    email: 'uphc.kegaon@smc.gov.in',
    password: 'uphc123',
    role: 'hospitalStaff',
    hospitalName: 'Kegaon UPHC',
    ward: 'Kegaon'
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
// SEED HEALTH CAMPS — updated campType enum
// ─────────────────────────────────────────────
const healthCampData = [
  {
    hospitalName: 'Bhavani Peth General Hospital',
    wardName: 'Bhavani Peth',
    title: 'Free Dengue Awareness & Checkup Camp',
    description: 'Free blood tests and dengue awareness for Bhavani Peth residents',
    campType: 'Vector Disease Control Camp',
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
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
    campType: 'Eye Checkup Camp',
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
    campType: 'Blood Donation Drive',
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
    campType: 'Routine Immunization Drive',
    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
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
    campType: 'NCD Screening Camp',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    timing: '9:00 AM - 2:00 PM',
    location: 'Shukrawar Peth Garden',
    contactInfo: '0217-2726600'
  },
  // UPHC Health Camps
  {
    hospitalName: 'Bhavani Peth UPHC',
    wardName: 'Bhavani Peth',
    title: 'Maternal Health Camp — Antenatal Checkup',
    description: 'Free antenatal checkup, iron tablets and nutrition counselling for pregnant women',
    campType: 'Maternal Health Camp',
    startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    timing: '9:00 AM - 1:00 PM',
    location: 'Bhavani Peth UPHC Premises',
    contactInfo: '0217-2724500'
  },
  {
    hospitalName: 'Kegaon UPHC',
    wardName: 'Kegaon',
    title: 'TB Awareness & DOTS Camp',
    description: 'Free TB screening and DOTS treatment awareness for Kegaon residents',
    campType: 'TB Awareness & DOTS Camp',
    startDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    timing: '9:00 AM - 3:00 PM',
    location: 'Kegaon UPHC Premises',
    contactInfo: '0217-2742300'
  }
];

// ─────────────────────────────────────────────
// DISEASE REPORTS CONFIG
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
    await Broadcast.deleteMany({});
    await IndentRequest.deleteMany({});
    console.log('All collections cleared');

    // Seed Wards
    const wards = await Ward.insertMany(wardData);
    console.log(`${wards.length} wards seeded`);

    // Seed Users
    const createdUsers = [];
    for (const u of userData) {
      const user = await User.create(u);
      createdUsers.push(user);
    }
    console.log(`${createdUsers.length} users seeded`);

    const citizenUser = createdUsers.find(u => u.email === 'rahul@citizen.com');
    const staffUsers = createdUsers.filter(u => u.role === 'hospitalStaff');
    const officerUser = createdUsers.find(u => u.role === 'healthOfficer');

    // Seed Disease Reports — last 14 days
    const diseaseReports = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(10, 0, 0, 0);

      for (const ward of wardsForReports) {
        const staffUser = staffUsers.find(u => u.hospitalName === ward.hospitalName);
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
            submittedBy: staffUser ? staffUser._id : null,
            createdAt: date
          });
        }
      }
    }
    await DiseaseReport.insertMany(diseaseReports);
    console.log(`${diseaseReports.length} disease reports seeded`);

    // Seed Hospital Capacity — updated with emergencyBeds
    const capacityRecords = [];
    for (const ward of wards) {
      for (const hospital of ward.hospitals) {
        const staffUser = staffUsers.find(u => u.hospitalName === hospital.hospitalName);
        const isUPHC = hospital.facilityType === 'uphc';
        capacityRecords.push({
          hospitalName: hospital.hospitalName,
          ward: ward.wardName,
          totalBeds: hospital.totalBeds,
          availableBeds: hospital.availableBeds,
          icuTotal: hospital.icuTotal,
          icuAvailable: hospital.icuAvailable,
          emergencyBedsTotal: isUPHC ? 0 : Math.floor(hospital.totalBeds * 0.1),
          emergencyBedsAvailable: isUPHC ? 0 : Math.floor(hospital.availableBeds * 0.1),
          oxygenTotal: isUPHC ? 0 : 100,
          oxygenAvailable: isUPHC ? 0 : Math.floor(Math.random() * 40) + 40,
          medicineStockPercentage: Math.floor(Math.random() * 40) + 50,
          submittedBy: staffUser ? staffUser._id : null,
          lastUpdated: new Date()
        });
      }
    }
    await HospitalCapacity.insertMany(capacityRecords);
    console.log(`${capacityRecords.length} capacity records seeded`);

    // Update ward stats from disease reports
    for (const ward of wards) {
      const allReports = await DiseaseReport.find({ wardName: ward.wardName });
      const totalConfirmed = allReports.reduce((s, r) => s + r.newConfirmed, 0);
      const totalRecovered = allReports.reduce((s, r) => s + r.newRecovered, 0);
      const totalDeaths = allReports.reduce((s, r) => s + r.newDeaths, 0);
      const activeCaseCount = Math.max(0, totalConfirmed - totalRecovered - totalDeaths);

      const diseaseMap = {};
      allReports.forEach(r => {
        diseaseMap[r.diseaseName] = (diseaseMap[r.diseaseName] || 0) + r.newConfirmed;
      });
      const topDisease = Object.keys(diseaseMap).sort(
        (a, b) => diseaseMap[b] - diseaseMap[a]
      )[0] || null;

      let riskLevel = 'Green';
      if (activeCaseCount > 50) riskLevel = 'Red';
      else if (activeCaseCount > 25) riskLevel = 'Yellow';

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

    // Seed Alerts — updated with hospitalName
    const updatedWards = await Ward.find({ riskLevel: { $in: ['Yellow', 'Red'] } });
    for (const ward of updatedWards) {
      const firstHospital = ward.hospitals[0];
      await Alert.create({
        wardName: ward.wardName,
        alertType: 'Outbreak',
        severity: ward.riskLevel,
        message: `${ward.riskLevel === 'Red' ? 'Critical' : 'Warning'}: ${ward.activeCaseCount} active ${ward.topDisease} cases in ${ward.wardName}`,
        diseaseName: ward.topDisease,
        caseCount: ward.activeCaseCount,
        hospitalName: firstHospital ? firstHospital.hospitalName : null,
        isActive: true
      });
    }
    console.log('Alerts seeded');

    // Seed Health Camps
    for (const camp of healthCampData) {
      const staffUser = staffUsers.find(u => u.hospitalName === camp.hospitalName);
      await HealthCamp.create({
        ...camp,
        createdBy: staffUser ? staffUser._id : null
      });
    }
    console.log(`${healthCampData.length} health camps seeded`);

    // Seed Sample Broadcast
    if (officerUser) {
      await Broadcast.create({
        title: 'Dengue Prevention Advisory — Solapur',
        category: 'health_advisory',
        targetAudience: 'all_citizens',
        priority: 'urgent',
        message: 'Dengue cases are rising across Solapur wards. Please eliminate stagnant water around your homes, use mosquito repellents and visit your nearest UPHC if you have fever symptoms.',
        postedBy: officerUser._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true
      });
      console.log('Sample broadcast seeded');
    }

    // Seed Sample Indent Request
    const bhavaniStaff = staffUsers.find(u => u.hospitalName === 'Bhavani Peth General Hospital');
    if (bhavaniStaff) {
      await IndentRequest.create({
        hospitalName: 'Bhavani Peth General Hospital',
        wardName: 'Bhavani Peth',
        itemName: 'Paracetamol 500mg',
        itemType: 'medicine',
        quantityRequired: 500,
        urgency: 'urgent',
        reason: 'Stock running low due to increased dengue and fever cases',
        status: 'pending',
        submittedBy: bhavaniStaff._id
      });
      console.log('Sample indent request seeded');
    }

    // Seed Sample Appointments
    if (citizenUser) {
      await Appointment.create({
        citizenName: citizenUser.name,
        contact: '9664269817',
        hospitalName: 'Bhavani Peth General Hospital',
        ward: 'Bhavani Peth',
        specialty: 'General',
        doctorName: 'Dr. Priya Kulkarni',
        preferredDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        timeSlot: '10:30 AM',
        chiefComplaint: 'Fever and body ache for 3 days',
        bookedBy: citizenUser._id,
        status: 'Confirmed',
        rating: 4
      });
      await Appointment.create({
        citizenName: citizenUser.name,
        contact: '9664269817',
        hospitalName: 'Bhavani Peth UPHC',
        ward: 'Bhavani Peth',
        specialty: 'General',
        doctorName: 'Dr. Mahesh Jadhav',
        preferredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        timeSlot: '09:00 AM',
        chiefComplaint: 'Routine checkup',
        bookedBy: citizenUser._id,
        status: 'Pending',
        rating: null
      });
      console.log('Sample appointments seeded');
    }

    console.log('\n✅ DATABASE SEEDED SUCCESSFULLY');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('Health Officer  → officer@smc.gov.in / officer123');
    console.log('Hospital Staff  → staff.bhavani@hospital.com / hospital123');
    console.log('UPHC Staff      → uphc.bhavani@smc.gov.in / uphc123');
    console.log('Citizen         → rahul@citizen.com / citizen123');
    console.log('\n🏥 Wards seeded:', wards.map(w => w.wardName).join(', '));
    console.log('\n🏨 UPHCs seeded: Bhavani Peth, North Solapur, Laxmi Peth, Murarji Peth,');
    console.log('   Shukrawar Peth, Sakhar Peth, Budhwar Peth, Osmanabad Naka, Kegaon, Vijapur Road');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
