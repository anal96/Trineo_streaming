import mongoose from 'mongoose';
import { User } from './src/models/User.js';
import { Course } from './src/models/Course.js';
import { Purchase } from './src/models/Purchase.js';
import { WatchHistory } from './src/models/WatchHistory.js';
import { Notification } from './src/models/Notification.js';
import { AuditLog } from './src/models/AuditLog.js';
import { SecurityEvent } from './src/models/SecurityEvent.js';
import { LiveClass } from './src/models/LiveClass.js';
import { VideoAsset } from './src/models/VideoAsset.js';
import { Payment } from './src/models/Payment.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';

const findStage = (explainPlan, stageName) => {
  if (!explainPlan) return false;
  
  // Recursively search stages for COLLSCAN or IXSCAN
  const searchInputStage = (stage) => {
    if (!stage) return null;
    if (stage.stage === stageName) return stage;
    if (stage.inputStage) {
      return searchInputStage(stage.inputStage);
    }
    if (stage.inputStages) {
      for (const input of stage.inputStages) {
        const found = searchInputStage(input);
        if (found) return found;
      }
    }
    return null;
  };

  const queryPlanner = explainPlan.queryPlanner || {};
  const winningPlan = queryPlanner.winningPlan || {};
  return searchInputStage(winningPlan);
};

const runExplainAudit = async () => {
  console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected successfully. Syncing indexes... ');
  
  // Ensure indexes are built
  await Promise.all([
    User.ensureIndexes(),
    Course.ensureIndexes(),
    Purchase.ensureIndexes(),
    WatchHistory.ensureIndexes(),
    Notification.ensureIndexes(),
    AuditLog.ensureIndexes(),
    SecurityEvent.ensureIndexes(),
    LiveClass.ensureIndexes(),
    VideoAsset.ensureIndexes(),
    Payment.ensureIndexes()
  ]);
  console.log('Indexes synced successfully. Starting explain audits...\n');

  const dummyId = new mongoose.Types.ObjectId();

  const testQueries = [
    {
      name: 'User.find (by role and institute)',
      model: User,
      query: User.find({ role: 'student', institute: dummyId })
    },
    {
      name: 'User.find (by status)',
      model: User,
      query: User.find({ status: 'active' })
    },
    {
      name: 'User.find (by createdAt)',
      model: User,
      query: User.find({}).sort({ createdAt: -1 })
    },
    {
      name: 'Course.find (by status)',
      model: Course,
      query: Course.find({ status: 'active' })
    },
    {
      name: 'Course.find (by createdAt)',
      model: Course,
      query: Course.find({}).sort({ createdAt: -1 })
    },
    {
      name: 'VideoAsset.find (by courseId)',
      model: VideoAsset,
      query: VideoAsset.find({ courseId: dummyId })
    },
    {
      name: 'VideoAsset.find (by uploadStatus)',
      model: VideoAsset,
      query: VideoAsset.find({ uploadStatus: 'ready' })
    },
    {
      name: 'Notification.find (by userId and createdAt)',
      model: Notification,
      query: Notification.find({ userId: dummyId }).sort({ createdAt: -1 })
    },
    {
      name: 'Payment.find (by studentId)',
      model: Payment,
      query: Payment.find({ studentId: dummyId })
    },
    {
      name: 'Payment.find (by status)',
      model: Payment,
      query: Payment.find({ status: 'pending' })
    },
    {
      name: 'LiveClass.find (by status)',
      model: LiveClass,
      query: LiveClass.find({ status: 'upcoming' })
    },
    {
      name: 'WatchHistory.find (by studentId)',
      model: WatchHistory,
      query: WatchHistory.find({ studentId: dummyId })
    },
    {
      name: 'WatchHistory.find (by lastWatchedAt)',
      model: WatchHistory,
      query: WatchHistory.find({}).sort({ lastWatchedAt: -1 })
    }
  ];

  console.log('| Query Target | Result Stage | Details |');
  console.log('| --- | --- | --- |');

  for (const t of testQueries) {
    try {
      const explain = await t.query.explain('executionStats');
      const ixScanStage = findStage(explain, 'IXSCAN');
      const collScanStage = findStage(explain, 'COLLSCAN');

      if (ixScanStage) {
        console.log(`| ${t.name} | **IXSCAN** (Success) | Index: ${JSON.stringify(ixScanStage.keyPattern)} |`);
      } else if (collScanStage) {
        console.log(`| ${t.name} | **COLLSCAN** (Missing Index) | Table scan detected! |`);
      } else {
        console.log(`| ${t.name} | Unknown | Check query plan structure |`);
      }
    } catch (err) {
      console.log(`| ${t.name} | ERROR | Failed: ${err.message} |`);
    }
  }

  console.log('\nAudit complete. Exiting...');
  await mongoose.disconnect();
  process.exit(0);
};

runExplainAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
