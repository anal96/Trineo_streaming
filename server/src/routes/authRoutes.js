import express from 'express';
import rateLimit from 'express-rate-limit';
import { registerUser, loginUser, getUserProfile, heartbeatUser, getSecurityLogs, getActiveSession, logoutUser } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Strict rate limiting for security against brute-force login attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/heartbeat', protect, heartbeatUser);
router.get('/security-logs', protect, getSecurityLogs);
router.get('/session', protect, getActiveSession);
router.post('/logout', logoutUser);

export default router;
