import 'dotenv/config';
import { connectDB } from '../src/config/db.js';
import { Lesson } from '../src/models/Lesson.js';
import { WatchHistory } from '../src/models/WatchHistory.js';
import { Purchase } from '../src/models/Purchase.js';
import { Payment } from '../src/models/Payment.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { VideoUploadJob } from '../src/models/VideoUploadJob.js';
import { TranscodingJob } from '../src/models/TranscodingJob.js';
import { Notification } from '../src/models/Notification.js';
import { Course } from '../src/models/Course.js';
import { User } from '../src/models/User.js';
import { pathToFileURL } from 'node:url';

export const runTenantBackfill = async () => {
  await connectDB();

  const lessons = await Lesson.find({ $or: [{ institute: null }, { institute: { $exists: false } }] });
  for (const lesson of lessons) {
    const course = await Course.findById(lesson.courseId).select('institute');
    if (course?.institute) {
      lesson.institute = course.institute;
      await lesson.save();
    }
  }

  const watchHistory = await WatchHistory.find({ $or: [{ institute: null }, { institute: { $exists: false } }] });
  for (const item of watchHistory) {
    const lesson = await Lesson.findById(item.lessonId).select('institute courseId');
    if (lesson?.institute) {
      item.institute = lesson.institute;
      await item.save();
    }
  }

  const purchases = await Purchase.find({ $or: [{ institute: null }, { institute: { $exists: false } }] });
  for (const item of purchases) {
    const course = await Course.findById(item.courseId).select('institute');
    if (course?.institute) {
      item.institute = course.institute;
      await item.save();
    }
  }

  const payments = await Payment.find({ $or: [{ institute: null }, { institute: { $exists: false } }] });
  for (const item of payments) {
    const purchase = await Purchase.findById(item.purchaseId).select('institute courseId');
    if (purchase?.institute) {
      item.institute = purchase.institute;
      await item.save();
      continue;
    }
    const course = purchase?.courseId ? await Course.findById(purchase.courseId).select('institute') : null;
    if (course?.institute) {
      item.institute = course.institute;
      await item.save();
    }
  }

  const logs = await AuditLog.find({ $or: [{ institute: null }, { institute: { $exists: false } }] });
  for (const log of logs) {
    if (!log.userId) continue;
    const user = await User.findById(log.userId).select('institute');
    if (user?.institute) {
      log.institute = user.institute;
      await log.save();
    }
  }

  const jobs = await VideoUploadJob.find({ $or: [{ institute: null }, { institute: { $exists: false } }] });
  for (const job of jobs) {
    const lesson = await Lesson.findById(job.lessonId).select('institute courseId');
    if (lesson?.institute) {
      job.institute = lesson.institute;
      await job.save();
    }
  }

  const transcodingJobs = await TranscodingJob.find({ $or: [{ institute: null }, { institute: { $exists: false } }] });
  for (const job of transcodingJobs) {
    const lesson = await Lesson.findById(job.lessonId).select('institute courseId');
    if (lesson?.institute) {
      job.institute = lesson.institute;
      await job.save();
    }
  }

  const notifications = await Notification.find({ $or: [{ institute: null }, { institute: { $exists: false } }] });
  for (const note of notifications) {
    if (!note.userId) continue;
    const user = await User.findById(note.userId).select('institute');
    if (user?.institute) {
      note.institute = user.institute;
      await note.save();
    }
  }

  console.log('Tenant backfill complete.');
  process.exit(0);
};

if (typeof process !== 'undefined' && process.argv?.[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runTenantBackfill().catch((error) => {
    console.error('Tenant backfill failed:', error);
    process.exit(1);
  });
}
