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
    const notifications = await Notification.find({
      institute: req.user.institute,
      $or: [{ userId: req.user._id }, { userId: null }],
      deletedUsers: { $ne: req.user._id }
    }).sort({ createdAt: -1 }).limit(200);

    const merged = [];
    const readGlobalMessages = new Set();
    
    // Group read status of global notifications
    notifications.forEach(n => {
      if (n.userId && n.read) {
        readGlobalMessages.add(`${n.type}::${n.message}`);
      }
    });

    notifications.forEach(n => {
      if (n.userId === null) {
        // Global notification
        const isRead = readGlobalMessages.has(`${n.type}::${n.message}`);
        merged.push({
          ...n.toObject(),
          read: isRead
        });
      } else {
        // User-specific notification
        // Filter out read/unread copies created from globals to prevent duplicates
        const isGlobalCopy = notifications.some(g => g.userId === null && g.message === n.message && g.type === n.type);
        if (!isGlobalCopy) {
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
      $or: [{ userId: req.user._id }, { userId: null }]
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (notification.userId === null) {
      await Notification.create({
        institute: req.user.institute,
        userId: req.user._id,
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
    await Notification.updateMany({ institute: req.user.institute, userId: req.user._id, read: false }, { $set: { read: true } });
    
    const globals = await Notification.find({ 
      institute: req.user.institute, 
      userId: null,
      deletedUsers: { $ne: req.user._id }
    }).select('message type');
    
    const existingRead = await Notification.find({ institute: req.user.institute, userId: req.user._id, read: true }).select('message type');
    const existingSet = new Set(existingRead.map((n) => `${n.type}::${n.message}`));
    const inserts = globals
      .filter((g) => !existingSet.has(`${g.type}::${g.message}`))
      .map((g) => ({ 
        institute: req.user.institute, 
        userId: req.user._id, 
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
    
    if (notification.userId === null) {
      // It's a global notification. Add user to deletedUsers array.
      if (!notification.deletedUsers) {
        notification.deletedUsers = [];
      }
      if (!notification.deletedUsers.includes(req.user._id)) {
        notification.deletedUsers.push(req.user._id);
        await notification.save();
      }
      
      // Also delete any read copies created for this user
      await Notification.deleteMany({
        institute: req.user.institute,
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
