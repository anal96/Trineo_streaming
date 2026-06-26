import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { LiveClass } from '../models/LiveClass.js';
import { Program } from '../models/Program.js';
import { Enrollment } from '../models/Enrollment.js';
import { getAccessiblePrograms } from '../utils/accessHelper.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const trace = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', MONGO_URI);

  // 1. Fetch Fayiz pv (a student in BCA batch)
  console.log('\n--- 1. Student Info ---');
  const student = await User.findOne({ email: /fayiz/i });
  if (!student) {
    console.log('Student not found!');
    process.exit(1);
  }
  console.log({
    _id: student._id,
    name: student.name,
    email: student.email,
    role: student.role,
    institute: student.institute,
    instituteId: student.instituteId,
    courseName: student.courseName,
    batchName: student.batchName,
    program: student.program
  });

  // 2. Fetch all Programs in the institute
  console.log('\n--- 2. Programs under student\'s institute ---');
  const programs = await Program.find({ institute: student.institute });
  programs.forEach(p => {
    console.log({
      _id: p._id,
      name: p.name,
      title: p.title,
      slug: p.slug,
      isDeleted: p.isDeleted
    });
  });

  // 3. Call getAccessiblePrograms(student)
  console.log('\n--- 3. Accessible programs for student ---');
  const accessibleProgramIds = await getAccessiblePrograms(student);
  console.log('Accessible Program IDs:', accessibleProgramIds);

  // 4. Fetch actual LiveClass documents in DB
  console.log('\n--- 4. LiveClass documents in DB ---');
  const liveClasses = await LiveClass.find({});
  console.log(`Found ${liveClasses.length} live classes in DB:`);
  liveClasses.forEach(lc => {
    console.log({
      _id: lc._id,
      title: lc.title,
      courseId: lc.courseId,
      instituteId: lc.instituteId,
      status: lc.status,
      startTime: lc.startTime,
      endTime: lc.endTime
    });
  });

  // 5. Run the exact student live class query
  console.log('\n--- 5. Backend LiveClass Query for Student ---');
  const query = {
    instituteId: student.institute,
    courseId: { $in: accessibleProgramIds }
  };
  console.log('Executing query:', JSON.stringify(query));
  const matchedClasses = await LiveClass.find(query);
  console.log(`Returned ${matchedClasses.length} live classes:`);
  matchedClasses.forEach(lc => {
    console.log({
      _id: lc._id,
      title: lc.title,
      courseId: lc.courseId,
      status: lc.status
    });
  });

  process.exit(0);
};

trace().catch(err => {
  console.error(err);
  process.exit(1);
});
