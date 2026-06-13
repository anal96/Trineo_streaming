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
  console.log('--- STUDENT ---');
  console.log(student ? { id: student._id, email: student.email, courseName: student.courseName } : null);
  
  if (student) {
    const purchases = await Purchase.find({ studentId: student._id });
    console.log('--- PURCHASES ---');
    console.log(purchases.map(p => ({ courseId: p.courseId, status: p.status })));
  }
  
  const courses = await Course.find();
  console.log('--- COURSES ---');
  console.log(courses.map(c => ({ id: c._id, title: c.title })));
  
  process.exit(0);
};

run();
