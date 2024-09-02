const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/UserModel');

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
  
    try {
      const user = await User.findOne({ email });
      console.log(user, "user")
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const token = crypto.randomBytes(20).toString('hex');
      const expirationTime = Date.now() + 3600000; // 1 hour
  
      user.resetPasswordToken = token;
      user.resetPasswordExpires = expirationTime;
      await user.save();
  
      const resetLink = `${process.env.FRONTEND_URL}/resetpassword?token=${token}`;
      console.log(resetLink)
      
      try {
        await sendResetEmail(email, resetLink);
        res.json({ message: 'Password reset link sent to your email' });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        res.status(500).json({ message: 'Failed to send reset email', error: emailError.toString() });
      }
    } catch (error) {
      console.error('Detailed error in forgot-password route:', error);
      res.status(500).json({ message: 'An error occurred', error: error.toString() });
    }
  };

async function sendResetEmail(email, resetLink) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    html: `
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `
  };
  await transporter.sendMail(mailOptions);
}