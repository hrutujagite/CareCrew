require('dotenv').config();
const mongoose = require('mongoose');
const Ward = require('./models/Ward');
const HospitalCapacity = require('./models/HospitalCapacity');
const User = require('./models/User');
const Appointment = require('./models/Appointment');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Ward.updateOne(
    { wardName: 'Kegaon' },
    { $pull: { hospitals: { hospitalName: 'Test Hospital Solapur' } } }
  );
  await HospitalCapacity.deleteMany({ hospitalName: 'Test Hospital Solapur' });
  await User.deleteMany({ email: 'test@hospital.com' });
  await Appointment.deleteMany({ hospitalName: 'Test Hospital Solapur' });
  console.log('Test Hospital Solapur removed successfully');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });