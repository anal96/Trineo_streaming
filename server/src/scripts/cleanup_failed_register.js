import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/trineo-stream';

async function cleanup() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Delete institute named "future educity" or with email "future@gmail.com"
    const instResult = await mongoose.connection.db.collection('institutes').deleteMany({
      $or: [
        { name: 'future educity' },
        { email: 'future@gmail.com' },
        { email: 'auyeu76731@minitts.net' }
      ]
    });
    console.log('Deleted institutes count:', instResult.deletedCount);

    // Delete user with email "auyeu76731@minitts.net" or "future@gmail.com"
    const userResult = await mongoose.connection.db.collection('users').deleteMany({
      $or: [
        { email: 'auyeu76731@minitts.net' },
        { email: 'future@gmail.com' }
      ]
    });
    console.log('Deleted users count:', userResult.deletedCount);

  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

cleanup();
