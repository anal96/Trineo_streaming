import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Program } from '../models/Program.js';
import { Purchase } from '../models/Purchase.js';
import { Enrollment } from '../models/Enrollment.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  
  const student = await User.findOne({ email: 'ananloseph9744@gmail.com' });
  console.log('=== STUDENT ===');
  console.log(student ? { 
    id: student._id, 
    email: student.email, 
    role: student.role, 
    status: student.status,
    institute: student.institute,
    courseName: student.courseName 
  } : 'Student not found');
  
  if (student) {
    const enrollments = await Enrollment.find({ studentId: student._id });
    console.log('=== ENROLLMENTS ===');
    console.log(enrollments.map(e => ({ id: e._id, programId: e.programId, status: e.status })));
    
    const purchases = await Purchase.find({ studentId: student._id });
    console.log('=== PURCHASES ===');
    console.log(purchases.map(p => ({ id: p._id, courseId: p.courseId, status: p.status })));

    const programs = await Program.find({ institute: student.institute, isDeleted: false });
    console.log('=== PROGRAMS ===');
    for (const prog of programs) {
      const access = await verifyStudentAccess({ user: student, programId: prog._id });
      console.log(`Program: ${prog.name} (${prog._id}) - Access: ${JSON.stringify(access)}`);
    }

    const courses = await Course.find({ institute: student.institute });
    console.log('=== COURSES ===');
    for (const course of courses) {
      const access = await verifyStudentAccess({ user: student, courseId: course._id });
      console.log(`Course: ${course.title} (${course._id}) - Access: ${JSON.stringify(access)}`);
    }
  }
  
  process.exit(0);
};

run();
