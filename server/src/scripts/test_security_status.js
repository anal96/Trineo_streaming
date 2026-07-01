import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', MONGO_URI);

  const user = await User.findOne({ email: 'toedm86861@minitts.net' });
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  console.log('Found user:', user.email, 'Role:', user.role, 'Status:', user.status);

  // Generate a valid JWT token for the user
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'trineo_stream_premium_saas_crm_lms_secret_key_2026_xyz',
    { expiresIn: '30d' }
  );

  // Update their active session token in the DB to match this token, to pass the one-device check
  user.activeSessionToken = token;
  await user.save();
  console.log('Saved activeSessionToken to DB matching the new JWT.');

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

  console.log('Making request to /api/security/status...');
  try {
    const res = await fetch('http://127.0.0.1:5000/api/security/status', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': userAgent
      }
    });

    console.log('Response status:', res.status);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Request failed:', err);
  }

  process.exit(0);
};

run().catch(console.error);
