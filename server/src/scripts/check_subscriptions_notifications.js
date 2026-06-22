import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { Notification } from '../models/Notification.js';
import { Purchase } from '../models/Purchase.js';
import { Enrollment } from '../models/Enrollment.js';
import { User } from '../models/User.js';

async function checkLmsPushData() {
  console.log('Connecting to database...');
  await connectDB();

  const studentUserId = '6a0cae0812debc47f15f9545';
  console.log('\n--- Student User Details ---');
  const user = await User.findById(studentUserId).lean();
  if (user) {
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Institute: ${user.institute}`);
  } else {
    console.log(`Student ${studentUserId} not found in DB.`);
  }

  console.log('\n--- db.pushsubscriptions.find().pretty() ---');
  const subs = await PushSubscription.find({}).lean();
  console.log(`Found ${subs.length} active subscription(s) in db:`);
  console.log(JSON.stringify(subs, null, 2));

  console.log('\n--- Purchases for this student ---');
  const purchases = await Purchase.find({ studentId: studentUserId }).lean();
  console.log(`Found ${purchases.length} purchases:`);
  console.log(JSON.stringify(purchases, null, 2));

  console.log('\n--- Enrollments for this student ---');
  const enrollments = await Enrollment.find({ studentId: studentUserId }).lean();
  console.log(`Found ${enrollments.length} enrollments:`);
  console.log(JSON.stringify(enrollments, null, 2));

  console.log('\n--- db.notifications.find().sort({createdAt:-1}).limit(3) ---');
  const notes = await Notification.find({}).sort({ createdAt: -1 }).limit(3).lean();
  console.log(JSON.stringify(notes, null, 2));

  await mongoose.connection.close();
  console.log('\nDatabase connection closed.');
}

checkLmsPushData().catch(err => {
  console.error('Error running check script:', err);
  process.exit(1);
});
