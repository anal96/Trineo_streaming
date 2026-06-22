import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { Content } from '../models/Content.js';
import { Notification } from '../models/Notification.js';
import { Lesson } from '../models/Lesson.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // 1. Find the target student
    const email = 'ananloseph9744@gmail.com';
    let student = await User.findOne({ email });
    if (!student) {
      student = await User.findOne({ role: 'student' });
    }

    if (!student) {
      console.error('No student found in database.');
      process.exit(1);
    }

    console.log(`Using student: ${student.name} (${student.email})`);

    // 2. Ensure at least one Content & Lesson exists
    let content = await Content.findOne().populate('lessonId');
    if (!content) {
      let lesson = await Lesson.findOne();
      if (!lesson) {
        lesson = await Lesson.create({
          title: 'React Hooks Basics',
          courseId: new mongoose.Types.ObjectId(),
          institute: student.institute || null,
          order: 1
        });
      }

      content = await Content.create({
        title: 'React Hooks Intro Video',
        type: 'video',
        lessonId: lesson._id,
        institute: student.institute || null,
        order: 1
      });
      console.log('Created dummy Lesson and Content items.');
    }

    // 3. Set WatchHistory to 4 days ago to trigger Day 3 reminder
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    let lastWatch = await WatchHistory.findOne({ studentId: student._id });

    if (!lastWatch) {
      lastWatch = new WatchHistory({
        studentId: student._id,
        contentId: content._id,
        lessonId: content.lessonId?._id || content.lessonId,
        watchTime: 10,
        duration: 100,
        progress: 10,
        completed: false,
        lastWatchedAt: fourDaysAgo,
        institute: student.institute || null
      });
    } else {
      lastWatch.lastWatchedAt = fourDaysAgo;
      lastWatch.completed = false;
      lastWatch.progress = 10;
      if (content.lessonId) {
        lastWatch.lessonId = content.lessonId?._id || content.lessonId;
      }
    }

    await lastWatch.save();
    console.log(`WatchHistory updated. lastWatchedAt set to: ${lastWatch.lastWatchedAt}`);

    // 4. Reset student reminder tracking
    student.continueLearningRemindersSent = [];
    student.lastContinueLearningReminderSentAt = null;
    await student.save();
    console.log('Cleared student continueLearningRemindersSent list.');

    // 5. Run the continue learning logic synchronously
    console.log('Simulating Continue Learning Reminder job...');
    
    const now = new Date();
    const testWatch = await WatchHistory.findOne({ studentId: student._id })
      .sort({ lastWatchedAt: -1 })
      .populate('contentId');

    if (testWatch && testWatch.lastWatchedAt) {
      const diffDays = (now.getTime() - new Date(testWatch.lastWatchedAt).getTime()) / (1000 * 60 * 60 * 24);
      console.log(`Inactivity detected: ${diffDays.toFixed(2)} days.`);
      
      let targetDay = 0;
      let message = '';
      
      if (diffDays >= 14 && !student.continueLearningRemindersSent.includes(14)) {
        targetDay = 14;
        message = `Don't lose your progress! Resume "${testWatch.contentId?.title || 'your course'}" now and keep learning.`;
      } else if (diffDays >= 7 && !student.continueLearningRemindersSent.includes(7)) {
        targetDay = 7;
        message = `It's been a week! Ready to get back to "${testWatch.contentId?.title || 'your course'}"? Tap to resume.`;
      } else if (diffDays >= 3 && !student.continueLearningRemindersSent.includes(3)) {
        targetDay = 3;
        message = `You haven't watched "${testWatch.contentId?.title || 'your last lesson'}" in 3 days. Tap to resume learning!`;
      }

      if (targetDay > 0) {
        const lessonId = testWatch.lessonId || testWatch.contentId?.lessonId;
        let courseId = testWatch.courseId || '';
        let lessonIndex = 1;

        if (lessonId) {
          const lesson = await Lesson.findById(lessonId);
          if (lesson) {
            courseId = courseId || lesson.courseId;
            const courseLessons = await Lesson.find({ courseId: lesson.courseId }).sort({ order: 1, createdAt: 1 });
            const idx = courseLessons.findIndex(l => l._id.toString() === lesson._id.toString());
            if (idx >= 0) {
              lessonIndex = idx + 1;
            }
          }
        }

        const url = courseId ? `/student/video/${courseId}/${lessonIndex}` : '/student';
        console.log(`Deep Link generated: ${url}`);

        console.log(`Creating notification: "${message}"`);
        
        const notification = await Notification.create({
          userId: student._id,
          institute: student.institute || null,
          title: '📚 Continue Learning',
          message,
          url,
          type: 'continue_learning'
        });

        student.continueLearningRemindersSent.push(targetDay);
        student.lastContinueLearningReminderSentAt = now;
        await student.save();

        console.log('Notification created successfully. ID:', notification._id);
        console.log('User model state updated. continueLearningRemindersSent:', student.continueLearningRemindersSent);
        console.log('Wait 5s for push notification promises...');
        await new Promise(r => setTimeout(r, 5000));
      } else {
        console.log('No reminder target matched (already sent or threshold not reached).');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Trigger Script Error:', err);
    process.exit(1);
  }
};

run();
