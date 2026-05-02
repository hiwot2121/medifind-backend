const axios = require('axios');

// Store OTPs temporarily
const otpStore = new Map();

// Clean up expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiry) {
      otpStore.delete(email);
      console.log(`🗑️ Auto-cleaned expired OTP for: ${email}`);
    }
  }
}, 60000);

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP using Brevo API (No IP restrictions!)
const sendOTP = async (email, otp) => {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ BREVO_API_KEY not found. OTP will be logged to console only.');
    console.log(`📧 [TEST MODE] OTP for ${email}: ${otp}`);
    return true;
  }
  
  console.log(`📧 Sending OTP to ${email} via Brevo API`);
  
  const fromEmail = process.env.VERIFIED_SENDER || 'betikiya73@gmail.com';
  
  const emailData = {
    sender: { name: 'MediFind', email: fromEmail },
    to: [{ email: email }],
    subject: 'Verify Your Pharmacy Account - MediFind',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">MediFind Verification</h2>
        <div style="background-color: #f0f9ff; padding: 20px; text-align: center;">
          <h1 style="color: #2563eb; font-size: 48px;">${otp}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      </div>
    `
  };
  
  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      timeout: 30000
    });
    
    console.log(`✅ OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Brevo API error:', error.response?.data || error.message);
    throw new Error('Failed to send OTP email');
  }
};

// Request OTP endpoint
const requestOTP = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  
  const otp = generateOTP();
  const expiryTime = Date.now() + 10 * 60 * 1000;
  
  otpStore.set(email, {
    otp: otp,
    expiry: expiryTime,
    attempts: 0
  });
  
  console.log(`🔐 OTP generated for ${email}: ${otp}`);
  
  try {
    await sendOTP(email, otp);
    res.json({ success: true, message: 'OTP sent successfully!' });
  } catch (error) {
    otpStore.delete(email);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// Verify OTP endpoint
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  
  const storedData = otpStore.get(email);
  
  if (!storedData) {
    return res.status(400).json({ success: false, message: 'No OTP found. Request a new code.' });
  }
  
  if (Date.now() > storedData.expiry) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP has expired.' });
  }
  
  if (storedData.otp !== otp) {
    storedData.attempts++;
    if (storedData.attempts >= 5) {
      otpStore.delete(email);
    }
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }
  
  otpStore.delete(email);
  res.json({ success: true, message: 'Email verified successfully!' });
};

// Get OTP status
const getOTPStatus = async (req, res) => {
  const { email } = req.query;
  const storedData = otpStore.get(email);
  
  if (!storedData) {
    return res.json({ exists: false });
  }
  
  const timeLeft = Math.max(0, Math.floor((storedData.expiry - Date.now()) / 1000));
  
  res.json({
    exists: true,
    attemptsLeft: 5 - storedData.attempts,
    expiresInSeconds: timeLeft
  });
};

module.exports = { requestOTP, verifyOTP, getOTPStatus };