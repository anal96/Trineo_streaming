import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Lesson } from '../models/Lesson.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  const lessons = await Lesson.find();
  console.log(lessons.map(l => ({
    id: l._id,
    title: l.title,
    institute: l.institute,
    youtubeVideoId: l.youtubeVideoId,
    duration: l.duration,
    durationSeconds: l.durationSeconds
  })));
  process.exit(0);
};

run();
