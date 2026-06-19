
import mongoose from 'mongoose';
import { Lesson } from './src/models/Lesson.js';
import { Content } from './src/models/Content.js';

mongoose.connect('mongodb://127.0.0.1:27017/trineo_stream').then(async () => {
  try {
    const lesson = await Lesson.findOne({ title: /Hello World/i }); // E2E script uses 'Hello World'
    if (lesson) {
      console.log('Found E2E Lesson:', lesson.title, 'isDeleted:', lesson.isDeleted);
    }
    
    const introPointers = await Lesson.findOne({ title: /introduction to pointers/i });
    if (introPointers) {
      console.log('Found introduction to pointers lesson');
    } else {
      console.log('introduction to pointers lesson is STILL not found (even including deleted ones)');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

