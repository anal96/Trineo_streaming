import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { connectDB } from '../config/db.js';

async function migrate() {
  await connectDB();
  console.log('Connected to MongoDB.');

  const usersMigrated = await User.updateMany(
    { syncStatus: '' },
    { $set: { syncStatus: 'pending' } }
  );

  console.log(`Successfully migrated ${usersMigrated.modifiedCount} users with empty syncStatus to 'pending'.`);
  
  await mongoose.connection.close();
  console.log('Connection closed.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
