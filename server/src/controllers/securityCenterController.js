import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { SecuritySession } from '../models/SecuritySession.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { SecurityState } from '../models/SecurityState.js';
import { Enrollment } from '../models/Enrollment.js';

const parseAgent = (ua = '') => {
  const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
  const device = ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iPhone' : ua.includes('Mac') ? 'Mac' : ua.includes('Windows') ? 'Windows' : 'Device';
  return { browser, device };
};

const instituteFilter = (req) => (req.user.role === 'owner' ? {} : { institute: req.user.institute });

export const getSecurityCenterOverview = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const filter = instituteFilter(req);
    const activeSessions = await SecuritySession.countDocuments({ ...filter, status: 'active' });
    const activeDevicesAgg = await SecuritySession.aggregate([
      { $match: { ...filter, status: 'active' } },
      { $group: { _id: '$device' } },
      { $count: 'count' }
    ]);
    
    const screenshotAttempts = await SecurityEvent.countDocuments({ ...filter, eventType: 'screenshot' });
    const recordingAttempts = await SecurityEvent.countDocuments({ ...filter, eventType: 'screen_recording' });
    const concurrentAttempts = await SecurityEvent.countDocuments({ ...filter, eventType: { $in: ['multiple_device_login', 'concurrent_session_violation'] } });
    const accountSharingAlerts = await SecurityEvent.countDocuments({ ...filter, eventType: 'account_sharing' });
    const downloadAttempts = await SecurityEvent.countDocuments({ ...filter, eventType: 'download_attempt' });
    const piracyEvents = await SecurityEvent.countDocuments({ ...filter, eventType: { $in: ['screenshot', 'screen_recording', 'session_hijack'] } });

    res.json({
      cards: {
        activeSessions,
        activeDevices: activeDevicesAgg[0]?.count || 0,
        screenshotAttempts,
        recordingAttempts,
        concurrentAttempts,
        accountSharingAlerts,
        downloadAttempts,
        piracyEvents
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSecuritySessions = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const sessions = await SecuritySession.find({ ...instituteFilter(req) }).populate('userId', 'name email status user_id branchName').sort({ lastSeenAt: -1 }).limit(500);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSecurityEvents = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const events = await SecurityEvent.find({ ...instituteFilter(req) })
      .populate('studentId', 'name email status user_id branchName enrollmentDate')
      .populate('batchId', 'title')
      .populate('subjectId', 'subjectName')
      .populate('topicId', 'title')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upsertSecuritySessionFromRequest = async ({ user, token, userAgent, ipAddress }) => {
  const { browser, device } = parseAgent(userAgent || '');
  const suffix = token ? token.slice(-12) : '';
  const existing = await SecuritySession.findOne({ userId: user._id, tokenSuffix: suffix, status: 'active' });
  if (existing) {
    existing.lastSeenAt = new Date();
    existing.ipAddress = ipAddress || existing.ipAddress;
    existing.browser = browser;
    existing.device = device;
    existing.userAgent = userAgent || existing.userAgent;
    await existing.save();
    return existing;
  }
  return SecuritySession.create({
    institute: user.institute || null,
    userId: user._id,
    tokenSuffix: suffix,
    device,
    browser,
    ipAddress: ipAddress || '',
    userAgent: userAgent || '',
    location: '',
    status: 'active',
    loginAt: new Date(),
    lastSeenAt: new Date()
  });
};

export const forceLogoutSession = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const session = await SecuritySession.findOne({ _id: req.params.sessionId, ...instituteFilter(req) });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    session.status = 'terminated';
    await session.save();
    const student = await User.findById(session.userId);
    if (student) {
      student.activeSessionToken = '';
      await student.save();
    }
    res.json({ message: 'Session terminated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const revokeAllSessions = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const { studentId } = req.body;
    const student = await User.findOne({ _id: studentId, ...instituteFilter(req) });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    student.activeSessionToken = '';
    await student.save();
    await SecuritySession.updateMany({ userId: student._id, status: 'active' }, { $set: { status: 'terminated' } });
    res.json({ message: 'All sessions revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setStudentSecurityStatus = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const { studentId, action } = req.body;
    const student = await User.findOne({ _id: studentId, ...instituteFilter(req) });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    if (action === 'disable' || action === 'suspend') {
      student.status = 'inactive';
      student.activeSessionToken = '';
      
      let securityState = await SecurityState.findOne({ userId: student._id });
      if (!securityState) {
        securityState = await SecurityState.create({ userId: student._id });
      }
      securityState.accountLocked = true;
      securityState.lockedAt = new Date();
      securityState.lockedBy = req.user.email || 'admin';
      await securityState.save();
    }
    if (action === 'enable' || action === 'unlock') {
      student.status = 'active';
      student.activeSessionToken = '';
      
      let securityState = await SecurityState.findOne({ userId: student._id });
      if (!securityState) {
        securityState = new SecurityState({ userId: student._id });
      }
      securityState.accountLocked = false;
      securityState.violationCount = 0;
      securityState.forceLogout = false;
      securityState.penaltyUntil = null;
      securityState.unlockReason = req.body.unlockReason || 'Unlocked by admin';
      securityState.lastUnlockAt = new Date();
      securityState.lastUnlockedBy = req.user.email || 'admin';
      await securityState.save();
    }
    if (action === 'resetSessions') {
      student.activeSessionToken = '';
    }
    await student.save();
    
    if (action === 'disable' || action === 'suspend' || action === 'resetSessions' || action === 'enable' || action === 'unlock') {
      await SecuritySession.updateMany({ userId: student._id, status: 'active' }, { $set: { status: 'terminated' } });
    }
    res.json({ message: 'Security action applied', studentId: student._id, status: student.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const ignoreSecurityEvent = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const event = await SecurityEvent.findOne({ _id: req.params.eventId, ...instituteFilter(req) });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    event.status = 'ignored';
    await event.save();
    res.json({ message: 'Event ignored successfully', eventId: event._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resolveSecurityEvent = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const event = await SecurityEvent.findOne({ _id: req.params.eventId, ...instituteFilter(req) });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    event.status = 'resolved';
    await event.save();
    res.json({ message: 'Event resolved successfully', eventId: event._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentSecurityState = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, ...instituteFilter(req) });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    let securityState = await SecurityState.findOne({ userId: studentId });
    if (!securityState) {
      securityState = await SecurityState.create({
        userId: studentId,
        violationCount: 0,
        penaltyUntil: null,
        forceLogout: false,
        accountLocked: false
      });
    }

    // Fetch the student's enrolled program (batch) name
    const enrollment = await Enrollment.findOne({ studentId: student._id, status: 'active' })
      .populate('programId', 'title');
    const batchName = enrollment?.programId?.title || null;

    res.json({
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        status: student.status,
        user_id: student.user_id,
        batchName,
        enrollmentDate: student.enrollmentDate
      },
      securityState
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
