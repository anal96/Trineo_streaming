import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduverse';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB Connected to drop index');
  try {
    const db = mongoose.connection.db;
    
    // List indexes
    const indexes = await db.collection('watchhistories').indexes();
    console.log('Current watchhistories indexes:', indexes);

    const result1 = await db.collection('watchhistories').dropIndex('studentId_1_lessonId_1').catch(e => e.message);
    console.log('Drop watchhistories studentId_1_lessonId_1 result:', result1);
    
    const result2 = await db.collection('lessons').dropIndex('courseId_1_slug_1').catch(e => e.message);
    console.log('Drop lessons courseId_1_slug_1 result:', result2);

    const result3 = await db.collection('watchhistories').dropIndex('institute_1_studentId_1_lessonId_1').catch(e => e.message);
    console.log('Drop watchhistories institute_1_studentId_1_lessonId_1 result:', result3);
    
  } catch (err) {
    console.error('Error dropping index:', err.message);
  }
  process.exit(0);
};

run();
