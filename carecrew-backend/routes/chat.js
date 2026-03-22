const express = require('express');
const router = express.Router();
const Ward = require('../models/Ward');
const HospitalCapacity = require('../models/HospitalCapacity');

const SYSTEM_PROMPT = `You are SwasthBot, a friendly health assistant for SwasthSolapur — a citizen health portal run by the Solapur Municipal Corporation.

You help citizens of Solapur with:
1. Navigating the portal — booking appointments, viewing their appointments, using the emergency hospital finder
2. Answering questions about hospitals, specialties, and doctors available in Solapur
3. Explaining how to use portal features

PORTAL FEATURES:
- Home page: Quick Connect (book appointment), Live Bed Availability (all hospitals), Emergency Hospital Finder (GPS-based nearest hospital with available beds)
- Appointment Booking: Select hospital → specialty → doctor → date → time → confirm. Get a booking reference like CC123456.
- My Appointments: View all bookings, cancel upcoming appointments (need 24hrs notice, bring valid ID)
- Emergency Hospital Finder: Click "Find Nearest Available Hospital", allow GPS, shows 3 nearest hospitals with beds and ICU availability, click "Get Directions" to open Google Maps

RULES:
- Keep responses short, clear, and helpful — this is a chat interface
- If asked about specific live bed counts, reference the live data provided
- If asked about emergencies, always direct them to use the Emergency Hospital Finder on Home
- Never make up doctor names or availability — tell them to check the booking form
- Respond in the same language the user writes in (English or Marathi)
- Be warm and helpful — citizens may be stressed or unwell`;

// @route  POST /api/chat
// @desc   Proxy chat messages to Gemini API with live hospital context
// @access Public
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'messages array is required'
      });
    }

    // Fetch live hospital data for context
    let hospitalContext = '';
    try {
      const wards = await Ward.find();
      const hospitalLines = [];

      for (const ward of wards) {
        for (const hospital of ward.hospitals) {
          const latestCapacity = await HospitalCapacity.findOne({
            hospitalName: hospital.hospitalName
          }).sort({ lastUpdated: -1 });

          const availableBeds = latestCapacity
            ? latestCapacity.availableBeds
            : hospital.availableBeds;
          const totalBeds = latestCapacity
            ? latestCapacity.totalBeds
            : hospital.totalBeds;
          const icuAvailable = latestCapacity
            ? latestCapacity.icuAvailable
            : hospital.icuAvailable;
          const icuTotal = latestCapacity
            ? latestCapacity.icuTotal
            : hospital.icuTotal;

          let bedStatus = 'Normal';
          if (totalBeds > 0) {
            const pct = availableBeds / totalBeds;
            if (pct < 0.1) bedStatus = 'Critical';
            else if (pct < 0.3) bedStatus = 'Limited';
          }

          hospitalLines.push(
            `${hospital.hospitalName} (${ward.wardName}): ` +
            `${availableBeds}/${totalBeds} beds, ` +
            `ICU ${icuAvailable}/${icuTotal}, ` +
            `Status: ${bedStatus}, ` +
            `Specialties: ${(hospital.specialties || []).join(', ')}`
          );
        }
      }

      if (hospitalLines.length > 0) {
        hospitalContext = '\n\nCURRENT LIVE HOSPITAL DATA:\n' +
          hospitalLines.join('\n');
      }
    } catch (dbErr) {
      console.error('ChatBot DB context error:', dbErr.message);
    }

    // Build Gemini conversation history
    // Gemini uses 'user' and 'model' roles (not 'assistant')
    // First message must be from user — skip leading assistant messages
    const geminiMessages = messages
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
      // Gemini requires conversation to start with user turn
      .filter((m, i) => !(i === 0 && m.role === 'model'))

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT + hospitalContext }]
          },
          contents: geminiMessages,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json();
      console.error('Gemini API error:', errData);
      return res.status(500).json({
        success: false,
        message: 'AI service error',
        error: errData
      });
    }

    const data = await geminiRes.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Sorry, I could not generate a response.';

    res.json({ success: true, reply });

  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
