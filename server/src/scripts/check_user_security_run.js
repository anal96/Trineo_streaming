import mongoose from 'mongoose';
import { SecurityState } from '../models/SecurityState.js';
import { User } from '../models/User.js';

const MONGO_URI = 'mongodb://127.0.0.1:27017/eduverse';

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const users = await User.find({}).limit(20);
  console.log('Users in DB:', users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));

  for (const u of users) {
    const state = await SecurityState.findOne({ userId: u._id });
    console.log(`SecurityState for ${u.email}:`, state);
  }

  await mongoose.connection.close();
}

check().catch(console.error);
