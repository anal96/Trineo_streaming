import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  try {
    console.log('Connecting to MongoDB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    
    const adminEmail = 'admin@institute.com';
    const user = await User.findOne({ email: adminEmail });
    
    if (!user) {
      console.log(`User ${adminEmail} not found!`);
      const allUsers = await User.find().select('name email role status');
      console.log('All Users in DB:', allUsers);
    } else {
      console.log('Found Admin User:', {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      });
      
      if (user.status !== 'active') {
        user.status = 'active';
        await user.save();
        console.log(`Successfully activated user ${adminEmail}!`);
      } else {
        console.log(`User ${adminEmail} is already active.`);
      }
    }
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();
