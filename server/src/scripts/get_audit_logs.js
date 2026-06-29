import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AuditLog } from '../models/AuditLog.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', MONGO_URI);

  const logs = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('userId');

  console.log('\n--- Latest 30 Audit Logs ---');
  logs.forEach((log, index) => {
    console.log(`[${index + 1}] Time: ${log.createdAt.toISOString()}`);
    console.log(`    Event: ${log.eventType}`);
    console.log(`    User: ${log.userId ? log.userId.email : 'N/A'} (ID: ${log.userId ? log.userId._id : 'N/A'})`);
    console.log(`    IP: ${log.ipAddress}`);
    console.log(`    UA: ${log.userAgent}`);
    console.log(`    Details: ${log.details}`);
    console.log('--------------------------------------------------');
  });

  process.exit(0);
};

run().catch(console.error);
