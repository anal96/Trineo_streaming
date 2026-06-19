
import mongoose from 'mongoose';
import { Lesson } from './src/models/Lesson.js';
import { Content } from './src/models/Content.js';

mongoose.connect('mongodb://127.0.0.1:27017/trineo_stream').then(async () => {
  try {
    console.log('--- STEP 2: Querying all Content ---');
    const allVideoContents = await Content.find({ type: 'video' }).sort({ createdAt: -1 }).limit(10);
    console.log('Last 10 video contents:', allVideoContents.map(c => ({
      _id: c._id,
      title: c.title,
      lessonId: c.lessonId,
      youtubeVideoId: c.youtubeVideoId,
      isDeleted: c.isDeleted,
      uploadStatus: c.uploadStatus
    })));

    console.log('\n--- Checking Lessons ---');
    const pointersLesson = await Lesson.findOne({ title: /introduction to pointers/i });
    if (pointersLesson) {
      console.log('Found pointers lesson:', pointersLesson._id);
      const contents = await Content.find({ lessonId: pointersLesson._id });
      console.log('Contents for this lesson:', contents);
    } else {
      console.log('NO lesson found matching introduction to pointers');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

