import crypto from 'crypto';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { SecuritySession } from '../models/SecuritySession.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const logSecurityEvent = async (req, userId, details) => {
  await AuditLog.create({
    userId,
    institute: req.user?.institute || null,
    eventType: 'logout',
    details,
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || ''
  });
};

export const getStudentProfileSettings = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const user = await User.findById(req.user._id).populate('institute').select('-password -passwordResetTokenHash');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudentProfileSettings = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    await user.save();
    const updated = await User.findById(user._id).populate('institute').select('-password -passwordResetTokenHash');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changeStudentPassword = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'currentPassword, newPassword, and confirmPassword are required' });
    }
    if (newPassword !== confirmPassword) return res.status(400).json({ message: 'New passwords do not match' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const wasForced = user.mustChangePassword === true;
    user.password = newPassword;
    user.mustChangePassword = false;

    if (!wasForced) {
      user.activeSessionToken = '';
      await user.save();
      await SecuritySession.updateMany({ userId: user._id, status: 'active' }, { $set: { status: 'terminated' } });
      await logSecurityEvent(req, user._id, 'Password changed by student');
      res.json({ message: 'Password changed successfully. Please log in again.' });
    } else {
      const suffix = req.token ? req.token.slice(-10) : '';
      await user.save();
      await SecuritySession.updateMany(
        { userId: user._id, status: 'active', tokenSuffix: { $ne: suffix } },
        { $set: { status: 'terminated' } }
      );
      await logSecurityEvent(req, user._id, 'Password changed by student (first login)');
      res.json({ message: 'Password changed successfully', mustChangePassword: false });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email, role: 'student' });
    if (!user) return res.json({ message: 'If the account exists, a reset link has been generated.' });
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();
    await AuditLog.create({
      userId: user._id,
      institute: user.institute || null,
      eventType: 'logout',
      details: 'Password reset requested',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || ''
    });
    res.json({
      message: 'Password reset token generated',
      resetToken,
      resetLink: `/login?resetToken=${resetToken}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ message: 'Token required' });
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    });
    if (!user) return res.status(400).json({ message: 'Token is invalid or expired' });
    res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || !confirmPassword) return res.status(400).json({ message: 'token, newPassword, and confirmPassword are required' });
    if (newPassword !== confirmPassword) return res.status(400).json({ message: 'New passwords do not match' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    });
    if (!user) return res.status(400).json({ message: 'Token is invalid or expired' });
    user.password = newPassword;
    user.passwordResetTokenHash = '';
    user.passwordResetExpiresAt = null;
    user.activeSessionToken = '';
    await user.save();
    await SecuritySession.updateMany({ userId: user._id, status: 'active' }, { $set: { status: 'terminated' } });
    await AuditLog.create({
      userId: user._id,
      institute: user.institute || null,
      eventType: 'logout',
      details: 'Password reset completed',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || ''
    });
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentSessions = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const sessions = await SecuritySession.find({ userId: req.user._id }).sort({ lastSeenAt: -1 });
    const logs = await AuditLog.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ sessions, logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const terminateStudentSession = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const session = await SecuritySession.findOne({ _id: req.params.sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    session.status = 'terminated';
    await session.save();
    if (session.tokenSuffix && req.user.activeSessionToken?.endsWith(session.tokenSuffix)) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.activeSessionToken = '';
        await user.save();
      }
    }
    await logSecurityEvent(req, req.user._id, 'Student terminated one session');
    res.json({ message: 'Session terminated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const terminateOtherStudentSessions = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const currentSuffix = req.user.activeSessionToken ? req.user.activeSessionToken.slice(-12) : '';
    await SecuritySession.updateMany(
      { userId: req.user._id, status: 'active', tokenSuffix: { $ne: currentSuffix } },
      { $set: { status: 'terminated' } }
    );
    await logSecurityEvent(req, req.user._id, 'Student terminated other sessions');
    res.json({ message: 'Other sessions terminated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
