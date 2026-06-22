import 'dotenv/config';
import mongoose from 'mongoose';
import { PushSubscription } from '../models/PushSubscription.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';

const checkAndCleanSubscriptions = async () => {
  try {
    console.log('Connecting to MongoDB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);

    const subscriptions = await PushSubscription.find({});
    console.log(`\nFound ${subscriptions.length} total subscriptions in database:`);

    let deletedCount = 0;
    for (const sub of subscriptions) {
      console.log(`\nSubscription ID: ${sub._id}`);
      console.log(`User ID: ${sub.userId}`);
      console.log(`Device: ${sub.deviceName}`);
      console.log(`Endpoint: ${sub.endpoint ? sub.endpoint.substring(0, 50) + '...' : 'none'}`);
      console.log(`p256dh length: ${sub.p256dh ? sub.p256dh.length : 0} (value: ${sub.p256dh})`);
      console.log(`auth length: ${sub.auth ? sub.auth.length : 0} (value: ${sub.auth})`);

      // If lengths are too short (real p256dh is ~87+ chars, real auth is ~22+ chars)
      if (!sub.p256dh || sub.p256dh.length < 40 || !sub.auth || sub.auth.length < 15) {
        console.log('❌ Invalid/dummy subscription detected. Deleting...');
        await PushSubscription.deleteOne({ _id: sub._id });
        deletedCount++;
      } else {
        console.log('✅ Valid subscription format.');
      }
    }

    console.log(`\nCleanup complete. Deleted ${deletedCount} invalid subscriptions.`);

  } catch (err) {
    console.error('Error checking subscriptions:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

checkAndCleanSubscriptions();
