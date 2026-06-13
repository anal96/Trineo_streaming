import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  
  const student = await User.findOne({ email: 'student@example.com' });
  const course = await Course.findOne({ title: 'MCS011' });
  
  if (!student) {
    console.error('Student not found');
    process.exit(1);
  }
  if (!course) {
    console.error('Course MCS011 not found');
    process.exit(1);
  }
  
  // Create or update purchase
  let purchase = await Purchase.findOne({ studentId: student._id, courseId: course._id });
  if (!purchase) {
    purchase = await Purchase.create({
      institute: student.institute,
      studentId: student._id,
      courseId: course._id,
      amount: 0,
      status: 'completed',
      purchasedAt: new Date()
    });
    console.log('Created Purchase record for MCS011');
  } else {
    purchase.status = 'completed';
    await purchase.save();
    console.log('Updated Purchase record status to completed');
  }
  
  student.courseName = course.title;
  await student.save();
  console.log('Assigned courseName on Student model');
  
  process.exit(0);
};

run();
