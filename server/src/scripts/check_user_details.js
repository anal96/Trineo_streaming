import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', MONGO_URI);

  const student = await User.findOne({ email: 'analjoseph9744@gmail.com' });
  if (!student) {
    console.log('User not found!');
  } else {
    console.log({
      _id: student._id,
      name: student.name,
      email: student.email,
      role: student.role,
      institute: student.institute,
      instituteId: student.instituteId,
      courseName: student.courseName,
      batchName: student.batchName,
      program: student.program,
      status: student.status
    });
  }
  process.exit(0);
};

run().catch(console.error);
