import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';

const requireStudentInstitute = (req, res) => {
  if (req.user.role !== 'student') {
    res.status(403).json({ message: 'Forbidden: student access required' });
    return false;
  }
  if (!req.user.institute) {
    res.status(403).json({ message: 'Forbidden: institute access required' });
    return false;
  }
  return true;
};

export const getStudentNotifications = async (req, res) => {
  try {
    if (!requireStudentInstitute(req, res)) return;

    // Fetch the student's active enrollment to extract the active programId
    const EnrollmentModel = mongoose.model('Enrollment');
    const activeEnrollment = await EnrollmentModel.findOne({
      studentId: req.user._id,
      institute: req.user.institute,
      isActive: { $ne: false }
    });

    const activeProgramId = activeEnrollment ? activeEnrollment.programId.toString() : null;

    // Only fetch notifications explicitly targeted at this student or at the student role
    const notifications = await Notification.find({
      institute: req.user.institute,
      $or: [
        { targetType: 'user', userId: req.user._id },
        { targetType: 'role', targetRole: 'student' }
      ],
      deletedUsers: { $ne: req.user._id }
    }).sort({ createdAt: -1 }).limit(200);

    const merged = [];
    const readRoleMessages = new Set();
    
    // Group read status of role-based notifications
    notifications.forEach(n => {
      if (n.targetType === 'user' && n.userId && n.read) {
        readRoleMessages.add(`${n.type}::${n.message}`);
      }
    });

    notifications.forEach(n => {
      // Filter out notifications that target a different program
      if (n.programId && n.programId.toString() !== activeProgramId) {
        return;
      }

      if (n.targetType === 'role') {
        // Role-based notification
        const isRead = readRoleMessages.has(`${n.type}::${n.message}`);
        merged.push({
          ...n.toObject(),
          read: isRead
        });
      } else {
        // User-specific notification
        // Filter out read/unread copies created from role-based to prevent duplicates
        const isRoleCopy = notifications.some(g => g.targetType === 'role' && g.message === n.message && g.type === n.type);
        if (!isRoleCopy) {
          merged.push(n.toObject());
        }
      }
    });

    const unreadCount = merged.filter((n) => !n.read).length;
    res.json({ notifications: merged, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    if (!requireStudentInstitute(req, res)) return;
    const notification = await Notification.findOne({
      _id: req.params.id,
      institute: req.user.institute,
      $or: [
        { targetType: 'user', userId: req.user._id },
        { targetType: 'role', targetRole: 'student' }
      ]
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.targetType === 'role') {
      // It's a role-based notification. Create a personal read-receipt copy.
      await Notification.create({
        institute: req.user.institute,
        userId: req.user._id,
        targetType: 'user',
        message: notification.message,
        type: notification.type,
        read: true
      });
    } else {
      notification.read = true;
      await notification.save();
    }
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    if (!requireStudentInstitute(req, res)) return;

    // Mark all personal notifications as read
    await Notification.updateMany(
      { institute: req.user.institute, targetType: 'user', userId: req.user._id, read: false },
      { $set: { read: true } }
    );
    
    // Create read-receipt copies for role-based notifications
    const roleNotifs = await Notification.find({ 
      institute: req.user.institute, 
      targetType: 'role',
      targetRole: 'student',
      deletedUsers: { $ne: req.user._id }
    }).select('message type');
    
    const existingRead = await Notification.find({
      institute: req.user.institute,
      targetType: 'user',
      userId: req.user._id,
      read: true
    }).select('message type');
    const existingSet = new Set(existingRead.map((n) => `${n.type}::${n.message}`));

    const inserts = roleNotifs
      .filter((g) => !existingSet.has(`${g.type}::${g.message}`))
      .map((g) => ({ 
        institute: req.user.institute, 
        userId: req.user._id,
        targetType: 'user',
        message: g.message, 
        type: g.type, 
        read: true 
      }));
    if (inserts.length) await Notification.insertMany(inserts);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStudentNotification = async (req, res) => {
  try {
    if (!requireStudentInstitute(req, res)) return;
    
    const notification = await Notification.findOne({
      _id: req.params.id,
      institute: req.user.institute
    });
    
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    
    if (notification.targetType === 'role') {
      // It's a role-based notification. Add user to deletedUsers array.
      if (!notification.deletedUsers) {
        notification.deletedUsers = [];
      }
      if (!notification.deletedUsers.includes(req.user._id)) {
        notification.deletedUsers.push(req.user._id);
        await notification.save();
      }
      
      // Also delete any read-receipt copies created for this user
      await Notification.deleteMany({
        institute: req.user.institute,
        targetType: 'user',
        userId: req.user._id,
        message: notification.message,
        type: notification.type
      });
    } else {
      // It's user-specific. Delete it entirely.
      await Notification.findByIdAndDelete(req.params.id);
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
