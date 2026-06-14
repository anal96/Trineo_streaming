import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { connectDB } from '../config/db.js';

async function checkUsers() {
  await connectDB();
  console.log('Connected to MongoDB.');

  const total = await User.countDocuments({});
  const emptyString = await User.countDocuments({ syncStatus: '' });
  const pending = await User.countDocuments({ syncStatus: 'pending' });
  const success = await User.countDocuments({ syncStatus: 'success' });
  const failed = await User.countDocuments({ syncStatus: 'failed' });
  const notExists = await User.countDocuments({ syncStatus: { $exists: false } });

  console.log(`Total users: ${total}`);
  console.log(`Users with syncStatus = '': ${emptyString}`);
  console.log(`Users with syncStatus = 'pending': ${pending}`);
  console.log(`Users with syncStatus = 'success': ${success}`);
  console.log(`Users with syncStatus = 'failed': ${failed}`);
  console.log(`Users missing syncStatus field: ${notExists}`);

  if (emptyString > 0) {
    console.log('\nUsers with empty string syncStatus:');
    const users = await User.find({ syncStatus: '' }).select('email name role syncStatus');
    users.forEach(u => console.log(`- ${u.name} (${u.email}) [role: ${u.role}]`));
  }

  await mongoose.connection.close();
}

checkUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
