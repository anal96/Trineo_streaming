import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { Content } from '../models/Content.js';
import { Enrollment } from '../models/Enrollment.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const student = await User.findOne({ email: 'analjoseph9744@gmail.com' });
  if (!student) {
    console.log('No student found with email analjoseph9744@gmail.com');
    process.exit(1);
  }

  console.log(`Student ID: ${student._id}`);

  // Fetch watch history
  const history = await WatchHistory.find({ studentId: student._id });
  console.log(`\nFound ${history.length} watch history entries for student.`);
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    console.log(`[${i + 1}] Content ID: ${h.contentId}`);
    console.log(`    Progress: ${h.progress}%`);
    console.log(`    Watch Time: ${h.watchTime}s / Duration: ${h.duration}s`);
    console.log(`    Last Watched: ${h.lastWatchedAt}`);
  }

  // Fetch enrollments
  const enrolls = await Enrollment.find({ studentId: student._id });
  console.log(`\nFound ${enrolls.length} enrollments for student.`);
  for (const e of enrolls) {
    console.log(`- Program: ${e.programId}, Status: ${e.status}, isActive: ${e.isActive}`);
  }

  process.exit(0);
};

run().catch(console.error);
