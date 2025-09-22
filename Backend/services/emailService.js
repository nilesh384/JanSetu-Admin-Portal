import nodemailer from 'nodemailer';

// Email service for sending OTP to admins
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // You can change this to your preferred email service
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your app password
      }
    });
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP email to admin
  async sendAdminOTP(email, otp) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'JanSetu Admin Login - OTP Verification',
        html: `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f4f6f9;">
    <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.08);">
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #FF6B35, #F7931E); border-radius: 8px; margin-bottom: 16px;">
          <span style="font-size: 24px; font-weight: bold; color: white;">JanSetu</span>
        </div>
        <div style="height: 2px; background: linear-gradient(90deg, #FF6B35, #F7931E); border-radius: 1px;"></div>
      </div>

      <!-- Header -->
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #111827; font-size: 22px; margin: 0;">JanSetu Admin Portal</h1>
        <p style="color: #6b7280; font-size: 15px; margin: 4px 0 0;">Secure Access Verification</p>
      </div>
      
      <!-- Title -->
      <h2 style="color: #111827; font-size: 18px; margin-bottom: 18px;">One-Time Password (OTP)</h2>
      
      <!-- Message -->
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Hello Admin,<br><br>
        You are attempting to log in to your <strong>JanSetu Admin account</strong>. 
        Please use the OTP below to verify your identity:
      </p>
      
      <!-- OTP Box -->
      <div style="background: #f9fafb; padding: 22px; border-radius: 10px; text-align: center; margin: 28px 0; border: 1px dashed #d1d5db;">
        <span style="font-size: 34px; font-weight: bold; color: #111827; letter-spacing: 10px; font-family: 'Courier New', monospace;">
          ${otp}
        </span>
      </div>
      
      <!-- Security Info -->
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        <strong>Important:</strong><br>
        • This OTP will expire in <strong>10 minutes</strong>.<br>
        • Do not share this OTP with anyone.<br>
        • If this login attempt wasn’t made by you, please ignore this email.
      </p>
      
      <!-- Footer -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 18px; margin-top: 28px;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.4;">
          This is an automated email from <strong>JanSetu Admin Portal</strong>.<br>
          Do not reply to this message.
        </p>
      </div>
    </div>
  </div>
`
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Admin OTP email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending admin OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify email configuration
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready to send emails');
      return true;
    } catch (error) {
      console.error('Email service configuration error:', error);
      return false;
    }
  }
}

export default new EmailService();