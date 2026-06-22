import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { Notification } from '../models/Notification.js';
import { NotificationDelivery } from '../models/NotificationDelivery.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';

const testFlow = async () => {
  try {
    console.log('Connecting to MongoDB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);

    // 1. Find or create a test student user
    let user = await User.findOne({ role: 'student' });
    if (!user) {
      console.log('No student user found. Seeding a test student...');
      user = await User.create({
        name: 'Test Student',
        email: 'test_student@example.com',
        password: 'password123',
        role: 'student',
        user_id: 123456,
        notificationPreferences: {
          academic: true,
          liveClass: true,
          security: true,
          announcement: true,
          certificates: true
        }
      });
    } else {
      console.log(`Found student user: ${user.email} (ID: ${user.user_id})`);
      // Update preferences to include certificates if not set
      if (user.notificationPreferences?.certificates === undefined) {
        user.notificationPreferences.certificates = true;
        await user.save();
        console.log('Updated user notification preferences with certificates: true');
      }
    }

    // 2. Ensure test student has a mock PushSubscription
    let sub = await PushSubscription.findOne({ userId: user._id });
    if (!sub) {
      console.log('Creating a mock push subscription for the user...');
      sub = await PushSubscription.create({
        userId: user._id,
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABm...',
        p256dh: 'BKapQ...',
        auth: 'yR0...',
        deviceName: 'Test Windows PC'
      });
      console.log('Seeded mock PushSubscription:', sub);
    } else {
      console.log('Found existing PushSubscription:', sub);
    }

    // 3. Trigger manual push trigger (academic/certificate)
    console.log('\nCreating a test Certificate Available notification (type: completion)...');
    const doc = await Notification.create({
      userId: user._id,
      title: 'Certificate Available',
      message: 'Congratulations! Your certificate is available for download.',
      type: 'completion'
    });

    console.log('Notification created successfully. ID:', doc._id);

    // Wait a brief moment for the post('save') hook promise to settle (since it runs async in backend)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Verify NotificationDelivery logging was populated
    const deliveries = await NotificationDelivery.find({ notificationId: doc._id });
    console.log('\n=======================================');
    console.log('NotificationDelivery log results:');
    console.log(deliveries);
    console.log('=======================================\n');

    if (deliveries.length > 0) {
      console.log('SUCCESS: NotificationDelivery logs populated correctly.');
    } else {
      console.log('WARNING: No NotificationDelivery logs found. Check post-save hooks.');
    }

  } catch (err) {
    console.error('Flow test failed with error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

testFlow();
