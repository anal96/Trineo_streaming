import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config();

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';

console.log('Connecting to:', mongoUri);

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // Define schema dynamically to avoid import issues
    const schema = new mongoose.Schema({}, { strict: false, collection: 'notifications' });
    const Notification = mongoose.model('Notification', schema);

    const counts = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\nNotification counts grouped by type:');
    console.log(JSON.stringify(counts, null, 2));

    const total = await Notification.countDocuments();
    console.log('\nTotal notifications:', total);

    // Get a sample of each type
    for (const c of counts) {
      const sample = await Notification.findOne({ type: c._id });
      console.log(`\nSample document for type "${c._id}":`);
      console.log(JSON.stringify(sample, null, 2));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
