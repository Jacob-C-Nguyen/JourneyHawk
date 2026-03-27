const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (toEmail, otp) => {
  await resend.emails.send({
    from: 'JourneyHawk <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Verify your JourneyHawk account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">JourneyHawk</h2>
        <p>Thanks for signing up! Use the code below to verify your email address.</p>
        <div style="background: #F1F5F9; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0F172A;">${otp}</span>
        </div>
        <p style="color: #64748B; font-size: 14px;">This code expires in 10 minutes. If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOTPEmail };
