const nodemailer = require('nodemailer');

// Store OTPs temporarily (in memory - for production use Redis)
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

// Configure email transporter - Supports both Brevo and Gmail
const createTransporter = () => {
  // Check if we have email credentials
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Email credentials not found. OTP will be logged to console only.');
    return null;
  }
  
  // Auto-detect which email service to use based on host
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  
  // Gmail SMTP Configuration
  if (host.includes('gmail')) {
    return nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // false for port 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  
  // Brevo SMTP Configuration (fallback)
  return nodemailer.createTransport({
    host: host,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to email
const sendOTP = async (email, otp) => {
  const transporter = createTransporter();
  
  // If no email configured, just log the OTP (for testing)
  if (!transporter) {
    console.log(`📧 [TEST MODE] OTP for ${email}: ${otp}`);
    return true;
  }
  
  // Use VERIFIED_SENDER from .env or fallback to email user
  const fromEmail = process.env.VERIFIED_SENDER || process.env.EMAIL_USER;
  
  const mailOptions = {
    from: `"MediFind" <${fromEmail}>`,
    to: email,
    subject: 'Verify Your Pharmacy Account - MediFind',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg width="50" height="50" viewBox="0 0 100 100" fill="none">
            <path d="M50 10C35 10 23 22 23 37C23 52 50 80 50 80C50 80 77 52 77 37C77 22 65 10 50 10Z" fill="#2563eb"/>
            <rect x="40" y="30" width="20" height="25" rx="10" fill="white"/>
            <circle cx="45" cy="42.5" r="5" fill="#2563eb"/>
            <circle cx="55" cy="42.5" r="5" fill="#2563eb"/>
          </svg>
          <h2 style="color: #2563eb; margin: 10px 0 0 0;">MediFind</h2>
          <p style="color: #666; margin: 5px 0 0 0;">Pharmacy Registration Verification</p>
        </div>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #2563eb; font-size: 16px;">Your verification code is:</p>
          <h1 style="color: #2563eb; font-size: 48px; letter-spacing: 5px; margin: 10px 0;">${otp}</h1>
          <p style="color: #666; font-size: 14px;">This code will expire in <strong>10 minutes</strong></p>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 14px;">
            If you didn't request this code, please ignore this email.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 15px;">
            This is an automated message, please do not reply.
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    throw error;
  }
};

// Request OTP endpoint handler
const requestOTP = async (req, res) => {
  const { email } = req.body;
  
  console.log(`📧 OTP Request received for: ${email}`);
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  
  const otp = generateOTP();
  const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  // Store OTP
  otpStore.set(email, {
    otp: otp,
    expiry: expiryTime,
    attempts: 0,
    createdAt: new Date().toISOString()
  });
  
  console.log(`🔐 OTP generated for ${email}: ${otp} (expires in 10 min)`);
  
  try {
    await sendOTP(email, otp);
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully. Please check your email.' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP. Please try again.' 
    });
  }
};

// Verify OTP endpoint handler
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  
  console.log(`🔐 OTP Verification attempt for: ${email}`);
  
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }
  
  const storedData = otpStore.get(email);
  
  if (!storedData) {
    return res.status(400).json({ success: false, message: 'No OTP found. Please request a new code.' });
  }
  
  if (Date.now() > storedData.expiry) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
  }
  
  if (storedData.attempts >= 5) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new code.' });
  }
  
  if (storedData.otp !== otp) {
    storedData.attempts++;
    otpStore.set(email, storedData);
    console.log(`❌ Invalid OTP for ${email}. Attempts: ${storedData.attempts}/5`);
    return res.status(400).json({ 
      success: false, 
      message: `Invalid OTP. ${5 - storedData.attempts} attempts remaining.` 
    });
  }
  
  // OTP verified successfully
  otpStore.delete(email);
  console.log(`✅ Email verified successfully: ${email}`);
  
  res.json({ success: true, message: 'Email verified successfully!' });
};

// Get OTP status (for debugging)
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
    expiresInSeconds: timeLeft,
    expiresInMinutes: Math.floor(timeLeft / 60)
  });
};

module.exports = { requestOTP, verifyOTP, getOTPStatus };