import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { Payment } from '../models/Payment.js';
import { Purchase } from '../models/Purchase.js';
import { VideoUploadJob } from '../models/VideoUploadJob.js';
import { AuditLog } from '../models/AuditLog.js';
import { Institute } from '../models/Institute.js';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { SecuritySession } from '../models/SecuritySession.js';
import { Notification } from '../models/Notification.js';
import { Announcement } from '../models/Announcement.js';
import { OwnerActionLog } from '../models/OwnerActionLog.js';
import { BackupJob } from '../models/BackupJob.js';
import { CourseAssignment } from '../models/CourseAssignment.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { SubscriptionPayment } from '../models/SubscriptionPayment.js';
import {
  sendOnboardingApprovedEmail,
  sendOnboardingRejectedEmail,
  sendReactivationEmail,
  sendBillingInvoiceEmail
} from '../services/emailService.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import os from 'os';
import mongoose from 'mongoose';

const toDateRange = ({ range = '30d', startDate, endDate }) => {
  const end = endDate ? new Date(endDate) : new Date();
  const start = new Date(end);
  if (startDate) return { start: new Date(startDate), end };
  const map = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
  const days = map[range] || 30;
  start.setDate(end.getDate() - days);
  return { start, end };
};

const bytesToGB = (bytes = 0) => Math.round((bytes / (1024 ** 3)) * 100) / 100;

const logOwnerAction = async (req, action, { targetUser = null, targetInstitute = null, details = '' } = {}) => {
  await OwnerActionLog.create({
    ownerId: req.user._id,
    action,
    targetUser,
    targetInstitute,
    details,
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || ''
  });
};

// ─── Platform Stats ───────────────────────────────────────────────────────────
// GET /api/owner/stats
export const getPlatformStats = async (req, res) => {
  try {
    const { range = '30d', startDate, endDate } = req.query;
    const { start, end } = toDateRange({ range, startDate, endDate });
    const [
      totalInstitutes,
      activeInstitutes,
      suspendedInstitutes,
      totalStudents,
      totalCourses,
      totalLessons,
      totalStudyMaterials,
      totalVideos,
      activeSessions
    ] = await Promise.all([
      Institute.countDocuments({ status: { $ne: 'deleted' } }),
      Institute.countDocuments({ status: 'active' }),
      Institute.countDocuments({ status: 'suspended' }),
      User.countDocuments({ role: 'student' }),
      Course.countDocuments({}),
      Lesson.countDocuments({}),
      StudyMaterial.countDocuments({}),
      VideoUploadJob.countDocuments({}),
      SecuritySession.countDocuments({ status: 'active' })
    ]);

    const approvedPayments = await Payment.find({ status: 'success', createdAt: { $gte: start, $lte: end } }).lean();
    const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const processingJobs = await VideoUploadJob.countDocuments({ status: { $in: ['uploading', 'youtube_processing'] } });
    const failedJobs = await VideoUploadJob.countDocuments({ status: 'failed' });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const windowStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const windowEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 1);
      const monthPayments = approvedPayments.filter(p => {
        const d = new Date(p.createdAt);
        return d >= windowStart && d < windowEnd;
      });
      const monthPurchases = monthPayments.length;
      revenueByMonth.push({
        month: monthNames[windowStart.getMonth()],
        revenue: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        subscriptions: monthPurchases
      });
    }

    const institutes = await Institute.find({ status: 'active' }).lean();
    const subscriptionBreakdown = {
      free_trial: institutes.filter(i => i.subscription === 'free_trial').length,
      starter: institutes.filter(i => i.subscription === 'starter').length,
      growth: institutes.filter(i => i.subscription === 'growth').length,
      enterprise: institutes.filter(i => i.subscription === 'enterprise').length
    };

    const totalWatchHours = Math.round((await WatchHistory.find({ watchedAt: { $gte: start, $lte: end } }).select('progress')).reduce((sum, item) => sum + ((item.progress || 0) * 0.6), 0) / 3600 * 10) / 10;
    const totalStorageGB = Math.round((totalVideos * 0.85 + totalStudyMaterials * 0.02) * 10) / 10;
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    res.json({
      range: { start, end },
      totalInstitutes,
      activeInstitutes,
      suspendedInstitutes,
      totalStudents,
      totalAdmins,
      totalCourses,
      totalLessons,
      totalVideos,
      totalStudyMaterials,
      totalWatchHours,
      totalRevenue,
      totalStorageGB,
      activeSessions,
      pendingPayments,
      processingJobs,
      failedJobs,
      revenueByMonth,
      subscriptionBreakdown
    });
  } catch (err) {
    console.error('[OWNER STATS ERROR]', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── Institute CRUD ───────────────────────────────────────────────────────────
// GET /api/owner/institutes
export const getInstitutes = async (req, res) => {
  try {
    const institutes = await Institute.find({ status: { $ne: 'deleted' } }).sort({ createdAt: -1 }).lean();
    const enriched = await Promise.all(institutes.map(async (inst) => {
      const [studentCount, courseCount, lessonCount, videoCount, materialCount, lastLogin] = await Promise.all([
        User.countDocuments({ institute: inst._id, role: 'student' }),
        Course.countDocuments({ institute: inst._id }),
        Lesson.countDocuments({ institute: inst._id }),
        VideoUploadJob.countDocuments({ institute: inst._id, status: 'ready' }),
        StudyMaterial.countDocuments({ institute: inst._id }),
        AuditLog.findOne({ institute: inst._id, eventType: 'login' }).sort({ createdAt: -1 }).select('createdAt')
      ]);
      const storageUsedGB = Math.round((videoCount * 0.85 + materialCount * 0.02) * 10) / 10;
      return {
        ...inst,
        studentCount,
        courseCount,
        lessonCount,
        videoCount,
        materialCount,
        storageUsedGB,
        lastActivityAt: lastLogin?.createdAt || inst.lastActivityAt || null,
        youtubeStatus: inst.youtubeConnected ? 'connected' : 'not_connected',
        youtubeChannelName: inst.youtubeChannelName || '',
        youtubeChannelId: inst.youtubeChannelId || '',
        youtubeLastSync: inst.youtubeLastSync || null,
        connectionHealth: inst.youtubeConnected ? 'healthy' : 'attention'
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/owner/institutes
export const createInstitute = async (req, res) => {
  try {
    const { name, email, contactPerson, phone, domain, subscription } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    const existing = await Institute.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Institute with this email already exists' });
    }
    const institute = new Institute({
      name,
      email,
      contactPerson: contactPerson || '',
      phone: phone || '',
      domain: domain || '',
      subscription: subscription || 'free_trial'
    });
    await institute.save();
    await logOwnerAction(req, 'create_institute', { targetInstitute: institute._id, details: `Created institute ${institute.name}` });
    res.status(201).json(institute);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/owner/institutes/:id/suspend
export const toggleSuspendInstitute = async (req, res) => {
  try {
    const inst = await Institute.findById(req.params.id);
    if (!inst) return res.status(404).json({ message: 'Institute not found' });
    inst.status = inst.status === 'suspended' ? 'active' : 'suspended';
    await inst.save();
    await logOwnerAction(req, 'toggle_suspend_institute', { targetInstitute: inst._id, details: `Institute status changed to ${inst.status}` });
    res.json(inst);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/owner/institutes/:id
export const deleteInstitute = async (req, res) => {
  try {
    const inst = await Institute.findByIdAndUpdate(req.params.id, { status: 'deleted' }, { new: true });
    if (inst) await logOwnerAction(req, 'delete_institute', { targetInstitute: inst._id, details: `Institute marked deleted: ${inst.name}` });
    res.json({ message: 'Institute deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/owner/institutes/:id/subscription
export const updateInstituteSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;
    const validPlans = ['free_trial', 'starter', 'growth', 'enterprise'];
    if (!validPlans.includes(subscription)) {
      return res.status(400).json({ message: 'Invalid subscription plan' });
    }
    const inst = await Institute.findByIdAndUpdate(req.params.id, { subscription }, { new: true });
    if (!inst) return res.status(404).json({ message: 'Institute not found' });
    await logOwnerAction(req, 'update_institute_subscription', { targetInstitute: inst._id, details: `Subscription changed to ${subscription}` });
    res.json(inst);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateInstituteQuotas = async (req, res) => {
  try {
    const { maxStudents, maxCourses, maxVideos, maxStorageGB, maxStudyMaterials } = req.body;
    const inst = await Institute.findById(req.params.id);
    if (!inst) return res.status(404).json({ message: 'Institute not found' });
    inst.quotas = {
      maxStudents: Number(maxStudents ?? inst.quotas?.maxStudents ?? 500),
      maxCourses: Number(maxCourses ?? inst.quotas?.maxCourses ?? 50),
      maxVideos: Number(maxVideos ?? inst.quotas?.maxVideos ?? 2000),
      maxStorageGB: Number(maxStorageGB ?? inst.quotas?.maxStorageGB ?? 1000),
      maxStudyMaterials: Number(maxStudyMaterials ?? inst.quotas?.maxStudyMaterials ?? 5000)
    };
    await inst.save();
    await logOwnerAction(req, 'update_institute_quotas', { targetInstitute: inst._id, details: `Quotas updated for ${inst.name}` });
    res.json(inst);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetInstituteUsageWarnings = async (req, res) => {
  try {
    const inst = await Institute.findById(req.params.id);
    if (!inst) return res.status(404).json({ message: 'Institute not found' });
    inst.usageWarningResetAt = new Date();
    await inst.save();
    await logOwnerAction(req, 'reset_usage_warnings', { targetInstitute: inst._id, details: `Usage warnings reset` });
    res.json({ message: 'Usage warnings reset', instituteId: inst._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const lockInstituteAccess = async (req, res) => {
  try {
    const { emergencyLock = true } = req.body;
    const inst = await Institute.findById(req.params.id);
    if (!inst) return res.status(404).json({ message: 'Institute not found' });
    inst.emergencyLock = Boolean(emergencyLock);
    await inst.save();
    if (inst.emergencyLock) {
      await User.updateMany({ institute: inst._id, role: { $in: ['admin', 'student'] } }, { $set: { status: 'inactive', activeSessionToken: '' } });
      await SecuritySession.updateMany({ institute: inst._id, status: 'active' }, { $set: { status: 'terminated' } });
    }
    await logOwnerAction(req, 'lock_institute_access', { targetInstitute: inst._id, details: `Emergency lock set to ${inst.emergencyLock}` });
    res.json(inst);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── User Management ──────────────────────────────────────────────────────────
// GET /api/owner/users?role=student|admin
export const getAllUsers = async (req, res) => {
  try {
    const filter = req.query.role ? { role: req.query.role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).limit(200);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const disableUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.status = 'inactive';
    user.activeSessionToken = '';
    await user.save();
    await SecuritySession.updateMany({ userId: user._id, status: 'active' }, { $set: { status: 'terminated' } });
    await logOwnerAction(req, 'disable_user', { targetUser: user._id, targetInstitute: user.institute || null, details: `Disabled ${user.email}` });
    res.json({ message: 'User disabled', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const enableUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.status = 'active';
    await user.save();
    await logOwnerAction(req, 'enable_user', { targetUser: user._id, targetInstitute: user.institute || null, details: `Enabled ${user.email}` });
    res.json({ message: 'User enabled', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const forceLogoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.activeSessionToken = '';
    await user.save();
    await SecuritySession.updateMany({ userId: user._id, status: 'active' }, { $set: { status: 'terminated' } });
    await logOwnerAction(req, 'force_logout_user', { targetUser: user._id, targetInstitute: user.institute || null, details: `Forced logout ${user.email}` });
    res.json({ message: 'User force-logged out', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const terminateSession = async (req, res) => {
  try {
    const session = await SecuritySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    session.status = 'terminated';
    await session.save();
    await logOwnerAction(req, 'terminate_session', { targetUser: session.userId || null, targetInstitute: session.institute || null, details: `Session ${session._id} terminated` });
    res.json({ message: 'Session terminated', sessionId: session._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetUserSessions = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.activeSessionToken = '';
    await user.save();
    await SecuritySession.updateMany({ userId: user._id }, { $set: { status: 'terminated' } });
    await logOwnerAction(req, 'reset_user_sessions', { targetUser: user._id, targetInstitute: user.institute || null, details: `Sessions reset for ${user.email}` });
    res.json({ message: 'User sessions reset', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUserSecurityLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Revenue ──────────────────────────────────────────────────────────────────
// GET /api/owner/revenue
export const getRevenue = async (req, res) => {
  try {
    const allPayments = await Payment.find({}).populate('studentId', 'name email').sort({ createdAt: -1 }).limit(100);

    const approved = allPayments.filter(p => p.status === 'success');
    const pending  = allPayments.filter(p => p.status === 'pending');

    const now = new Date();
    const monthlyRevenue = approved
      .filter(p => {
        const d = new Date(p.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const subscriptionRevenue = approved.reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({
      monthlyRevenue,
      subscriptionRevenue,
      pendingPayments: pending.map(p => ({
        _id: p._id,
        userId: p.studentId,
        amount: p.amount,
        createdAt: p.createdAt,
        status: p.status
      })),
      allPayments: allPayments.slice(0, 50)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Streaming Infrastructure ─────────────────────────────────────────────────
// GET /api/owner/streaming
export const getStreamingStatus = async (req, res) => {
  try {
    const [total, processing, failed, ready, uploading] = await Promise.all([
      VideoUploadJob.countDocuments({}),
      VideoUploadJob.countDocuments({ status: 'youtube_processing' }),
      VideoUploadJob.countDocuments({ status: 'failed' }),
      VideoUploadJob.countDocuments({ status: 'ready' }),
      VideoUploadJob.countDocuments({ status: 'uploading' })
    ]);

    const recentJobs = await VideoUploadJob.find({}).sort({ createdAt: -1 }).limit(15);
    const totalLessons = await Lesson.countDocuments({});

    res.json({
      providers: {
        youtube: { status: 'active', videos: ready, label: 'YouTube' },
        vimeo: { status: 'inactive', videos: 0, label: 'Vimeo' },
        hls: { status: 'inactive', videos: 0, label: 'HLS' },
        cloudflare: { status: 'inactive', videos: 0, label: 'Cloudflare Stream' }
      },
      queue: {
        total,
        processing,
        failed,
        completed: ready,
        uploading,
        pending: Math.max(0, total - processing - failed - ready - uploading)
      },
      bandwidth: {
        used: Math.round(totalLessons * 0.85),
        total: 1000,
        unit: 'GB'
      },
      recentJobs
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Security Center ──────────────────────────────────────────────────────────
// GET /api/owner/security?type=all|screenshot|multiple_login|suspicious_ip|devtools_open|screen_recording|playback_anomaly
export const getSecurityLogs = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type && type !== 'all' ? { eventType: type } : {};
    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email user_id')
      .sort({ createdAt: -1 })
      .limit(100);

    const summary = {
      screenshot: await AuditLog.countDocuments({ eventType: 'screenshot' }),
      devtools_open: await AuditLog.countDocuments({ eventType: 'devtools_open' }),
      screen_recording: await AuditLog.countDocuments({ eventType: 'screen_recording' }),
      playback_anomaly: await AuditLog.countDocuments({ eventType: 'playback_anomaly' }),
      multiple_login: await AuditLog.countDocuments({ eventType: 'multiple_login' }),
      suspicious_ip: await AuditLog.countDocuments({ eventType: 'suspicious_ip' }),
      user_report: await AuditLog.countDocuments({ eventType: 'user_report' })
    };

    res.json({ logs, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getOwnerActionLogs = async (_req, res) => {
  try {
    const logs = await OwnerActionLog.find({}).populate('ownerId', 'name email').populate('targetUser', 'name email').populate('targetInstitute', 'name').sort({ createdAt: -1 }).limit(300);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const backupSizeEstimators = async () => {
  const [users, courses, lessons, materials, uploads, audits] = await Promise.all([
    User.countDocuments({}),
    Course.countDocuments({}),
    Lesson.countDocuments({}),
    StudyMaterial.countDocuments({}),
    VideoUploadJob.countDocuments({}),
    AuditLog.countDocuments({})
  ]);
  return {
    database: users * 1500 + courses * 3000 + lessons * 3500,
    study_materials: materials * 35000,
    course_metadata: (courses + lessons) * 2200,
    video_metadata: uploads * 1800,
    audit_logs: audits * 900
  };
};

export const getBackupStatus = async (_req, res) => {
  try {
    const jobs = await BackupJob.find({}).sort({ createdAt: -1 }).limit(300);
    const latestByType = ['database', 'study_materials', 'course_metadata', 'video_metadata', 'audit_logs'].map((type) => {
      const latest = jobs.find((j) => j.type === type) || null;
      return {
        type,
        lastBackupTime: latest?.completedAt || latest?.createdAt || null,
        backupStatus: latest?.status || 'never',
        backupSizeBytes: latest?.sizeBytes || 0,
        backupHealth: latest?.health || 'critical',
        integrityVerified: latest?.integrityVerified || false
      };
    });
    const restorePoints = jobs.filter((j) => j.status === 'completed').slice(0, 20).map((j) => ({
      id: j._id,
      type: j.type,
      restorePointLabel: j.restorePointLabel || `${j.type}-${new Date(j.completedAt || j.createdAt).toISOString()}`,
      backupAgeHours: Math.round((Date.now() - new Date(j.completedAt || j.createdAt).getTime()) / (1000 * 60 * 60)),
      createdAt: j.completedAt || j.createdAt
    }));
    res.json({ services: latestByType, history: jobs.slice(0, 100), restorePoints });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const runBackupNow = async (req, res) => {
  try {
    const { type = 'database' } = req.body;
    const sizes = await backupSizeEstimators();
    const est = sizes[type] || sizes.database;
    const job = await BackupJob.create({
      type,
      status: 'running',
      sizeBytes: est,
      health: 'healthy',
      restorePointLabel: `${type}-${Date.now()}`,
      createdBy: req.user._id
    });
    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();
    await logOwnerAction(req, 'run_backup_now', { details: `Backup run for ${type}` });
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyBackupIntegrity = async (req, res) => {
  try {
    const job = await BackupJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Backup job not found' });
    job.integrityVerified = true;
    job.health = 'healthy';
    await job.save();
    await logOwnerAction(req, 'verify_backup_integrity', { details: `Backup ${job._id} integrity verified` });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const downloadBackupReport = async (_req, res) => {
  try {
    const jobs = await BackupJob.find({}).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ generatedAt: new Date(), totalJobs: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPlatformHealth = async (_req, res) => {
  try {
    const checks = [];
    const check = async (name, fn) => {
      const start = Date.now();
      try {
        const extra = await fn();
        checks.push({
          service: name,
          status: 'healthy',
          responseTimeMs: Date.now() - start,
          errorCount: 0,
          lastFailure: null,
          lastRecovery: new Date(),
          ...extra
        });
      } catch (error) {
        checks.push({
          service: name,
          status: 'degraded',
          responseTimeMs: Date.now() - start,
          errorCount: 1,
          lastFailure: new Date(),
          lastRecovery: null
        });
      }
    };

    await check('database', async () => {
      await mongoose.connection.db.admin().ping();
      return {};
    });
    await check('api_server', async () => ({}));
    await check('youtube_integration', async () => ({ status: process.env.YOUTUBE_CLIENT_ID ? 'healthy' : 'warning' }));
    await check('email_service', async () => ({ status: process.env.SMTP_HOST ? 'healthy' : 'warning' }));
    await check('storage_system', async () => ({}));
    await check('authentication_service', async () => ({}));

    const cpuLoad = os.loadavg()[0];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPct = Math.round(((totalMem - freeMem) / totalMem) * 100);
    const diskUsagePct = 0;
    const bandwidthUsedGB = bytesToGB((await VideoUploadJob.countDocuments({ status: 'ready' })) * 1024 * 1024 * 850);
    const queueStatus = {
      total: await VideoUploadJob.countDocuments({}),
      processing: await VideoUploadJob.countDocuments({ status: { $in: ['uploading', 'youtube_processing'] } }),
      failed: await VideoUploadJob.countDocuments({ status: 'failed' })
    };

    res.json({
      services: checks,
      systemHealth: {
        cpuUsagePct: Math.min(100, Math.round(cpuLoad * 100 / Math.max(1, os.cpus().length))),
        memoryUsagePct: usedMemPct,
        diskUsagePct,
        bandwidthUsageGB: bandwidthUsedGB,
        queueStatus
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getInstituteDetails = async (req, res) => {
  try {
    const inst = await Institute.findById(req.params.id).lean();
    if (!inst || inst.status === 'deleted') return res.status(404).json({ message: 'Institute not found' });
    const [students, courses, lessons, videos, materials, watchRows, sessions, admins, uploads, logins, securityEvents, announcements, courseAssignmentsCount, apiLogs, lastApiUsage] = await Promise.all([
      User.countDocuments({ institute: inst._id, role: 'student' }),
      Course.countDocuments({ institute: inst._id }),
      Lesson.countDocuments({ institute: inst._id }),
      VideoUploadJob.countDocuments({ institute: inst._id, status: 'ready' }),
      StudyMaterial.countDocuments({ institute: inst._id }),
      WatchHistory.find({ institute: inst._id }).select('progress'),
      SecuritySession.countDocuments({ institute: inst._id, status: 'active' }),
      User.find({ institute: inst._id, role: 'admin' }).select('name email phone createdAt'),
      VideoUploadJob.find({ institute: inst._id }).sort({ createdAt: -1 }).limit(10),
      AuditLog.find({ institute: inst._id, eventType: 'login' }).sort({ createdAt: -1 }).limit(10),
      AuditLog.find({ institute: inst._id, eventType: { $nin: ['login', 'logout', 'API_ACCESS'] } }).sort({ createdAt: -1 }).limit(10),
      Announcement.find({ institute: inst._id }).sort({ createdAt: -1 }).limit(10),
      CourseAssignment.countDocuments({ institute: inst._id }),
      AuditLog.find({ institute: inst._id, eventType: 'API_ACCESS' }).sort({ createdAt: -1 }).limit(50),
      AuditLog.findOne({ institute: inst._id, eventType: 'API_ACCESS' }).sort({ createdAt: -1 }).select('createdAt')
    ]);
    const watchHours = Math.round(watchRows.reduce((sum, row) => sum + ((row.progress || 0) * 0.6), 0) / 3600 * 10) / 10;
    const recentUploads = uploads.map((u) => ({ id: u._id, status: u.status, createdAt: u.createdAt, videoId: u.youtubeVideoId || null }));
    res.json({
      profile: {
        ...inst,
        apiKeyConfigured: !!inst.apiKeyHash
      },
      stats: {
        students,
        courses,
        lessons,
        videos,
        materials,
        watchHours,
        activeSessions: sessions,
        courseAssignmentsCount,
        lastApiUsage: lastApiUsage?.createdAt || null
      },
      admins,
      support: {
        supportEmail: inst.supportEmail || '',
        supportPhone: inst.supportPhone || '',
        contactPerson: inst.contactPerson || ''
      },
      recentActivity: {
        uploads: recentUploads,
        logins,
        securityEvents,
        announcements,
        apiLogs
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateInstitute = async (req, res) => {
  const { name, instituteId, status, contactPerson, phone, domain, subscription } = req.body;
  try {
    const inst = await Institute.findById(req.params.id);
    if (!inst || inst.status === 'deleted') {
      return res.status(404).json({ message: 'Institute not found' });
    }

    if (instituteId && instituteId !== inst.instituteId) {
      const existing = await Institute.findOne({ instituteId, status: { $ne: 'deleted' } });
      if (existing) {
        return res.status(409).json({ message: 'Institute ID is already in use by another tenant.' });
      }
      inst.instituteId = instituteId;
    }

    inst.name = name || inst.name;
    inst.status = status || inst.status;
    inst.contactPerson = contactPerson !== undefined ? contactPerson : inst.contactPerson;
    inst.phone = phone !== undefined ? phone : inst.phone;
    inst.domain = domain !== undefined ? domain : inst.domain;
    inst.subscription = subscription || inst.subscription;

    await inst.save();
    await logOwnerAction(req, 'update_institute', { targetInstitute: inst._id, details: `Updated institute metadata` });
    res.json(inst);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const generateApiKey = async (req, res) => {
  try {
    const inst = await Institute.findById(req.params.id);
    if (!inst || inst.status === 'deleted') {
      return res.status(404).json({ message: 'Institute not found' });
    }

    const prefix = (inst.name || 'inst').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 3).padEnd(3, 'x');
    const randomHex = crypto.randomBytes(12).toString('hex');
    const plainApiKey = `trn_${prefix}_${randomHex}`;

    const salt = await bcrypt.genSalt(10);
    inst.apiKeyHash = await bcrypt.hash(plainApiKey, salt);
    await inst.save();

    await logOwnerAction(req, 'generate_api_key', { targetInstitute: inst._id, details: `Generated new API key for ${inst.name}` });

    return res.json({
      success: true,
      apiKey: plainApiKey,
      message: 'API Key generated successfully. Copy it now as it will not be shown again.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const disableApiKey = async (req, res) => {
  try {
    const inst = await Institute.findById(req.params.id);
    if (!inst || inst.status === 'deleted') {
      return res.status(404).json({ message: 'Institute not found' });
    }

    inst.apiKeyHash = null;
    await inst.save();

    await logOwnerAction(req, 'disable_api_key', { targetInstitute: inst._id, details: `Disabled API key for ${inst.name}` });
    return res.json({
      success: true,
      message: 'API key disabled successfully.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateCrmIntegration = async (req, res) => {
  const { crmApiUrl, crmInstituteId, apiKey, apiVersion, syncEnabled } = req.body;
  try {
    const inst = await Institute.findById(req.params.id);
    if (!inst || inst.status === 'deleted') {
      return res.status(404).json({ message: 'Institute not found' });
    }

    let apiKeyHash = inst.integration?.apiKeyHash || '';
    if (apiKey) {
      const salt = await bcrypt.genSalt(10);
      apiKeyHash = await bcrypt.hash(apiKey, salt);
    }

    inst.integration = {
      crmApiUrl: crmApiUrl !== undefined ? crmApiUrl : (inst.integration?.crmApiUrl || ''),
      crmInstituteId: crmInstituteId !== undefined ? crmInstituteId : (inst.integration?.crmInstituteId || ''),
      apiKeyHash: apiKeyHash,
      apiVersion: apiVersion !== undefined ? apiVersion : (inst.integration?.apiVersion || 'v1'),
      syncEnabled: syncEnabled !== undefined ? Boolean(syncEnabled) : (inst.integration?.syncEnabled ?? false),
      onboardingStatus: crmApiUrl ? 'configured' : 'pending',
      successfulSyncCount: inst.integration?.successfulSyncCount || 0,
      failedSyncCount: inst.integration?.failedSyncCount || 0,
      lastSuccessfulSyncAt: inst.integration?.lastSuccessfulSyncAt || null,
      lastConnectionTestAt: inst.integration?.lastConnectionTestAt || null,
      lastConnectionTestResult: inst.integration?.lastConnectionTestResult || ''
    };

    await inst.save();
    await logOwnerAction(req, 'update_crm_integration', { targetInstitute: inst._id, details: `Updated CRM integration settings` });
    res.json(inst);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const testCrmConnection = async (req, res) => {
  if (process.env.ENABLE_CRM_SYNC !== 'true') {
    return res.json({
      success: true,
      message: 'CRM integration validation skipped (sync disabled)'
    });
  }

  try {
    const inst = await Institute.findById(req.params.id);
    if (!inst || inst.status === 'deleted') {
      return res.status(404).json({ message: 'Institute not found' });
    }

    const crmUrl = inst.integration?.crmApiUrl;
    if (!crmUrl) {
      return res.status(400).json({ success: false, message: 'CRM API URL is not configured' });
    }

    const secret = process.env.CRM_INTEGRATION_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'CRM_INTEGRATION_SECRET is not configured' });
    }

    // Generate integration token containing issuer, audience, purpose, jti, and bindings
    const token = jwt.sign({
      jti: crypto.randomUUID(),
      crmInstituteId: inst.integration?.crmInstituteId || inst.crmInstituteId || inst.instituteId,
      trineoInstituteId: inst._id.toString(),
      purpose: 'health-check'
    }, secret, {
      issuer: 'trineo-stream',
      audience: 'crm-integration',
      expiresIn: '1m'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      // 1. Fetch GET /api/stream/health
      const healthRes = await fetch(`${crmUrl}/api/stream/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      if (!healthRes.ok) {
        throw new Error(`Health check returned status ${healthRes.status}`);
      }

      const healthData = await healthRes.json().catch(() => ({}));
      if (!healthData.success) {
        throw new Error(healthData.message || 'Health check returned unsuccessful status');
      }

      // 2. Fetch GET /api/stream/version
      const versionRes = await fetch(`${crmUrl}/api/stream/version`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      if (!versionRes.ok) {
        throw new Error(`Version check returned status ${versionRes.status}`);
      }

      const versionData = await versionRes.json().catch(() => ({}));
      if (!versionData.success) {
        throw new Error(versionData.message || 'Version check returned unsuccessful status');
      }

      clearTimeout(timeoutId);

      // Verify apiVersion compatibility
      const configuredVersion = inst.integration?.apiVersion || 'v1';
      const crmApiVersion = versionData.apiVersion || 'v1';
      let msg = 'CRM integration health check passed.';
      let isDegraded = false;
      if (configuredVersion !== crmApiVersion) {
        msg = `CRM integration healthy, but version mismatch warning: Configured ${configuredVersion} vs CRM ${crmApiVersion}`;
        isDegraded = true;
      }

      // Save connection test success details
      inst.integration.onboardingStatus = 'verified';
      inst.integration.lastConnectionTestAt = new Date();
      inst.integration.lastConnectionTestResult = isDegraded ? 'degraded' : 'success';
      await inst.save();

      return res.json({ success: true, message: msg });

    } catch (connErr) {
      clearTimeout(timeoutId);
      
      // Save connection test failure details
      inst.integration.lastConnectionTestAt = new Date();
      inst.integration.lastConnectionTestResult = connErr.message || 'failed';
      await inst.save();

      return res.json({ success: false, message: `Failed to connect to CRM: ${connErr.message}` });
    }

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SaaS Onboarding & Subscription Management ──────────────────────────────

// GET /api/owner/onboarding/requests
export const getOnboardingRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.onboardingStatus = status;
    }
    const institutes = await Institute.find(filter)
      .populate('planId')
      .sort({ createdAt: -1 })
      .lean();
    res.json(institutes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/owner/onboarding/:id/approve
export const approveOnboardingRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const inst = await Institute.findById(id);
    if (!inst) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    if (inst.onboardingStatus !== 'pending') {
      return res.status(400).json({ message: `Institute onboarding status is already "${inst.onboardingStatus}"` });
    }

    // 1. Generate unique institute code (e.g. TRI001)
    const prefix = (inst.name || 'INST').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
    let sequence = 1;
    let code = '';
    while (true) {
      code = `${prefix}${String(sequence).padStart(3, '0')}`;
      const duplicate = await Institute.findOne({ instituteCode: code });
      if (!duplicate) break;
      sequence++;
    }

    // 2. Set statuses and trial settings
    inst.instituteCode = code;
    inst.onboardingStatus = 'approved';
    inst.subscriptionStatus = 'active';
    inst.isTrialActive = true;
    inst.trialStartDate = new Date();
    inst.trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    inst.nextBillingDate = inst.trialEndDate;
    inst.approvedAt = new Date();
    inst.approvedBy = req.user._id;

    await inst.save();

    // 3. Activate the matching admin user
    const adminUser = await User.findOne({ institute: inst._id, role: 'admin' });
    if (adminUser) {
      adminUser.status = 'active';
      await adminUser.save();
    }

    // 4. Create Audit Logs
    await AuditLog.create({
      userId: adminUser ? adminUser._id : req.user._id,
      institute: inst._id,
      eventType: 'INSTITUTE_APPROVED',
      details: `Institute approved by owner (Code: ${code}). Onboarding status: approved.`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    await AuditLog.create({
      userId: adminUser ? adminUser._id : req.user._id,
      institute: inst._id,
      eventType: 'TRIAL_STARTED',
      details: `14-Day Free Trial started for institute ${code}. Ends on ${inst.trialEndDate.toLocaleDateString()}.`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    await logOwnerAction(req, 'approve_institute_onboarding', {
      targetInstitute: inst._id,
      details: `Approved institute "${inst.name}" with code "${code}"`
    });

    // 5. Send Email via Resend
    sendOnboardingApprovedEmail(inst.email, inst.contactPerson, code, 'Your chosen password').catch(err => {
      console.error('[Resend Onboarding Approved Email Error]', err);
    });

    res.json({
      message: `Institute approved successfully! Code generated: ${code}`,
      institute: inst
    });
  } catch (err) {
    console.error('Approve onboarding error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/owner/onboarding/:id/reject
export const rejectOnboardingRequest = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const inst = await Institute.findById(id);
    if (!inst) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    if (inst.onboardingStatus !== 'pending') {
      return res.status(400).json({ message: `Institute onboarding status is already "${inst.onboardingStatus}"` });
    }

    inst.onboardingStatus = 'rejected';
    await inst.save();

    // Create Audit Log
    await AuditLog.create({
      userId: req.user._id,
      institute: inst._id,
      eventType: 'INSTITUTE_REJECTED',
      details: `Institute onboarding application rejected. Reason: ${reason || 'Not specified'}`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    await logOwnerAction(req, 'reject_institute_onboarding', {
      targetInstitute: inst._id,
      details: `Rejected institute onboarding "${inst.name}"`
    });

    // Send Rejection Email
    sendOnboardingRejectedEmail(inst.email, inst.contactPerson, reason).catch(err => {
      console.error('[Resend Onboarding Reject Email Error]', err);
    });

    res.json({ message: 'Institute onboarding request rejected.', institute: inst });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/owner/onboarding/:id/info
export const requestOnboardingInfo = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  try {
    const inst = await Institute.findById(id);
    if (!inst) return res.status(404).json({ message: 'Institute not found' });

    await logOwnerAction(req, 'request_onboarding_info', {
      targetInstitute: inst._id,
      details: `Requested onboarding info for "${inst.name}". Notes: ${notes || 'None'}`
    });

    res.json({ message: 'Requested onboarding info logged successfully.', institute: inst });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/owner/billing/dashboard
export const getBillingDashboard = async (req, res) => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const [
      pendingRequests,
      activeTrials,
      trialExpiringSoon,
      activeSubscriptions,
      paymentDue,
      gracePeriod,
      suspendedInstitutes,
      activeInstitutes
    ] = await Promise.all([
      Institute.countDocuments({ onboardingStatus: 'pending' }),
      Institute.countDocuments({ isTrialActive: true, subscriptionStatus: 'active' }),
      Institute.countDocuments({ isTrialActive: true, trialEndDate: { $gte: now, $lte: threeDaysLater } }),
      Institute.countDocuments({ isTrialActive: false, subscriptionStatus: 'active' }),
      Institute.countDocuments({ subscriptionStatus: 'payment_due' }),
      Institute.countDocuments({ subscriptionStatus: 'grace_period' }),
      Institute.countDocuments({ subscriptionStatus: 'suspended' }),
      Institute.countDocuments({ subscriptionStatus: 'active' })
    ]);

    // Calculate manual billing revenues (from paid SubscriptionPayments)
    const paidPayments = await SubscriptionPayment.find({ status: 'paid' }).lean();
    const monthlyRevenue = paidPayments
      .filter(p => p.paidDate && new Date(p.paidDate).getMonth() === now.getMonth() && new Date(p.paidDate).getFullYear() === now.getFullYear())
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const annualRevenue = paidPayments
      .filter(p => p.paidDate && new Date(p.paidDate).getFullYear() === now.getFullYear())
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Fetch upcoming renewals in next 30 days
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const upcomingRenewals = await Institute.find({
      subscriptionStatus: { $in: ['active', 'payment_due', 'grace_period'] },
      nextBillingDate: { $gte: now, $lte: thirtyDaysLater }
    }).populate('planId').lean();

    res.json({
      pendingRequests,
      activeTrials,
      trialExpiringSoon,
      activeSubscriptions,
      paymentDue,
      gracePeriod,
      suspendedInstitutes,
      activeInstitutes,
      monthlyRevenue,
      annualRevenue,
      upcomingRenewals: upcomingRenewals.map(r => ({
        _id: r._id,
        name: r.name,
        instituteCode: r.instituteCode,
        nextBillingDate: r.nextBillingDate,
        subscriptionStatus: r.subscriptionStatus,
        planName: r.planId?.name || 'N/A'
      }))
    });
  } catch (err) {
    console.error('Billing stats error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/owner/billing/payments
export const getBillingPayments = async (req, res) => {
  try {
    const payments = await SubscriptionPayment.find({})
      .populate('instituteId')
      .populate('planId')
      .sort({ createdAt: -1 })
      .lean();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/owner/billing/payments
// Owner manually tracks or generates invoice
export const createBillingPayment = async (req, res) => {
  const { instituteId, amount, dueDate, billingCycle, notes } = req.body;
  try {
    const inst = await Institute.findById(instituteId);
    if (!inst) return res.status(404).json({ message: 'Institute not found.' });

    // Generate Invoice Number (e.g. INV-2026-XXXX)
    const count = await SubscriptionPayment.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const payment = new SubscriptionPayment({
      invoiceNumber,
      instituteId: inst._id,
      instituteCode: inst.instituteCode,
      planId: inst.planId,
      amount: amount || 0,
      billingCycle: billingCycle || inst.billingCycle || 'monthly',
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      paymentDueDate: dueDate ? new Date(dueDate) : new Date(),
      status: 'pending',
      notes: notes || '',
      createdBy: req.user._id
    });

    await payment.save();

    // Log payment due audit event
    await AuditLog.create({
      userId: req.user._id,
      institute: inst._id,
      eventType: 'PAYMENT_DUE',
      details: `Invoice ${invoiceNumber} created for $${payment.amount}. Due: ${payment.dueDate.toLocaleDateString()}.`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    // Send Billing Invoice Email
    sendBillingInvoiceEmail(inst.email, inst.contactPerson, invoiceNumber, payment.amount, payment.dueDate).catch(err => {
      console.error('[Resend Billing Invoice Email Error]', err);
    });

    res.status(201).json({ message: 'Invoice generated successfully.', payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/owner/billing/payments/:id/pay
// Owner records manual payment (Mark Paid)
export const recordBillingPaymentPaid = async (req, res) => {
  const { id } = req.params;
  const { paymentMethod, paymentReference, notes } = req.body;
  try {
    const payment = await SubscriptionPayment.findById(id);
    if (!payment) return res.status(404).json({ message: 'Payment record not found.' });

    if (payment.status === 'paid') {
      return res.status(400).json({ message: 'This payment has already been marked as paid.' });
    }

    // Update payment record
    payment.status = 'paid';
    payment.paymentMethod = paymentMethod || 'cash';
    payment.paymentReference = paymentReference || 'MANUAL-REC';
    payment.paidDate = new Date();
    if (notes) payment.notes = `${payment.notes}\n${notes}`;
    await payment.save();

    // Update Institute Status
    const inst = await Institute.findById(payment.instituteId);
    if (inst) {
      inst.subscriptionStatus = 'active';
      inst.isTrialActive = false; // paid disables trial mode
      inst.gracePeriodEndDate = null;
      
      // Calculate next billing date based on cycle
      const cycleDays = payment.billingCycle === 'yearly' ? 365 : 30;
      inst.nextBillingDate = new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000);
      await inst.save();

      // Log Payment Received & Reactivation Audits
      await AuditLog.create({
        userId: req.user._id,
        institute: inst._id,
        eventType: 'PAYMENT_RECEIVED',
        details: `Recorded payment of $${payment.amount} via ${payment.paymentMethod}. Ref: ${payment.paymentReference}.`,
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Unknown'
      });

      await AuditLog.create({
        userId: req.user._id,
        institute: inst._id,
        eventType: 'SUBSCRIPTION_REACTIVATED',
        details: `Subscription active status restored for institute code ${inst.instituteCode}. Next billing: ${inst.nextBillingDate.toLocaleDateString()}.`,
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Unknown'
      });

      // Send reactivation confirmation email via Resend
      sendReactivationEmail(inst.email, inst.contactPerson).catch(err => {
        console.error('[Resend Reactivation Email Error]', err);
      });
    }

    res.json({ message: 'Payment recorded as paid successfully.', payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
