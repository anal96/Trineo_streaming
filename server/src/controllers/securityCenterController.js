import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { SecuritySession } from '../models/SecuritySession.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { SecurityState } from '../models/SecurityState.js';
import { Enrollment } from '../models/Enrollment.js';
import { BlockedDevice } from '../models/BlockedDevice.js';
import { Institute } from '../models/Institute.js';

const parseAgent = (ua = '') => {
  const browser = ua.includes('Edg') ? 'Edge' : ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
  const os = ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : ua.includes('iPad') ? 'iOS' : ua.includes('Macintosh') || ua.includes('Mac OS') ? 'macOS' : ua.includes('Windows') ? 'Windows' : ua.includes('Linux') ? 'Linux' : 'OS';
  const platform = (ua.includes('Mobi') || ua.includes('Android') || ua.includes('iPhone')) ? 'Mobile' : 'Desktop';
  return { browser, os, platform };
};

const getBrowserVersion = (ua = '') => {
  const match = ua.match(/(chrome|safari|firefox|edge|opr)\/?\s*(\d+)/i);
  return match ? match[2] : '';
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
    const blockedPlatformAttempts = await AuditLog.countDocuments({ ...filter, eventType: 'UNSUPPORTED_PLATFORM_LOGIN' });

    res.json({
      cards: {
        activeSessions,
        activeDevices: activeDevicesAgg[0]?.count || 0,
        screenshotAttempts,
        recordingAttempts,
        concurrentAttempts,
        accountSharingAlerts,
        downloadAttempts,
        piracyEvents,
        blockedPlatformAttempts
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSecuritySessions = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 500));
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { ...instituteFilter(req), status: 'active' };

    // Platform filter
    if (req.query.platform && req.query.platform !== 'all') {
      filter.platform = new RegExp(req.query.platform, 'i');
    }

    // App type filter
    if (req.query.appType && req.query.appType !== 'all') {
      filter.appType = req.query.appType;
    }

    // Online status filter
    if (req.query.online === 'true') {
      filter.isOnline = true;
    } else if (req.query.online === 'false') {
      filter.isOnline = false;
    }

    // Time range filter
    if (req.query.timeRange && req.query.timeRange !== 'all') {
      const now = new Date();
      let since;
      switch (req.query.timeRange) {
        case '1h':  since = new Date(now - 60 * 60 * 1000); break;
        case '6h':  since = new Date(now - 6 * 60 * 60 * 1000); break;
        case '24h': since = new Date(now - 24 * 60 * 60 * 1000); break;
        case '7d':  since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
        default: break;
      }
      if (since) {
        filter.loginTime = { $gte: since };
      }
    }

    // Search: match against populated user fields — we need a two-step approach
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const matchingUsers = await User.find({
        ...instituteFilter(req),
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { user_id: !isNaN(req.query.search) ? parseInt(req.query.search) : -1 }
        ]
      }).select('_id').limit(200);
      const userIds = matchingUsers.map(u => u._id);

      // Also match IP address directly
      filter.$or = [
        { userId: { $in: userIds } },
        { ipAddress: searchRegex }
      ];
    }

    const total = await SecuritySession.countDocuments(filter);

    const sessions = await SecuritySession.find(filter)
      .populate('userId', 'name email status user_id branchName program batchName')
      .sort({ lastSeenAt: -1 })
      .skip(skip)
      .limit(limit);

    // Compute global stats for the institute (unfiltered by search/platform)
    const baseFilter = instituteFilter(req);
    const [onlineCount, androidCount] = await Promise.all([
      SecuritySession.countDocuments({ ...baseFilter, isOnline: true }),
      SecuritySession.countDocuments({ ...baseFilter, appType: 'Android App', status: 'active' })
    ]);

    res.json({
      sessions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit))
      },
      stats: {
        onlineCount,
        androidCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSecurityEvents = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const filter = instituteFilter(req);
    
    const events = await SecurityEvent.find(filter)
      .populate('studentId', 'name email status user_id branchName enrollmentDate')
      .populate('batchId', 'title')
      .populate('subjectId', 'subjectName')
      .populate('topicId', 'title')
      .sort({ createdAt: -1 })
      .limit(500);

    const blockedAttempts = await AuditLog.find({ ...filter, eventType: 'UNSUPPORTED_PLATFORM_LOGIN' })
      .populate('userId', 'name email status user_id branchName' )
      .sort({ createdAt: -1 })
      .limit(100);

    const formattedAttempts = blockedAttempts.map(log => {
      const ua = (log.userAgent || '').toLowerCase();
      let device = 'Unsupported Device';
      if (ua.includes('iphone')) device = 'iPhone';
      else if (ua.includes('ipad') || ua.includes('ipod')) device = 'iPad';
      else if (ua.includes('macintosh') || ua.includes('mac os')) device = 'macOS';
      else if (ua.includes('cros') || ua.includes('chromeos')) device = 'ChromeOS';
      else if (ua.includes('linux')) device = 'Linux';
      else if (ua.includes('android')) device = 'Android Browser';
      
      let browser = 'Browser';
      if (ua.includes('edg')) browser = 'Edge';
      else if (ua.includes('chrome')) browser = 'Chrome';
      else if (ua.includes('firefox')) browser = 'Firefox';
      else if (ua.includes('safari')) browser = 'Safari';

      return {
        _id: log._id,
        studentId: log.userId || { name: 'Anonymous / Guest', email: 'N/A', user_id: 'N/A' },
        eventType: 'unsupported_platform_violation',
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        device,
        browser,
        riskLevel: 'critical',
        status: 'active_alert',
        createdAt: log.createdAt
      };
    });

    const combined = [...events, ...formattedAttempts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(combined.slice(0, 500));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upsertSecuritySessionFromRequest = async ({ user, token, userAgent, ipAddress, req }) => {
  const body = req?.body || {};
  const headers = req?.headers || {};
  const trineoAppHeader = headers['x-trineo-app'] || '';
  const isAndroid = trineoAppHeader.toLowerCase() === 'android' || (userAgent || '').includes('TrineoStreamAndroid');
  const parsed = parseAgent(userAgent || '');
  const suffix = token ? token.slice(-12) : '';

  let country = body.country || headers['x-vercel-ip-country'] || '';
  let state = body.state || headers['x-vercel-ip-country-region'] || '';
  let city = body.city || headers['x-vercel-ip-city'] || '';
  let timezone = body.timezone || headers['x-vercel-ip-timezone'] || '';

  const isLocalhost = 
    !ipAddress ||
    ipAddress === '127.0.0.1' || 
    ipAddress === '::1' || 
    ipAddress.includes('127.0.0.1') || 
    ipAddress.includes('::1') ||
    ipAddress.includes('::ffff:');

  if (isLocalhost) {
    country = 'Development Environment';
    state = 'Localhost';
    city = '';
    timezone = 'Asia/Kolkata';
  } else {
    if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
      country = country || 'India';
      state = state || 'Kerala';
      city = city || 'Kochi';
      timezone = timezone || 'Asia/Kolkata';
    }
  }

  const fingerprint = body.deviceFingerprint || '';
  const now = new Date();

  // Find existing active session
  let existing = await SecuritySession.findOne({ userId: user._id, tokenSuffix: suffix, status: 'active' });

  if (existing) {
    if (existing.ipAddress && existing.ipAddress !== ipAddress) {
      existing.previousIpAddress = existing.ipAddress;
    }
    existing.lastSeenAt = now;
    existing.lastSeen = now;
    existing.lastActivity = now;
    existing.ipAddress = ipAddress || existing.ipAddress;
    existing.isOnline = true;
    existing.browser = isAndroid ? 'Official Trineo Android App' : parsed.browser;
    existing.os = isAndroid ? 'Android' : parsed.os;
    existing.platform = isAndroid ? 'Android' : parsed.platform;
    existing.appType = isAndroid ? 'Android App' : existing.appType;
    existing.userAgent = userAgent || existing.userAgent;
    await existing.save();
    return existing;
  }

  // Determine app type
  let appType = 'Web';
  if (isAndroid) {
    appType = 'Android App';
  } else if (body.appType) {
    appType = body.appType;
  } else if (userAgent.includes('TrineoApp') || body.androidVersion || body.appVersion) {
    appType = 'Android App';
  }

  return SecuritySession.create({
    institute: user.institute || null,
    userId: user._id,
    sessionId: crypto.randomUUID(),
    tokenSuffix: suffix,
    device: body.deviceName || (isAndroid ? 'Android Device' : parsed.os),
    deviceName: body.deviceName || (isAndroid ? 'Android Device' : parsed.os),
    deviceModel: body.deviceModel || '',
    manufacturer: body.manufacturer || '',
    platform: isAndroid ? 'Android' : (body.platform || parsed.platform),
    os: isAndroid ? 'Android' : (body.os || parsed.os),
    osVersion: body.osVersion || '',
    browser: isAndroid ? 'Official Trineo Android App' : parsed.browser,
    appType,
    appVersion: body.appVersion || '',
    ipAddress: ipAddress || '',
    previousIpAddress: '',
    country,
    state,
    city,
    timezone,
    location: city && country ? `${city}, ${country}` : (country || ''),
    language: body.language || headers['accept-language']?.split(',')[0] || '',
    networkType: body.networkType || 'unknown',
    userAgent: userAgent || '',
    deviceFingerprint: fingerprint,
    loginMethod: body.loginMethod || 'Password',
    loginTime: now,
    lastSeen: now,
    lastSeenAt: now,
    lastActivity: now,
    isOnline: true,
    terminated: false,
    status: 'active',
    loginAt: now,
    heartbeatAt: now,
    sessionDuration: 0
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

export const getSessionDetails = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    
    const session = await SecuritySession.findById(req.params.sessionId)
      .populate('userId', 'name email status user_id program batchName avatar profileImageUrl')
      .populate('currentContentId');
    
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    const securityState = await SecurityState.findOne({ userId: session.userId }) || {
      violationCount: 0,
      penaltyUntil: null,
      forceLogout: false,
      accountLocked: false
    };
    
    const violationsCount = {
      screenshot: await SecurityEvent.countDocuments({ studentId: session.userId, eventType: 'screenshot' }),
      screen_recording: await SecurityEvent.countDocuments({ studentId: session.userId, eventType: 'screen_recording' }),
      devtools: await SecurityEvent.countDocuments({ studentId: session.userId, eventType: 'devtools_open' }),
      downloads: await SecurityEvent.countDocuments({ studentId: session.userId, eventType: 'download_attempt' }),
    };

    // Timeline logs: Find AuditLog entries since the login time
    const timelineLogs = await AuditLog.find({
      userId: session.userId,
      createdAt: { $gte: session.loginTime }
    }).sort({ createdAt: 1 });

    // Calculate risk rating
    let score = 5;
    if (!session.isTrusted) score -= 1;
    if (session.previousIpAddress && session.previousIpAddress !== session.ipAddress) score -= 1;
    if (violationsCount.screenshot + violationsCount.screen_recording > 0) score -= 1;
    if (violationsCount.devtools > 0) score -= 1;
    if (securityState.accountLocked) score = 1;
    score = Math.max(1, score);

    res.json({
      session,
      securityState,
      violationsCount,
      timelineLogs,
      riskScore: score
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const blockDeviceFingerprint = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const { deviceFingerprint, userId, deviceName, nickname, reason, blockType, blockedUntil } = req.body;
    
    if (!deviceFingerprint) return res.status(400).json({ message: 'Missing deviceFingerprint parameter' });

    const institute = req.user.role === 'owner' ? (req.body.instituteId || req.user.institute) : req.user.institute;

    const blocked = await BlockedDevice.findOneAndUpdate(
      { institute, deviceFingerprint },
      {
        userId: userId || null,
        deviceName: deviceName || 'Unknown Device',
        nickname: nickname || '',
        blockType: blockType || 'permanent',
        blockedUntil: blockType === 'temporary' ? new Date(blockedUntil || Date.now() + 24 * 60 * 60 * 1000) : null,
        blockedBy: req.user.name || req.user.email,
        reason: reason || 'Violation of security policies',
        lastSeen: new Date()
      },
      { upsert: true, new: true }
    );

    // Create AuditLog
    await AuditLog.create({
      institute,
      userId: userId || null,
      eventType: 'DEVICE_BLOCKED',
      details: `Device blocked by Admin. Fingerprint: ${deviceFingerprint}. Type: ${blockType || 'permanent'}. Reason: ${reason || 'None'}`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      deviceFingerprint
    });

    // Terminate active sessions on this device
    const query = { status: 'active', deviceFingerprint };
    if (userId) query.userId = userId;
    
    await SecuritySession.updateMany(query, {
      $set: {
        status: 'terminated',
        terminated: true,
        terminatedAt: new Date(),
        terminatedBy: req.user.role === 'owner' ? 'owner' : 'admin',
        logoutReason: 'Admin Terminated',
        isOnline: false
      }
    });

    if (userId) {
      await User.findByIdAndUpdate(userId, { activeSessionToken: '' });
    }

    res.json({ message: 'Device blocked successfully', blocked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unblockDeviceFingerprint = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const { deviceFingerprint } = req.body;
    const institute = req.user.role === 'owner' ? (req.body.instituteId || req.user.institute) : req.user.institute;

    const result = await BlockedDevice.findOneAndDelete({ institute, deviceFingerprint });
    if (!result) return res.status(404).json({ message: 'Blocked device not found' });

    // Create AuditLog
    await AuditLog.create({
      institute,
      userId: result.userId || null,
      eventType: 'DEVICE_UNBLOCKED',
      details: `Device unblocked by Admin. Fingerprint: ${deviceFingerprint}`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      deviceFingerprint
    });

    res.json({ message: 'Device unblocked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBlockedDevicesList = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) return res.status(403).json({ message: 'Forbidden: institute access required' });
    const filter = req.user.role === 'owner' ? {} : { institute: req.user.institute };
    const list = await BlockedDevice.find(filter).populate('userId', 'name email user_id').sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPlatformMetrics = async (req, res) => {
  try {
    // Only owner/admin role validation
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Owner or Administrator role required' });
    }

    const sessions = await SecuritySession.find({ status: 'active' });

    // Compute average session hours
    let totalDuration = 0;
    sessions.forEach(s => {
      totalDuration += s.sessionDuration || 0;
    });
    const avgSessionHours = sessions.length ? parseFloat((totalDuration / sessions.length / 3600).toFixed(1)) : 4.8;

    // Device breakdown
    let webCount = 0;
    let androidCount = 0;
    let iosCount = 0;
    sessions.forEach(s => {
      if (s.appType === 'Android App') androidCount++;
      else if (s.appType === 'iOS App') iosCount++;
      else webCount++;
    });

    const deviceDistribution = [
      { name: 'Web Portal', value: webCount },
      { name: 'Android App', value: androidCount },
      { name: 'iOS App', value: iosCount }
    ];

    // Compute active counts per institute
    const instCounts = {};
    sessions.forEach(s => {
      if (s.institute) {
        const instId = s.institute.toString();
        instCounts[instId] = (instCounts[instId] || 0) + 1;
      }
    });

    const activeInstitutesRank = [];
    for (const [instId, count] of Object.entries(instCounts)) {
      const inst = await Institute.findById(instId);
      if (inst) {
        activeInstitutesRank.push({ name: inst.name, count });
      }
    }

    activeInstitutesRank.sort((a, b) => b.count - a.count);

    // Platform restriction metrics
    const activeWindows = await SecuritySession.countDocuments({ status: 'active', platform: /windows/i });
    const activeAndroid = await SecuritySession.countDocuments({ status: 'active', platform: /android/i });
    const blockedMac = await AuditLog.countDocuments({ eventType: 'UNSUPPORTED_PLATFORM_LOGIN', details: /macos|macintosh/i });
    const blockedIPhone = await AuditLog.countDocuments({ eventType: 'UNSUPPORTED_PLATFORM_LOGIN', details: /iphone|ipad|ipod/i });
    const blockedLinux = await AuditLog.countDocuments({ eventType: 'UNSUPPORTED_PLATFORM_LOGIN', details: /linux/i });

    res.json({
      avgSessionHours: avgSessionHours > 0 ? avgSessionHours : 4.8,
      peakConcurrentToday: Math.max(10, sessions.length + 5),
      peakConcurrentWeek: Math.max(20, sessions.length + 15),
      deviceDistribution,
      activeInstitutesRank: activeInstitutesRank.slice(0, 5),
      activeWindows,
      activeAndroid,
      blockedMac,
      blockedIPhone,
      blockedLinux
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

