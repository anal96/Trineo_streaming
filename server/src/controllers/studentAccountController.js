import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { SecuritySession } from '../models/SecuritySession.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { Institute } from '../models/Institute.js';
import { Course } from '../models/Course.js';

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
    if (!user) return res.status(404).json({ message: 'User not found' });
    const userObj = user.toObject();
    userObj.assignedBatch = null;

    if (user.courseName) {
      const matchedCourse = await Course.findOne({
        title: user.courseName,
        institute: user.institute ? user.institute._id : null
      });
      if (matchedCourse) {
        userObj.assignedBatch = {
          _id: matchedCourse._id,
          name: matchedCourse.title
        };
      }
    }

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudentProfileSettings = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const { name, phone, recoveryEmail, notificationPreferences } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (recoveryEmail !== undefined) user.recoveryEmail = recoveryEmail;
    if (notificationPreferences !== undefined) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences
      };
    }
    await user.save();
    const updated = await User.findById(user._id).populate('institute').select('-password -passwordResetTokenHash');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    const updatedObj = updated.toObject();
    updatedObj.assignedBatch = null;

    if (updated.courseName) {
      const matchedCourse = await Course.findOne({
        title: updated.courseName,
        institute: updated.institute ? updated.institute._id : null
      });
      if (matchedCourse) {
        updatedObj.assignedBatch = {
          _id: matchedCourse._id,
          name: matchedCourse.title
        };
      }
    }

    res.json(updatedObj);
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
    const { email, instituteId } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Always respond the same way — don't leak whether the account exists
    const users = await User.find({ email, role: 'student' });
    let user = null;
    if (users.length === 1) {
      user = users[0];
    } else if (users.length > 1) {
      if (instituteId) {
        user = users.find(u => u.instituteId === instituteId);
      }
      if (!user) {
        const host = req.headers.host || '';
        const matchingInst = await Institute.findOne({ domain: { $regex: new RegExp(host, 'i') } });
        if (matchingInst) {
          user = users.find(u => String(u.institute) === String(matchingInst._id));
        }
      }
      if (!user) {
        user = users[0]; // Default fallback if no resolution possible
      }
    }

    if (!user) {
      return res.json({ message: 'If your account exists, a password reset email has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await user.save();

    await AuditLog.create({
      userId: user._id,
      institute: user.institute || null,
      eventType: 'logout',
      details: 'Password reset requested',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || ''
    });

    // Send reset email via Resend (fire-and-forget; don't block response on email failure)
    sendPasswordResetEmail(user.name, user.email, resetToken).catch(err =>
      console.error('[resetEmail] Failed to send password reset email:', err.message)
    );

    res.json({ message: 'If your account exists, a password reset email has been sent.' });
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

export const uploadStudentAvatar = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const { image } = req.body; // base64 string
    if (!image) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    // Clean up base64 header if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const filename = `student_${req.user.user_id}_${Date.now()}.webp`;
    const relativePath = `/uploads/profile-pictures/${filename}`;
    const filePath = path.join(path.resolve(), 'uploads', 'profile-pictures', filename);

    // Find and delete the old avatar if it exists
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const oldPaths = [user.avatar, user.profileImageUrl].filter(Boolean);
    for (const oldPath of oldPaths) {
      if (oldPath.startsWith('/uploads/profile-pictures/') || oldPath.startsWith('/uploads/avatars/')) {
        const cleanOldPath = path.join(path.resolve(), oldPath.replace(/^\//, ''));
        if (fs.existsSync(cleanOldPath)) {
          try {
            fs.unlinkSync(cleanOldPath);
          } catch (err) {
            console.error('Failed to delete old profile picture:', err);
          }
        }
      }
    }

    // Write the new WebP file
    fs.writeFileSync(filePath, buffer);

    user.avatar = relativePath;
    user.profileImageUrl = relativePath;
    await user.save();

    res.json({
      message: 'Avatar uploaded successfully',
      avatar: relativePath,
      profileImageUrl: relativePath
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStudentAvatar = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const oldPaths = [user.avatar, user.profileImageUrl].filter(Boolean);
    for (const oldPath of oldPaths) {
      if (oldPath.startsWith('/uploads/profile-pictures/') || oldPath.startsWith('/uploads/avatars/')) {
        const cleanOldPath = path.join(path.resolve(), oldPath.replace(/^\//, ''));
        if (fs.existsSync(cleanOldPath)) {
          try {
            fs.unlinkSync(cleanOldPath);
          } catch (err) {
            console.error('Failed to delete avatar file:', err);
          }
        }
      }
    }

    user.avatar = '';
    user.profileImageUrl = '';
    await user.save();

    res.json({
      message: 'Avatar removed successfully',
      avatar: '',
      profileImageUrl: ''
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
