import express from 'express';
import { registerUser, loginUser, refreshToken, logoutUser } from '../controllers/authController.js';
import { sendTestEmail } from '../utils/mailer.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginUser);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public (needs valid refresh cookie)
router.post('/refresh', refreshToken);

// @route   POST /api/auth/logout
// @desc    Logout user and clear cookie
// @access  Public
router.post('/logout', logoutUser);

// @route   GET /api/auth/test-email
// @desc    Test Gmail credentials — sends a test email to EMAIL_USER
// @access  Public (only for debugging, remove in production)
router.get('/test-email', async (req, res) => {
  try {
    await sendTestEmail();
    res.json({ message: `✅ Test email sent successfully to ${process.env.EMAIL_USER}. Check your inbox!` });
  } catch (err) {
    res.status(500).json({ message: `❌ Email failed: ${err.message}` });
  }
});

export default router;

