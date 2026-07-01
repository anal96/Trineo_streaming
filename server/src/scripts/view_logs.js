import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { SecurityState } from '../models/SecurityState.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', MONGO_URI);

  const logs = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId');

  console.log('\n--- Recent 20 Audit Logs ---');
  logs.forEach((log, index) => {
    console.log(`[${index + 1}] Time: ${log.createdAt.toISOString()}`);
    console.log(`    Event: ${log.eventType}`);
    console.log(`    User: ${log.userId ? log.userId.email : 'N/A'} (Role: ${log.userId ? log.userId.role : 'N/A'})`);
    console.log(`    IP: ${log.ipAddress}`);
    console.log(`    UA: ${log.userAgent}`);
    console.log(`    Details: ${log.details}`);
    console.log('--------------------------------------------------');
  });

  // Query security states as well
  const states = await SecurityState.find({}).populate('userId');
  console.log('\n--- Security States ---');
  states.forEach((state) => {
    console.log(`User: ${state.userId ? state.userId.email : 'N/A'}`);
    console.log(`    Locked: ${state.accountLocked}`);
    console.log(`    PenaltyUntil: ${state.penaltyUntil}`);
    console.log(`    ViolationCount: ${state.violationCount}`);
    console.log(`    ForceLogout: ${state.forceLogout}`);
  });

  process.exit(0);
};

run().catch(console.error);
