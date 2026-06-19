import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { StudentImportJob } from '../models/StudentImportJob.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  
  console.log('=== SEARCHING FOR FAYIZ ===');
  const user = await User.findOne({ email: /fayiz/i });
  if (user) {
    console.log('User found:', {
      _id: user._id,
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      institute: user.institute,
      instituteId: user.instituteId,
      status: user.status,
      courseName: user.courseName,
      branchName: user.branchName
    });
  } else {
    console.log('User not found.');
  }

  console.log('\n=== RECENT IMPORT JOBS ===');
  const ImportJobModel = mongoose.model('StudentImportJob');
  const jobs = await ImportJobModel.find({}).sort({ createdAt: -1 }).limit(5);
  for (const job of jobs) {
    console.log({
      id: job._id,
      fileName: job.fileName,
      status: job.status,
      importedCount: job.importedCount,
      failedCount: job.failedCount,
      skippedCount: job.skippedCount,
      uploadedBy: job.uploadedBy,
      institute: job.institute,
      createdAt: job.createdAt
    });
  }

  if (jobs.length > 0) {
    const adminId = jobs[0].uploadedBy;
    console.log(`\n=== ADMIN USER (${adminId}) ===`);
    const admin = await User.findById(adminId);
    if (admin) {
      console.log({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        institute: admin.institute,
        instituteId: admin.instituteId
      });

      console.log('\n=== STUDENTS UNDER THIS ADMIN\'S INSTITUTE ===');
      const students = await User.find({ role: 'student', institute: admin.institute });
      console.log(`Found ${students.length} students:`);
      students.forEach(s => {
        console.log(` - Name: ${s.name}\n   Email: ${s.email}\n   role: ${s.role}\n   status: ${s.status}\n   institute: ${s.institute}\n   courseName: ${s.courseName}\n   batchName: ${s.batchName}\n   branchName: ${s.branchName}\n`);
      });
    } else {
      console.log('Admin user not found.');
    }
  }

  process.exit(0);
};

run();
