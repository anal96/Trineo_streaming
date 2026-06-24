import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Institute } from '../src/models/Institute.js';

async function run() {
  await connectDB();
  console.log('Connected to database.');

  const user = await User.findOne({ email: 'ananloseph9744@gmail.com' });
  if (!user) {
    console.error('User not found in database.');
    mongoose.connection.close();
    return;
  }

  const inst = await Institute.findById(user.institute);

  console.log('User profile in database:', {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    studentId: user.studentId,
    institute: inst ? { _id: inst._id, name: inst.name, status: inst.status } : null
  });

  mongoose.connection.close();
}

run().catch(console.error);
