import { PushSubscription } from '../models/PushSubscription.js';
import { NotificationDelivery } from '../models/NotificationDelivery.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

export const getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(404).json({ message: 'VAPID public key not configured on server' });
    }
    res.json({ publicKey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const subscribePush = async (req, res) => {
  const { endpoint, keys, deviceName } = req.body;
  const userId = req.user._id;

  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ message: 'endpoint, keys.p256dh, and keys.auth are required' });
  }

  try {
    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        deviceName: deviceName || '',
        createdAt: Date.now()
      },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: 'Successfully subscribed to push notifications', subscription });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unsubscribePush = async (req, res) => {
  const { endpoint } = req.body;
  const userId = req.user._id;

  if (!endpoint) {
    return res.status(400).json({ message: 'endpoint is required' });
  }

  try {
    await PushSubscription.deleteOne({ endpoint, userId });
    res.json({ message: 'Successfully unsubscribed from push notifications' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const trackDelivery = async (req, res) => {
  const { notificationId } = req.body;
  const userId = req.user._id;

  if (!notificationId) {
    return res.status(400).json({ message: 'notificationId is required' });
  }

  try {
    const delivery = await NotificationDelivery.findOneAndUpdate(
      { userId, notificationId },
      {
        delivered: true,
        deliveredAt: Date.now()
      },
      { upsert: true, new: true }
    );
    res.json({ message: 'Delivery recorded successfully', delivery });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const trackClick = async (req, res) => {
  const { notificationId } = req.body;
  const userId = req.user._id;

  if (!notificationId) {
    return res.status(400).json({ message: 'notificationId is required' });
  }

  try {
    const delivery = await NotificationDelivery.findOneAndUpdate(
      { userId, notificationId },
      {
        clicked: true,
        clickedAt: Date.now()
      },
      { upsert: true, new: true }
    );
    res.json({ message: 'Click recorded successfully', delivery });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const testPush = async (req, res) => {
  const { userId, email, title, body, type, url } = req.body;
  let targetUserId = userId;

  try {
    // Restrict test-push to administrators/owners
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    if (!targetUserId && email) {
      const filter = req.user.role === 'owner' ? { email } : { email, institute: req.user.institute };
      const user = await User.findOne(filter);
      if (user) {
        targetUserId = user._id;
      } else {
        return res.status(404).json({ message: `User with email "${email}" not found.` });
      }
    }

    if (!targetUserId) {
      targetUserId = req.user._id;
    } else if (req.user.role !== 'owner') {
      const targetUserObj = await User.findOne({ _id: targetUserId, institute: req.user.institute });
      if (!targetUserObj) {
        return res.status(403).json({ message: 'Forbidden: Target user belongs to another institute' });
      }
    }

    const notification = await Notification.create({
      userId: targetUserId,
      targetType: 'user',
      title: title || 'Trineo Stream Test',
      message: body || 'Push notifications are working',
      type: type || 'system',
      url: url || ''
    });

    res.json({
      message: 'Test push triggered successfully',
      notificationId: notification._id,
      userId: targetUserId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
