import { ScheduledNotification } from '../models/ScheduledNotification.js';

export const createScheduledNotification = async (req, res) => {
  const { title, message, type, scheduledFor } = req.body;
  const institute = req.user.institute;

  if (!institute) {
    return res.status(403).json({ message: 'Forbidden: institute access required' });
  }

  if (!title || !message || !scheduledFor) {
    return res.status(400).json({ message: 'title, message, and scheduledFor are required' });
  }

  try {
    const sched = await ScheduledNotification.create({
      institute,
      title,
      message,
      type: type || 'announcement',
      scheduledFor: new Date(scheduledFor)
    });
    res.status(201).json(sched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getScheduledNotifications = async (req, res) => {
  const institute = req.user.institute;

  if (!institute) {
    return res.status(403).json({ message: 'Forbidden: institute access required' });
  }

  try {
    const list = await ScheduledNotification.find({ institute }).sort({ scheduledFor: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
