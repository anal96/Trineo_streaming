import mongoose from 'mongoose';
import { PushSubscription } from './PushSubscription.js';
import { User as UserModel } from './User.js';
import { NotificationDelivery } from './NotificationDelivery.js';

const notificationSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // global notifications if null
  },
  title: {
    type: String,
    default: 'Notification'
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'system'
  },
  deletedUsers: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  url: {
    type: String,
    default: ''
  }
});

// Sync read and isRead fields on save
notificationSchema.pre('save', function (next) {
  if (this.isModified('read')) {
    this.isRead = this.read;
  } else if (this.isModified('isRead')) {
    this.read = this.isRead;
  }
  next();
});

notificationSchema.index({ institute: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });


// Model compilation deferred to the end of file after hooks registration

// --- PWA Web Push Integration ---
import webpush from 'web-push';

console.log('[Notification.js] VAPID Key load check. Public key defined:', !!process.env.VAPID_PUBLIC_KEY);
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@trineo.in',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.error('[Notification.js] ERROR: VAPID keys not configured on module load!');
}

const sendPushNotification = async (doc) => {
  console.log('[sendPushNotification] Triggered for:', doc._id, 'Type:', doc.type, 'Msg:', doc.message);
  try {
    const PushSubscriptionModel = mongoose.model('PushSubscription');
    const UserModel = mongoose.model('User');
    const NotificationDeliveryModel = mongoose.model('NotificationDelivery');

    // 1. Identify priority & check if we should send push
    let isPushEnabled = false;
    let category = 'announcement';

    const msg = doc.message.toLowerCase();
    const type = doc.type ? doc.type.toLowerCase() : '';

    if (type === 'security' || msg.includes('security') || msg.includes('locked') || msg.includes('password')) {
      isPushEnabled = true;
      category = 'security';
    } else if (type === 'live_class' || type === 'live-class' || msg.includes('live class') || msg.includes('lecture')) {
      isPushEnabled = true;
      category = 'liveClass';
    } else if (type === 'upload' || msg.includes('uploaded') || msg.includes('material') || msg.includes('video') || type === 'continue_learning') {
      isPushEnabled = true;
      category = 'academic';
    } else if (msg.includes('assigned') || type === 'enrollment') {
      isPushEnabled = true;
      category = 'academic';
    } else if (msg.includes('certificate') && (type === 'completion' || type === 'certificate')) {
      isPushEnabled = true;
      category = 'certificates';
    } else if (type === 'announcement' || type === 'system') {
      isPushEnabled = true;
      category = 'announcement';
    }

    // Low priority / In-App only types:
    // - Lesson completed ("Completed item: ...")
    // - Progress updated
    if (msg.includes('completed item') || type === 'progress' || type === 'lesson_completed') {
      isPushEnabled = false;
    }

    console.log('[sendPushNotification] isPushEnabled:', isPushEnabled, 'category:', category);
    if (!isPushEnabled) return;

    // 2. Determine target user list
    let targetUsers = [];
    if (doc.userId) {
      targetUsers = [doc.userId];
    } else if (doc.institute) {
      // Global notification: get all students in the institute
      const students = await UserModel.find({ institute: doc.institute, role: 'student' }).select('_id notificationPreferences');
      targetUsers = students;
    } else {
      // Global notification across all institutes
      const students = await UserModel.find({ role: 'student' }).select('_id notificationPreferences');
      targetUsers = students;
    }
    console.log('[sendPushNotification] targetUsers length:', targetUsers.length);
    console.log("PUSH TARGET USERS", targetUsers.length);
    console.log("PUSH TITLE", doc.title || 'Trineo Stream Alert');

    // 3. For each user, if preference is enabled, query subscriptions and send push
    for (const userObj of targetUsers) {
      const user = userObj.notificationPreferences ? userObj : await UserModel.findById(userObj._id || userObj);
      if (!user) {
        console.log('[sendPushNotification] user not found for ID:', userObj);
        continue;
      }

      // Check preference toggle
      const isPrefEnabled = user.notificationPreferences?.[category] !== false;
      console.log('[sendPushNotification] user preferences for category', category, 'isPrefEnabled:', isPrefEnabled, user.notificationPreferences);
      if (!isPrefEnabled) continue;

      // Find push subscriptions for this user
      console.log('[sendPushNotification] querying subs for user ID:', user._id);
      const subs = await PushSubscriptionModel.find({ userId: user._id });
      console.log("PUSH SUBSCRIPTIONS", subs.length);
      if (!subs.length) continue;

      // Prepare payload
      const payload = {
        notificationId: doc._id.toString(),
        title: doc.title || 'Trineo Stream Alert',
        body: doc.message,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        url: doc.url || getRoutingUrl(doc)
      };

      for (const sub of subs) {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        // Create delivery tracking record
        const delivery = await NotificationDeliveryModel.create({
          userId: user._id,
          notificationId: doc._id,
          delivered: false,
          clicked: false,
          deviceName: sub.deviceName || ''
        });

        webpush.sendNotification(pushConfig, JSON.stringify(payload))
          .then(async () => {
            console.log("PUSH SENT SUCCESS");
            delivery.delivered = true;
            delivery.deliveredAt = new Date();
            await delivery.save().catch(() => {});
          })
          .catch(async (err) => {
            console.error("PUSH FAILED", err);
            console.error('[WebPush Error]', err.statusCode, err.message);
            if (err.statusCode === 410 || err.statusCode === 404) {
              await PushSubscriptionModel.deleteOne({ _id: sub._id }).catch(() => {});
            }
          });
      }
    }
  } catch (err) {
    console.error('[sendPushNotification Error]', err);
  }
};

function getRoutingUrl(doc) {
  const type = doc.type ? doc.type.toLowerCase() : '';
  const msg = doc.message.toLowerCase();

  if (type === 'live_class' || type === 'live-class' || msg.includes('live class') || msg.includes('lecture')) {
    return '/student?tab=live-classes';
  }
  if (type === 'upload' && (msg.includes('material') || msg.includes('pdf') || msg.includes('note'))) {
    return '/student?tab=materials';
  }
  if (type === 'security') {
    return '/student?tab=security';
  }
  if (msg.includes('certificate')) {
    return '/student?tab=settings';
  }
  return '/student?tab=home';
}

notificationSchema.post('save', function (doc) {
  sendPushNotification(doc);
});

notificationSchema.post('insertMany', function (docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => sendPushNotification(doc));
  }
});

export const Notification = mongoose.model('Notification', notificationSchema);

