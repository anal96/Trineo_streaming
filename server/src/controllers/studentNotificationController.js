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
      $or: [{ userId: req.user._id }, { userId: null }]
    }).sort({ createdAt: -1 }).limit(200);
    const unreadCount = notifications.filter((n) => !n.read && String(n.userId || '') === String(req.user._id)).length;
    res.json({ notifications, unreadCount });
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
    const globals = await Notification.find({ institute: req.user.institute, userId: null }).select('message type');
    const existingRead = await Notification.find({ institute: req.user.institute, userId: req.user._id, read: true }).select('message type');
    const existingSet = new Set(existingRead.map((n) => `${n.type}::${n.message}`));
    const inserts = globals
      .filter((g) => !existingSet.has(`${g.type}::${g.message}`))
      .map((g) => ({ institute: req.user.institute, userId: req.user._id, message: g.message, type: g.type, read: true }));
    if (inserts.length) await Notification.insertMany(inserts);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStudentNotification = async (req, res) => {
  try {
    if (!requireStudentInstitute(req, res)) return;
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      institute: req.user.institute,
      userId: req.user._id
    });
    if (!deleted) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
