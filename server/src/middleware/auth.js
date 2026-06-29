import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { SecuritySession } from '../models/SecuritySession.js';

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

      // Enforce path restrictions for playback / download tokens (restrict to download and stream routes only)
      if (decoded.isPlaybackToken) {
        const isAllowedPath = 
          req.originalUrl.includes('/download') || 
          req.path.includes('/download') ||
          req.originalUrl.includes('/stream') ||
          req.path.includes('/stream');
          
        if (!isAllowedPath) {
          return res.status(403).json({ 
            message: 'Forbidden: Playback token is only valid for media streaming and downloads.' 
          });
        }
      }

      // Find user
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(403).json({ message: 'User account is deactivated' });
      }

      // Check if password change is forced
      if (user.mustChangePassword === true) {
        const allowedPaths = ['/password/change', '/profile', '/session', '/logout'];
        const isAllowed = allowedPaths.some(p => req.originalUrl.endsWith(p) || req.path.endsWith(p));
        if (!isAllowed) {
          return res.status(403).json({
            message: 'Password change required',
            mustChangePassword: true
          });
        }
      }

      // Playback token check: if it is a playback token, validate it and allow immediate access if sessionToken matches activeSessionToken
      if (decoded.isPlaybackToken) {
        if (!user.activeSessionToken || user.activeSessionToken !== decoded.sessionToken) {
          return res.status(401).json({
            message: 'Session expired. Logged in from another device.',
            oneDeviceViolation: true
          });
        }

        req.user = user;
        req.token = token;
        return next();
      }

      // One-device login check: check if token matches the active session token in DB (applies to student, admin, owner)
      if (!user.activeSessionToken || user.activeSessionToken !== token) {
        // Check if the request is originating from the same device (same User-Agent as the active session)
        const userAgent = req.headers['user-agent'] || 'Unknown Browser';
        let isSameDevice = false;

        if (mongoose.connection && mongoose.connection.readyState === 1) {
          const activeSession = await SecuritySession.findOne({
            userId: user._id,
            tokenSuffix: user.activeSessionToken ? user.activeSessionToken.slice(-12) : '',
            status: 'active'
          });
          isSameDevice = activeSession && activeSession.userAgent === userAgent;
        }

        if (!isSameDevice) {
          return res.status(401).json({
            message: 'Session expired. Logged in from another device.',
            oneDeviceViolation: true
          });
        }
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

