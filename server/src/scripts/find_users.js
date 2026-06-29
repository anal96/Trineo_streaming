import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', MONGO_URI);

  const users = await User.find({});
  console.log('\n--- Users list ---');
  users.forEach(u => {
    console.log(`Email: ${u.email}, Role: ${u.role}, Status: ${u.status}`);
  });

  process.exit(0);
};

run().catch(console.error);
