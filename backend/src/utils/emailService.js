const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendOTPEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"JourneyHawk" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Verify your JourneyHawk account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0F172A; border-radius: 16px;">
        <h2 style="color: #FFFFFF; text-align: center; margin-bottom: 8px;">JourneyHawk</h2>
        <p style="color: #94A3B8; text-align: center; margin-bottom: 32px;">Email Verification</p>
        <p style="color: #CBD5E1; margin-bottom: 16px;">Enter this code to verify your email address. It expires in 10 minutes.</p>
        <div style="background: #1E293B; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #334155;">
          <span style="font-size: 40px; font-weight: 800; color: #3B82F6; letter-spacing: 12px;">${otp}</span>
        </div>
        <p style="color: #475569; font-size: 13px; text-align: center;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOTPEmail };
