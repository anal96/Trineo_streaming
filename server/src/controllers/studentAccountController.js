import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { SecuritySession } from '../models/SecuritySession.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { Institute } from '../models/Institute.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Program } from '../models/Program.js';
import { isR2Configured, uploadToR2, getSignedR2Url, parseR2Key } from '../utils/r2Service.js';

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

const resolveAssignedBatch = async (user) => {
  // 1. Try to find active enrollment
  const activeEnrollment = await Enrollment.findOne({
    studentId: user._id,
    status: 'active',
    institute: user.institute ? user.institute._id : null
  }).populate('programId');

  if (activeEnrollment && activeEnrollment.programId && !activeEnrollment.programId.isDeleted) {
    return {
      _id: activeEnrollment.programId._id,
      name: activeEnrollment.programId.name
    };
  }

  // 2. Fallback to Program matching by name/title/slug of student.batchName or student.courseName or student.program
  const userFields = [user.batchName, user.courseName, user.program]
    .filter(Boolean);
  
  if (userFields.length > 0) {
    const matchedProgram = await Program.findOne({
      name: { $in: userFields },
      institute: user.institute ? user.institute._id : null,
      isDeleted: false
    });
    if (matchedProgram) {
      return {
        _id: matchedProgram._id,
        name: matchedProgram.name
      };
    }
  }

  return null;
};

const signUserAvatar = async (userObj) => {
  if (userObj && isR2Configured()) {
    if (userObj.avatar && userObj.avatar.startsWith('http')) {
      try {
        const key = parseR2Key(userObj.avatar);
        const signedUrl = await getSignedR2Url(key, 86400); // 24 hours
        userObj.avatar = signedUrl;
        userObj.profileImageUrl = signedUrl;
      } catch (err) {
        console.error('Failed to sign avatar URL:', err);
      }
    }
  }
  return userObj;
};

export const getStudentProfileSettings = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Forbidden: student access required' });
    const user = await User.findById(req.user._id).populate('institute').select('-password -passwordResetTokenHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const userObj = user.toObject();
    
    userObj.assignedBatch = await resolveAssignedBatch(user);
    await signUserAvatar(userObj);

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
    
    updatedObj.assignedBatch = await resolveAssignedBatch(updated);
    await signUserAvatar(updatedObj);

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

    // Write file to R2 if configured, else write local file
    console.log("Upload started: Student Avatar upload");
    const r2Key = `avatars/student_${req.user.user_id}_${Date.now()}.webp`;
    console.log("Generated object key:", r2Key);

    let avatarUrl = relativePath;
    if (isR2Configured()) {
      try {
        console.log("Uploading to R2...");
        avatarUrl = await uploadToR2(buffer, r2Key, 'image/webp');
        console.log("Upload success. Final object key:", r2Key);
      } catch (r2Err) {
        console.error("Upload failure: R2 Avatar Upload Failed, falling back to local file:", r2Err);
        fs.writeFileSync(filePath, buffer);
      }
    } else {
      console.log("R2 not configured, writing local file.");
      fs.writeFileSync(filePath, buffer);
    }

    console.log("Final public URL:", avatarUrl);
    console.log("Bucket name:", process.env.R2_BUCKET_NAME);
    console.log("Account ID:", process.env.R2_ACCOUNT_ID);
    console.log("Object key:", r2Key);

    user.avatar = avatarUrl;
    user.profileImageUrl = avatarUrl;
    await user.save();

    console.log("Saved profileImage:", user.avatar);
    console.log("Saved profileImageUrl:", user.profileImageUrl);

    const resObj = { avatar: avatarUrl, profileImageUrl: avatarUrl };
    await signUserAvatar(resObj);

    res.json({
      message: 'Avatar uploaded successfully',
      avatar: resObj.avatar,
      profileImageUrl: resObj.profileImageUrl
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
