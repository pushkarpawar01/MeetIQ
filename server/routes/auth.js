import express from 'express';
import { registerUser, loginUser, refreshToken, logoutUser } from '../controllers/authController.js';

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

export default router;
