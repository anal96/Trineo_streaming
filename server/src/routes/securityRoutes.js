import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { SecuritySession } from '../models/SecuritySession.js';

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

    if (eventType === 'screenshot') {
      const screenshotCount = await SecurityEvent.countDocuments({
        studentId: req.user._id,
        eventType: 'screenshot'
      });

      if (screenshotCount === 0) {
        actionTaken = 'warning_shown';
        responseAction = 'warning_shown';
        responseMessage = 'This is your first screenshot attempt warning. Further attempts will notify administrator or terminate your session.';
      } else if (screenshotCount === 1) {
        actionTaken = 'alert_logged';
        responseAction = 'alert_logged';
        responseMessage = 'Screenshot attempt logged. Administrator has been notified.';
      } else {
        actionTaken = 'session_terminated';
        responseAction = 'session_terminated';
        responseMessage = 'Your session has been terminated due to multiple security violations.';

        // Terminate current student session & suspend the student
        req.user.activeSessionToken = '';
        req.user.status = 'inactive';
        await req.user.save();

        await SecuritySession.updateMany(
          { userId: req.user._id, status: 'active' },
          { $set: { status: 'terminated' } }
        );
      }
    } else if (eventType === 'screen_recording') {
      actionTaken = 'playback_paused';
      responseAction = 'playback_paused';
      responseMessage = 'Screen recording detected. Playback has been paused.';
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
      institute: req.user.institute || null,
      batchId: finalBatchId,
      batchName,
      subjectId: subjectId || null,
      subjectName,
      topicId: finalTopicId,
      topicTitle,
      eventType,
      details: details || '',
      ipAddress,
      device,
      browser,
      riskLevel,
      actionTaken
    });

    await logEntry.save();
    
    console.warn(`[SECURITY AUDIT] Logged ${eventType} for student ${req.user.name} (${req.user.email}). Action: ${actionTaken}`);
    
    return res.status(201).json({
      success: true,
      action: responseAction,
      message: responseMessage
    });
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

export default router;
