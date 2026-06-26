import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { registerFCM } from '../src/controllers/pushController.js';
import { User } from '../src/models/User.js';
import { PushSubscription } from '../src/models/PushSubscription.js';
import { Notification, sendPushNotification } from '../src/models/Notification.js';
import { NotificationDelivery } from '../src/models/NotificationDelivery.js';
import { setMockSendFn } from '../src/services/firebaseService.js';
import webpush from 'web-push';

const makeResponse = () => {
  const state = {
    statusCode: 200,
    body: undefined
  };

  const res = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(payload) {
      state.body = payload;
      return res;
    }
  };

  return { res, state };
};

const withMocks = async (mocks, fn) => {
  const originals = [];
  for (const m of mocks) {
    originals.push({ target: m.target, method: m.method, original: m.target[m.method] });
    m.target[m.method] = m.impl;
  }
  try {
    return await fn();
  } finally {
    for (const orig of originals) {
      orig.target[orig.method] = orig.original;
    }
  }
};

test('Firebase Cloud Messaging (FCM) Integration Tests', async (t) => {

  await t.test('POST /api/push/fcm/register - requires token', async () => {
    const req = {
      body: {},
      user: { _id: 'user-123' }
    };
    const { res, state } = makeResponse();

    await registerFCM(req, res);

    assert.equal(state.statusCode, 400);
    assert.equal(state.body.message, 'token is required');
  });

  await t.test('POST /api/push/fcm/register - registers token and disassociates duplicates', async () => {
    let updateManyFilter = null;
    let updateManyUpdate = null;
    let savedUser = null;

    const mockUser = {
      _id: 'user-123',
      fcmToken: '',
      devicePlatform: '',
      deviceName: '',
      appVersion: '',
      osVersion: '',
      fcmUpdatedAt: null,
      save: function() {
        savedUser = this;
        return Promise.resolve(this);
      }
    };

    const mocks = [
      {
        target: User,
        method: 'updateMany',
        impl: (filter, update) => {
          updateManyFilter = filter;
          updateManyUpdate = update;
          return Promise.resolve({ modifiedCount: 1 });
        }
      },
      {
        target: User,
        method: 'findById',
        impl: (id) => {
          assert.equal(id, 'user-123');
          return Promise.resolve(mockUser);
        }
      }
    ];

    await withMocks(mocks, async () => {
      const req = {
        body: {
          token: 'fcm-token-999',
          platform: 'android',
          deviceName: 'Pixel 6',
          appVersion: '1.2.0',
          osVersion: 'Android 13'
        },
        user: { _id: 'user-123' }
      };
      const { res, state } = makeResponse();

      await registerFCM(req, res);

      assert.equal(state.statusCode, 200);
      assert.equal(state.body.message, 'FCM token registered successfully');

      // Verify that this token was cleared from other users
      assert.deepEqual(updateManyFilter, { fcmToken: 'fcm-token-999', _id: { $ne: 'user-123' } });
      assert.equal(updateManyUpdate.$set.fcmToken, '');

      // Verify current user details were updated
      assert.ok(savedUser);
      assert.equal(savedUser.fcmToken, 'fcm-token-999');
      assert.equal(savedUser.devicePlatform, 'android');
      assert.equal(savedUser.deviceName, 'Pixel 6');
      assert.equal(savedUser.appVersion, '1.2.0');
      assert.equal(savedUser.osVersion, 'Android 13');
      assert.ok(savedUser.fcmUpdatedAt instanceof Date);
    });
  });

  await t.test('Notification save hook - sends FCM when user has fcmToken', async () => {
    let fcmPayload = null;
    let deliveryRecord = null;

    const mockNotificationDoc = {
      _id: new mongoose.Types.ObjectId(),
      userId: 'user-456',
      title: 'Course Update',
      message: 'New video added in React Course',
      type: 'academic',
      url: '/student?tab=materials',
      courseId: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      targetType: 'user'
    };

    const mockUser = {
      _id: 'user-456',
      fcmToken: 'fcm-token-abc',
      deviceName: 'My Device',
      notificationPreferences: {
        academic: true
      }
    };

    const mocks = [
      {
        target: User,
        method: 'findById',
        impl: () => Promise.resolve(mockUser)
      },
      {
        target: NotificationDelivery,
        method: 'create',
        impl: (data) => {
          deliveryRecord = { ...data, save: () => Promise.resolve() };
          return Promise.resolve(deliveryRecord);
        }
      }
    ];

    setMockSendFn((payload) => {
      fcmPayload = payload;
      return Promise.resolve('message-id-123');
    });

    try {
      await withMocks(mocks, async () => {
        await sendPushNotification(mockNotificationDoc);
        await new Promise(resolve => setTimeout(resolve, 30));

        // Verify FCM payload format and presence of all required metadata fields
        assert.ok(fcmPayload);
        assert.equal(fcmPayload.token, 'fcm-token-abc');
        assert.equal(fcmPayload.notification.title, 'Course Update');
        assert.equal(fcmPayload.notification.body, 'New video added in React Course');
        
        assert.equal(fcmPayload.data.title, 'Course Update');
        assert.equal(fcmPayload.data.body, 'New video added in React Course');
        assert.equal(fcmPayload.data.url, '/student?tab=materials');
        assert.equal(fcmPayload.data.notificationId, mockNotificationDoc._id.toString());
        assert.equal(fcmPayload.data.courseId, mockNotificationDoc.courseId.toString());
        assert.equal(fcmPayload.data.type, 'academic');
        assert.equal(fcmPayload.data.timestamp, mockNotificationDoc.createdAt.toISOString());
        assert.equal(fcmPayload.data.icon, '/icons/icon-192.png');

        // Verify delivery record creation
        assert.ok(deliveryRecord);
        assert.equal(deliveryRecord.userId, 'user-456');
        assert.equal(deliveryRecord.notificationId, mockNotificationDoc._id);
        assert.equal(deliveryRecord.deviceName, 'My Device');
      });
    } finally {
      setMockSendFn(null);
    }
  });

  await t.test('Notification save hook - cleans up FCM token on Unregistered error', async () => {
    let userUpdateFilter = null;
    let userUpdateSet = null;

    const mockNotificationDoc = {
      _id: new mongoose.Types.ObjectId(),
      userId: 'user-789',
      title: 'Alert',
      message: 'Failed to sync',
      type: 'system',
      targetType: 'user'
    };

    const mockUser = {
      _id: 'user-789',
      fcmToken: 'invalid-fcm-token',
      notificationPreferences: {
        announcement: true
      }
    };

    const mocks = [
      {
        target: User,
        method: 'findById',
        impl: () => Promise.resolve(mockUser)
      },
      {
        target: NotificationDelivery,
        method: 'create',
        impl: (data) => Promise.resolve({ ...data, save: () => Promise.resolve() })
      },
      {
        target: User,
        method: 'updateOne',
        impl: (filter, update) => {
          userUpdateFilter = filter;
          userUpdateSet = update.$set;
          return Promise.resolve({ modifiedCount: 1 });
        }
      }
    ];

    setMockSendFn(() => {
      const error = new Error('Requested entity was not found.');
      error.code = 'messaging/registration-token-not-registered';
      return Promise.reject(error);
    });

    try {
      await withMocks(mocks, async () => {
        await sendPushNotification(mockNotificationDoc);
        await new Promise(resolve => setTimeout(resolve, 30));

        // Verify token disassociation cleanup was triggered for user-789
        assert.ok(userUpdateFilter);
        assert.equal(userUpdateFilter._id, 'user-789');
        assert.equal(userUpdateSet.fcmToken, '');
        assert.equal(userUpdateSet.devicePlatform, '');
        assert.equal(userUpdateSet.deviceName, '');
        assert.equal(userUpdateSet.fcmUpdatedAt, null);
      });
    } finally {
      setMockSendFn(null);
    }
  });

  await t.test('Notification save hook - falls back to VAPID Web Push when fcmToken is empty', async () => {
    let pushSubscriptionQueried = false;
    let webPushSent = false;

    const mockNotificationDoc = {
      _id: new mongoose.Types.ObjectId(),
      userId: 'user-222',
      title: 'VAPID Alert',
      message: 'This uses Web Push',
      type: 'system',
      targetType: 'user'
    };

    const mockUser = {
      _id: 'user-222',
      fcmToken: '', // No FCM token
      notificationPreferences: {
        announcement: true
      }
    };

    const mocks = [
      {
        target: User,
        method: 'findById',
        impl: () => Promise.resolve(mockUser)
      },
      {
        target: PushSubscription,
        method: 'find',
        impl: (query) => {
          assert.equal(query.userId, 'user-222');
          pushSubscriptionQueried = true;
          return Promise.resolve([
            {
              endpoint: 'https://updates.push.services.mozilla.com/push/v1/sub',
              p256dh: 'p256dh-key',
              auth: 'auth-key',
              deviceName: 'Firefox Browser'
            }
          ]);
        }
      },
      {
        target: NotificationDelivery,
        method: 'create',
        impl: (data) => Promise.resolve({ ...data, save: () => Promise.resolve() })
      },
      {
        target: webpush,
        method: 'sendNotification',
        impl: (config, payloadStr) => {
          webPushSent = true;
          const payload = JSON.parse(payloadStr);
          assert.equal(payload.title, 'VAPID Alert');
          assert.equal(payload.body, 'This uses Web Push');
          return Promise.resolve({});
        }
      }
    ];

    await withMocks(mocks, async () => {
      await sendPushNotification(mockNotificationDoc);
      await new Promise(resolve => setTimeout(resolve, 30));

      // Verify VAPID push was queried and dispatched
      assert.ok(pushSubscriptionQueried);
      assert.ok(webPushSent);
    });
  });
});
