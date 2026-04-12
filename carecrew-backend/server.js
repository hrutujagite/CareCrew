const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const diseaseRoutes = require('./routes/disease');
const capacityRoutes = require('./routes/capacity');
const dashboardRoutes = require('./routes/dashboard');
const hospitalRoutes = require('./routes/hospitals');
const appointmentRoutes = require('./routes/appointments');
const forecastRoutes = require('./routes/forecast');
const wardRoutes = require('./routes/wards');
const healthCampRoutes = require('./routes/healthcamps');
const chatRoutes = require('./routes/chat');
const indentRoutes = require('./routes/indent');
const broadcastRoutes = require('./routes/broadcasts');

app.use('/api/auth', authRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/capacity', capacityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/healthcamps', healthCampRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/indent', indentRoutes);
app.use('/api/broadcasts', broadcastRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'SwasthSolapur API is running!' });
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
