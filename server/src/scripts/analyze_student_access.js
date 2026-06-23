import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Enrollment } from '../models/Enrollment.js';
import { Purchase } from '../models/Purchase.js';
import { AccessPackage } from '../models/AccessPackage.js';
import { StudentAccess } from '../models/StudentAccess.js';
import { Program } from '../models/Program.js';
import { Course } from '../models/Course.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';

const analyze = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB at:', MONGO_URI);

  const student = await User.findOne({ email: 'ananloseph9744@gmail.com' }).populate('assignedPackage');
  if (!student) {
    console.log('Student not found');
    process.exit(1);
  }

  console.log('\n=== STUDENT DETAILS ===');
  console.log('ID:', student._id);
  console.log('Name:', student.name);
  console.log('Email:', student.email);
  console.log('Status:', student.status);
  console.log('Assigned Package:', student.assignedPackage ? student.assignedPackage.name : 'None');
  console.log('Package Expiry Date:', student.packageExpiryDate);

  console.log('\n=== ENROLLMENTS ===');
  const enrollments = await Enrollment.find({ studentId: student._id }).populate('programId');
  for (const e of enrollments) {
    console.log(`Enrollment ID: ${e._id}`);
    console.log(`Program: ${e.programId ? e.programId.name : 'Unknown'}`);
    console.log(`Status: ${e.status}`);
    console.log(`Expiry: ${e.expiryDate || 'None'}`);
  }

  console.log('\n=== STUDENTACCESS COLLECTIONS ===');
  const studentAccesses = await StudentAccess.find({ studentId: student._id });
  for (const sa of studentAccesses) {
    console.log(JSON.stringify(sa, null, 2));
  }

  console.log('\n=== ACCESS RULES / RESTRICTIONS (from raw DB) ===');
  const db = mongoose.connection.db;
  const accessRules = await db.collection('accessrules').find({ studentId: student._id }).toArray();
  for (const r of accessRules) {
    console.log(JSON.stringify(r, null, 2));
  }

  process.exit(0);
};

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});
