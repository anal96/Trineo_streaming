import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', MONGO_URI);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Password123', salt);

  const res = await User.updateOne(
    { email: 'noel@gmail.com' },
    { $set: { password: hashedPassword } }
  );

  console.log('Update result:', res);
  process.exit(0);
};

run().catch(console.error);
