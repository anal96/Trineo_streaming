import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { SecuritySession } from '../models/SecuritySession.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { SecurityState } from '../models/SecurityState.js';

const router = express.Router();

const parseAgent = (ua = '') => {
  const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
  const device = ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iPhone' : ua.includes('Mac') ? 'Mac' : ua.includes('Windows') ? 'Windows' : 'Device';
  return { browser, device };
};

// POST /api/security/audit - Log a security exception/anomaly
router.post('/audit', protect, async (req, res) => {
  try {
    const { eventType, details, batchId, courseId, subjectId, topicId, lessonId } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ message: 'Missing eventType parameter' });
    }

    const finalBatchId = batchId || courseId || null;
    const finalTopicId = topicId || lessonId || null;

    const userAgent = req.headers['user-agent'] || '';
    const { browser, device } = parseAgent(userAgent);
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipAddress = rawIp === '::1' ? '127.0.0.1' : rawIp;

    let actionTaken = 'alert_logged';
    let responseAction = 'none';
    let responseMessage = 'Security audit logged successfully';
    let state = null;

    if (eventType === 'screenshot' || eventType === 'screen_recording') {
      state = await SecurityState.findOne({ userId: req.user._id });
      if (!state) {
        state = await SecurityState.create({ userId: req.user._id });
      }

      // SERVER-SIDE DEBOUNCE: reject duplicate reports within 5 seconds
      const now = new Date();
      if (state.lastViolationAt && (now.getTime() - new Date(state.lastViolationAt).getTime()) < 5000) {
        console.log(`[SECURITY] Debounce: Duplicate violation report from user ${req.user.email} within 5s, skipping increment.`);
        // Return current penalty state without incrementing
        return res.json({
          success: true,
          action: state.penaltyUntil && new Date(state.penaltyUntil) > now ? 'warning_shown' : 'alert_logged',
          message: 'Duplicate violation report ignored (debounced).',
          penaltyUntil: state.penaltyUntil,
          serverTime: now.toISOString(),
          violationCount: state.violationCount,
        });
      }

      state.violationCount += 1;
      state.lastViolationType = eventType;
      state.lastViolationAt = now;
      
      const attemptIndex = state.violationCount;
      const label = eventType === 'screenshot' ? 'Screenshot' : 'Screen recording';

      if (attemptIndex === 1) {
        state.penaltyUntil = new Date(Date.now() + 60000); // 60 seconds
        actionTaken = 'warning_shown';
        responseAction = 'warning_shown';
        responseMessage = `${label} detected. Playback suspended for 60 seconds.`;
        
        // Create student notification
        await Notification.create({
          institute: req.user.institute || null,
          userId: req.user._id,
          targetType: 'user',
          message: `${label} detected. Playback suspended for 60 seconds.`,
          type: 'system',
          read: false
        });
      } else if (attemptIndex === 2) {
        state.penaltyUntil = new Date(Date.now() + 60000); // 60 seconds
        actionTaken = 'warning_shown';
        responseAction = 'warning_shown_level2';
        responseMessage = 'Repeated violation detected. Playback suspended for 60 seconds.';
        
        // Create student notification
        await Notification.create({
          institute: req.user.institute || null,
          userId: req.user._id,
          targetType: 'user',
          message: 'Repeated violation detected. Playback suspended for 60 seconds.',
          type: 'system',
          read: false
        });
      } else if (attemptIndex === 3) {
        state.penaltyUntil = null; // Terminated, no temporary penalty active
        state.forceLogout = true;
        actionTaken = 'session_terminated';
        responseAction = 'session_terminated';
        responseMessage = 'Account security violation threshold exceeded. Session terminated.';

        // Create student notification
        await Notification.create({
          institute: req.user.institute || null,
          userId: req.user._id,
          targetType: 'user',
          message: 'Account security violation threshold exceeded. Session terminated.',
          type: 'system',
          read: false
        });

        // Notify admins
        const admins = await User.find({ role: 'admin', institute: req.user.institute });
        const adminInserts = admins.map(admin => ({
          institute: req.user.institute || null,
          userId: admin._id,
          targetType: 'user',
          message: `🚨 Security Violation: Student ${req.user.name} force logged out. ${label} Attempt (Attempt 3). Status: Force Logged Out.`,
          type: 'system',
          read: false
        }));
        if (adminInserts.length) {
          await Notification.insertMany(adminInserts);
        }

        // Terminate current student session (logout) but leave account active so they can log back in
        req.user.activeSessionToken = '';
        await req.user.save();

        await SecuritySession.updateMany(
          { userId: req.user._id, status: 'active' },
          { $set: { status: 'terminated' } }
        );

        res.clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/'
        });
      } else {
        // Attempt 4+ -> Permanent lock
        state.penaltyUntil = null;
        state.accountLocked = true;
        state.lockedAt = new Date();
        state.lockedBy = 'system';
        actionTaken = 'student_suspended';
        responseAction = 'account_locked';
        responseMessage = 'Account security violation threshold exceeded. Account locked permanently.';

        // Create student notification
        await Notification.create({
          institute: req.user.institute || null,
          userId: req.user._id,
          targetType: 'user',
          message: 'Account security violation threshold exceeded. Account locked permanently.',
          type: 'system',
          read: false
        });

        // Notify admins
        const admins = await User.find({ role: 'admin', institute: req.user.institute });
        const adminInserts = admins.map(admin => ({
          institute: req.user.institute || null,
          userId: admin._id,
          targetType: 'user',
          message: `🚨 Critical Violation: Student ${req.user.name} account locked. ${label} Attempt (Attempt ${attemptIndex}). Status: Account Locked.`,
          type: 'system',
          read: false
        }));
        if (adminInserts.length) {
          await Notification.insertMany(adminInserts);
        }

        // Suspend student account permanently
        req.user.activeSessionToken = '';
        req.user.status = 'inactive';
        await req.user.save();

        await SecuritySession.updateMany(
          { userId: req.user._id, status: 'active' },
          { $set: { status: 'terminated' } }
        );
      }

      await state.save();
    } else if (eventType === 'download_attempt') {
      actionTaken = 'alert_logged';
    }

    // Look up and snaphot names to avoid data loss on entity renaming/deletion
    let batchName = '';
    let subjectName = '';
    let topicTitle = '';

    if (finalBatchId) {
      const course = await mongoose.model('Course').findById(finalBatchId);
      if (course) batchName = course.title;
    }
    if (subjectId) {
      const subject = await mongoose.model('Subject').findById(subjectId);
      if (subject) subjectName = subject.subjectName;
    }
    if (finalTopicId) {
      const lesson = await mongoose.model('Lesson').findById(finalTopicId);
      if (lesson) topicTitle = lesson.title;
    }

    // Map riskLevel based on eventType
    let riskLevel = 'low';
    if (eventType === 'screenshot') riskLevel = 'medium';
    else if (eventType === 'screen_recording') riskLevel = 'high';
    else if (eventType === 'concurrent_session_violation' || eventType === 'multiple_device_login') riskLevel = 'medium';
    else if (eventType === 'account_sharing') riskLevel = 'high';
    else if (eventType === 'session_hijack') riskLevel = 'critical';
    else if (eventType === 'unauthorized_content_access') riskLevel = 'high';

    const logEntry = new SecurityEvent({
      studentId: req.user._id,
      userId: req.user._id, // Explicit userId field
      institute: req.user.institute || null,
      batchId: finalBatchId,
      courseId: finalBatchId, // Explicit courseId field
      batchName,
      subjectId: subjectId || null,
      subjectName,
      topicId: finalTopicId,
      lessonId: finalTopicId, // Explicit lessonId field
      topicTitle,
      eventType,
      details: details || '',
      ipAddress,
      device,
      browser,
      riskLevel,
      actionTaken,
      attemptNumber: state ? state.violationCount : 1 // Explicit attemptNumber field
    });

    await logEntry.save();
    
    const penaltyActive = state ? (state.penaltyUntil && state.penaltyUntil > new Date()) : false;
    const remainingSeconds = penaltyActive 
      ? Math.max(0, Math.ceil((new Date(state.penaltyUntil).getTime() - Date.now()) / 1000))
      : 0;

    const responsePayload = {
      success: true,
      action: responseAction,
      message: responseMessage,
      violationCount: state ? state.violationCount : 0,
      penaltyUntil: state ? state.penaltyUntil : null,
      remainingSeconds,
      forceLogout: state ? state.forceLogout : false,
      accountLocked: state ? state.accountLocked : false,
      serverTime: new Date()
    };

    console.log("[SECURITY SERVER POST /audit]", {
      userId: req.user._id,
      eventType,
      penaltyUntil: responsePayload.penaltyUntil,
      remainingSeconds: responsePayload.remainingSeconds,
      serverTime: responsePayload.serverTime
    });

    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error('[SECURITY AUDIT ERROR]', error);
    return res.status(500).json({ message: 'Failed to process security log' });
  }
});

// GET /api/security/audit - Get logs (Admin only)
router.get('/audit', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    const filter = req.user.role === 'owner' ? {} : { institute: req.user.institute };

    const logs = await SecurityEvent.find(filter)
      .populate('studentId', 'name email role')
      .populate('batchId', 'title')
      .populate('subjectId', 'subjectName')
      .populate('topicId', 'title')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

router.get('/status', protect, async (req, res) => {
  try {
    let state = await SecurityState.findOne({ userId: req.user._id });
    if (!state) {
      state = await SecurityState.create({ userId: req.user._id });
    }

    const now = new Date();
    const penaltyActive = state.penaltyUntil && state.penaltyUntil > now;
    const remainingSeconds = penaltyActive 
      ? Math.max(0, Math.ceil((new Date(state.penaltyUntil).getTime() - now.getTime()) / 1000))
      : 0;

    console.log("[SECURITY SERVER GET /status]", {
      userId: req.user._id,
      penaltyActive,
      penaltyUntil: state.penaltyUntil,
      remainingSeconds,
      serverTime: now
    });

    return res.status(200).json({
      violationCount: state.violationCount,
      penaltyActive,
      remainingSeconds,
      penaltyUntil: state.penaltyUntil,
      forceLogout: state.forceLogout,
      accountLocked: state.accountLocked,
      serverTime: now
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch status' });
  }
});

router.post('/heartbeat', protect, async (req, res) => {
  try {
    const { page, contentId, action, network } = req.body;
    const suffix = req.token ? req.token.slice(-12) : '';
    const session = await SecuritySession.findOne({ userId: req.user._id, tokenSuffix: suffix, status: 'active' });
    const now = new Date();
    
    if (session) {
      const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const ipAddress = rawIp === '::1' ? '127.0.0.1' : rawIp;
      if (session.ipAddress && session.ipAddress !== ipAddress) {
        session.previousIpAddress = session.ipAddress;
        session.ipAddress = ipAddress;
      }
      
      session.lastSeen = now;
      session.lastSeenAt = now;
      session.heartbeatAt = now;
      session.isOnline = true;
      session.currentPage = page || session.currentPage || '';
      session.currentAction = action || session.currentAction || '';
      if (contentId) session.currentContentId = contentId;
      if (network) session.networkType = network;
      
      const loginTime = session.loginTime || session.createdAt || now;
      session.sessionDuration = Math.round((now.getTime() - new Date(loginTime).getTime()) / 1000);
      
      await session.save();
      
      const securityState = await SecurityState.findOne({ userId: req.user._id });
      const forceLogout = securityState ? securityState.forceLogout : false;
      const accountLocked = securityState ? securityState.accountLocked : false;
      
      return res.json({
        success: true,
        isOnline: true,
        sessionDuration: session.sessionDuration,
        forceLogout,
        accountLocked
      });
    } else {
      return res.status(404).json({ message: 'Active session not found' });
    }
  } catch (error) {
    console.error('[HEARTBEAT ERROR]', error);
    return res.status(500).json({ message: 'Heartbeat update failed' });
  }
});

export default router;
