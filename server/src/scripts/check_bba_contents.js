import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Subject } from '../models/Subject.js';
import { Unit } from '../models/Unit.js';
import { Lesson } from '../models/Lesson.js';
import { Content } from '../models/Content.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const programId = '6a43e5a1e7a8cc1bab8b4d7e'; // BBA
  console.log(`Program ID: ${programId}`);

  const subjects = await Subject.find({ programId });
  console.log(`Found ${subjects.length} subjects.`);
  for (const s of subjects) {
    console.log(`- Subject: ${s.subjectName} (${s._id})`);
    
    const units = await Unit.find({ subjectId: s._id });
    console.log(`  Found ${units.length} units.`);
    for (const u of units) {
      console.log(`  - Unit: ${u.name} / ${u.title} (${u._id})`);
      
      const lessons = await Lesson.find({ unitId: u._id });
      console.log(`    Found ${lessons.length} lessons.`);
      for (const l of lessons) {
        console.log(`    - Lesson: ${l.title} (${l._id})`);
        
        const contents = await Content.find({ lessonId: l._id });
        console.log(`      Found ${contents.length} contents.`);
        for (const c of contents) {
          console.log(`      - Content: ${c.title} (${c._id}) type=${c.type}`);
        }
      }
    }
  }

  process.exit(0);
};

run().catch(console.error);
