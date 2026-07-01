import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { SecurityState } from '../models/SecurityState.js';

export const checkSecurityPenalty = async (req, res, next) => {
  // If public route or callback, bypass check
  if (req.path && req.path.includes('/youtube/callback')) {
    return next();
  }

  let user = req.user;

  if (!user) {
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
        user = await User.findById(decoded.id).select('-password');
      } catch (error) {
        // If token fails, let the route's own protect middleware handle unauthorized errors
      }
    }
  }

  if (!user) {
    return next();
  }

  // Only apply checks to students
  if (user.role !== 'student') {
    return next();
  }

  try {
    const state = await SecurityState.findOne({ userId: user._id });
    if (state) {
      if (state.accountLocked) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_LOCKED",
          logout: true,
          redirect: "/security-lock",
          reason: "security_violation",
          message: 'Account is locked due to security violations. Please contact your administrator.',
          accountLocked: true,
          violationCount: state.violationCount
        });
      }

      if (state.penaltyUntil && state.penaltyUntil > new Date()) {
        const remainingSeconds = Math.max(0, Math.ceil((new Date(state.penaltyUntil).getTime() - Date.now()) / 1000));
        return res.status(403).json({
          message: 'Access suspended due to active security penalty.',
          penaltyActive: true,
          penaltyUntil: state.penaltyUntil,
          remainingSeconds,
          violationCount: state.violationCount
        });
      }
    }
    next();
  } catch (error) {
    console.error('[SECURITY CHECK MIDDLEWARE ERROR]', error);
    next();
  }
};
