import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { SecurityState } from '../models/SecurityState.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const email = 'ananloseph9744@gmail.com';
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User ${email} not found.`);
      process.exit(1);
    }

    user.status = 'active';
    user.activeSessionToken = '';
    await user.save();
    console.log(`User ${email} status set to active.`);

    const state = await SecurityState.findOne({ userId: user._id });
    if (state) {
      state.violationCount = 0;
      state.penaltyUntil = null;
      state.forceLogout = false;
      state.accountLocked = false;
      await state.save();
      console.log('SecurityState reset successfully:', state);
    } else {
      console.log('No SecurityState record found for user.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
