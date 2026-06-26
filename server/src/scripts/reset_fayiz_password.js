import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', MONGO_URI);

  const student = await User.findOne({ email: /fayiz/i });
  if (!student) {
    console.log('Student Fayiz not found!');
  } else {
    student.password = 'student123';
    await student.save();
    console.log('Password reset for Fayiz successfully!');
  }
  process.exit(0);
};

run().catch(console.error);
