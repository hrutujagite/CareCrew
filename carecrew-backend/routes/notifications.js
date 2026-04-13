const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');

// POST /api/notifications/whatsapp
router.post('/whatsapp', protect, authorizeRoles('healthOfficer'), async (req, res) => {
  const { alertId, wardName, alertType, severity, message } = req.body;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  const to   = process.env.TWILIO_WHATSAPP_TO;

  try {
    const client = require('twilio')(accountSid, authToken);
    const emoji = severity === 'Critical' ? '🚨' : '⚠️';
    await client.messages.create({
      from, 
      to,
      body: `${emoji} *CareCrew Alert*\n\n*Ward:* ${wardName}\n*Issue:* ${alertType}\n*Severity:* ${severity}\n\n${message}`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
