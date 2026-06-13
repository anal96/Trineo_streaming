import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.query && req.query.playbackToken) {
    token = req.query.playbackToken;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'trineo_stream_premium_saas_crm_lms_secret_key_2026_xyz');

      // Find user
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(403).json({ message: 'User account is deactivated' });
      }

      // One-device login check: check if token matches the active session token in DB (applies to student, admin, owner)
      const expectedSessionToken = decoded.isPlaybackToken ? decoded.sessionToken : token;
      if (!user.activeSessionToken || user.activeSessionToken !== expectedSessionToken) {
        return res.status(401).json({
          message: 'Session expired. Logged in from another device.',
          oneDeviceViolation: true
        });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as admin' });
  }
};

export const ownerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    next();
  } else {
    return res.status(403).json({ message: 'Forbidden: Super-admin access only' });
  }
};

