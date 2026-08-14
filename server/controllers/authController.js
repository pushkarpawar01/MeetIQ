import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateTokens = (userId) => {
  const payload = { user: { id: userId } };
  
  // Access Token (short-lived)
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'supersecretjwtkey',
    { expiresIn: '15m' }
  );

  // Refresh Token (long-lived)
  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey',
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

const setTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    user = new User({ name, email, passwordHash });
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user.id);
    setTokenCookie(res, refreshToken);

    res.json({ token: accessToken, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

    const { accessToken, refreshToken } = generateTokens(user.id);
    setTokenCookie(res, refreshToken);

    res.json({ token: accessToken, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token provided' });

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey');
    
    // Check if user still exists
    const user = await User.findById(decoded.user.id);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
    setTokenCookie(res, newRefreshToken);

    res.json({ token: accessToken });
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
};
