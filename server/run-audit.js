
import mongoose from 'mongoose';
import { Lesson } from './src/models/Lesson.js';
import { Content } from './src/models/Content.js';

mongoose.connect('mongodb://127.0.0.1:27017/trineo_stream').then(async () => {
  try {
    const topicTitle = 'introduction to pointers';
    console.log(\n--- AUDITING TOPIC:  ---);
    
    const lesson = await Lesson.findOne({ title: new RegExp(topicTitle, 'i') });
    if (!lesson) {
      console.log(Topic '' not found in database! Please run this script in an environment where the topic exists.);
      process.exit(0);
    }
    
    const topicId = lesson._id.toString();
    console.log(\nSTEP 2: Querying Content for topicId: );
    const contents = await Content.find({ lessonId: topicId });
    if (contents.length === 0) {
      console.log('ROOT CAUSE FOUND: Content record never created for this topicId.');
    } else {
      console.log('Contents Found:');
      contents.forEach(c => console.log(c));
    }

    console.log(\nSTEP 4: Checking where the last 10 uploaded videos went...);
    const allVideoContents = await Content.find({ type: 'video' }).sort({ createdAt: -1 }).limit(10);
    allVideoContents.forEach(c => {
      console.log(Title:  | lessonId:  | youtubeVideoId: );
      if (c.lessonId.toString() === topicId) {
        console.log(   -> MATCHES TOPIC ''!);
      }
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

