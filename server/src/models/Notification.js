import mongoose from 'mongoose';
import { PushSubscription } from './PushSubscription.js';
import { User as UserModel } from './User.js';
import { NotificationDelivery } from './NotificationDelivery.js';
import { sendFCMNotification } from '../services/firebaseService.js';

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
    default: null
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    default: null,
    index: true
  },
  // --- Explicit targeting fields ---
  targetType: {
    type: String,
    enum: ['user', 'role', 'broadcast'],
    default: 'user'
  },
  targetRole: {
    type: String,
    enum: ['student', 'faculty', 'admin', 'owner'],
    required: false
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
notificationSchema.index({ institute: 1, targetType: 1, targetRole: 1, createdAt: -1 });


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

/**
 * Resolve push notification recipients based on explicit target metadata.
 *
 * targetType: 'user'      -> push only to doc.userId
 * targetType: 'role'      -> push to all users with role=doc.targetRole in doc.institute
 * targetType: 'broadcast' -> push to owner users only (platform-level alerts)
 */
export const sendPushNotification = async (doc) => {
  console.log('[sendPushNotification] Triggered for:', doc._id, 'Type:', doc.type, 'TargetType:', doc.targetType, 'TargetRole:', doc.targetRole);
  try {
    const PushSubscriptionModel = mongoose.model('PushSubscription');
    const UserModelRef = mongoose.model('User');
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
    if (msg.includes('completed item') || type === 'progress' || type === 'lesson_completed') {
      isPushEnabled = false;
    }

    console.log('[sendPushNotification] isPushEnabled:', isPushEnabled, 'category:', category);
    if (!isPushEnabled) return;

    // 2. Resolve recipients based on explicit target metadata
    let targetUsers = [];
    const tType = doc.targetType || 'user';

    if (tType === 'user') {
      // Personal notification — push to the specific user only
      if (doc.userId) {
        targetUsers = [doc.userId];
      } else {
        // Legacy fallback: userId is null with no targetType — skip push entirely
        console.log('[sendPushNotification] targetType=user but no userId, skipping push.');
        return;
      }
    } else if (tType === 'role') {
      // Role-based notification — push to all users with matching role in the institute
      if (!doc.targetRole) {
        console.log('[sendPushNotification] targetType=role but no targetRole set, skipping push.');
        return;
      }
      const filter = { role: doc.targetRole };
      if (doc.institute) {
        filter.institute = doc.institute;
      }
      const users = await UserModelRef.find(filter).select('_id notificationPreferences fcmToken deviceName');
      targetUsers = users;
    } else if (tType === 'broadcast') {
      // Platform-level broadcast — only push to owners
      const owners = await UserModelRef.find({ role: 'owner' }).select('_id notificationPreferences fcmToken deviceName');
      targetUsers = owners;
    }

    console.log('[sendPushNotification] targetUsers length:', targetUsers.length);

    // 3. For each user, if preference is enabled, query subscriptions and send push
    for (const userObj of targetUsers) {
      const user = userObj.notificationPreferences ? userObj : await UserModelRef.findById(userObj._id || userObj);
      if (!user) {
        console.log('[sendPushNotification] user not found for ID:', userObj);
        continue;
      }

      // Check preference toggle
      const isPrefEnabled = user.notificationPreferences?.[category] !== false;
      if (!isPrefEnabled) continue;

      if (user.fcmToken) {
        console.log(`[FCM SEND]\nUser: ${user._id}\nHas Token: true\nToken Length: ${user.fcmToken.length}`);
        // Build the FCM payload
        const fcmPayload = {
          token: user.fcmToken,
          notification: {
            title: doc.title || 'Trineo Stream Alert',
            body: doc.message
          },
          data: {
            title: doc.title || 'Trineo Stream Alert',
            body: doc.message,
            icon: '/icons/icon-192.png',
            image: doc.image || '',
            url: doc.url || getRoutingUrl(doc),
            notificationId: doc._id.toString(),
            courseId: doc.courseId ? doc.courseId.toString() : '',
            type: doc.type || 'system',
            timestamp: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString()
          }
        };

        if (doc.image) {
          fcmPayload.notification.imageUrl = doc.image;
        }

        // Create delivery tracking record
        const delivery = await NotificationDeliveryModel.create({
          userId: user._id,
          notificationId: doc._id,
          delivered: false,
          clicked: false,
          deviceName: user.deviceName || 'Android Device'
        });

        sendFCMNotification(fcmPayload)
          .then(async () => {
            delivery.delivered = true;
            delivery.deliveredAt = new Date();
            await delivery.save().catch(() => {});
          })
          .catch(async (err) => {
            console.error('[FCM Error]', err);
            const code = err.code || '';
            const message = err.message || '';
            const invalidCodes = [
              'messaging/registration-token-not-registered',
              'messaging/invalid-argument',
              'messaging/invalid-registration-token'
            ];
            const lowerMessage = message.toLowerCase();

            if (
              invalidCodes.includes(code) ||
              lowerMessage.includes('unregistered') ||
              lowerMessage.includes('invalid registration token') ||
              lowerMessage.includes('token not registered') ||
              lowerMessage.includes('registration-token-not-registered')
            ) {
              console.log(`[FCM Cleanup] Removing invalid FCM token for user ${user._id}`);
              await UserModelRef.updateOne(
                { _id: user._id },
                {
                  $set: {
                    fcmToken: '',
                    devicePlatform: '',
                    deviceName: '',
                    appVersion: '',
                    osVersion: '',
                    fcmUpdatedAt: null
                  }
                }
              ).catch((e) => console.error('[FCM Cleanup Error]', e));
            }
          });
      } else {
        console.log('No FCM token found for user.');
        // Find push subscriptions for this user
        const subs = await PushSubscriptionModel.find({ userId: user._id });
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
              delivery.delivered = true;
              delivery.deliveredAt = new Date();
              await delivery.save().catch(() => {});
            })
            .catch(async (err) => {
              console.error('[WebPush Error]', err.statusCode, err.message);
              if (err.statusCode === 410 || err.statusCode === 404) {
                await PushSubscriptionModel.deleteOne({ _id: sub._id }).catch(() => {});
              }
            });
        }
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
