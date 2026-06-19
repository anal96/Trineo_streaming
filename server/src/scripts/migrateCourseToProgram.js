import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { Purchase } from '../models/Purchase.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { Program } from '../models/Program.js';
import { Subject } from '../models/Subject.js';
import { Unit } from '../models/Unit.js';
import { Content } from '../models/Content.js';
import { Enrollment } from '../models/Enrollment.js';
import { ContentProgress } from '../models/ContentProgress.js';
import { MigrationLog } from '../models/MigrationLog.js';
import { Institute } from '../models/Institute.js';

dotenv.config();

const runMigration = async () => {
  console.log('Starting migration script...');
  await connectDB();

  const log = new MigrationLog({
    migrationName: 'CourseToProgramRestructure',
    status: 'pending',
    startedAt: new Date()
  });
  await log.save();

  const courseMap = new Map(); // oldCourseId -> newProgramId
  const subjectMap = new Map(); // programId_subjectName -> Subject ID
  const unitMap = new Map(); // subjectId_unitName -> Unit ID
  const lessonMap = new Map(); // oldLessonId -> newLessonId
  const videoContentMap = new Map(); // oldLessonId -> newContentId (video)
  const pdfContentMap = new Map(); // oldLessonId -> newContentId (pdf)

  let count = 0;

  try {
    // 1. Migrate Courses to Programs
    console.log('Migrating Courses to Programs...');
    const courses = await Course.find({});
    console.log(`Found ${courses.length} courses to migrate.`);
    for (const course of courses) {
      // Check if already migrated
      let program = await Program.findOne({ instituteId: course.instituteId, slug: course.slug });
      if (!program) {
        program = new Program({
          name: course.title,
          description: course.description,
          thumbnail: course.thumbnail,
          bannerImage: '',
          institute: course.institute,
          instituteId: course.instituteId,
          slug: course.slug,
          displayOrder: 0,
          status: course.status || 'active'
        });
        await program.save();
        count += 1;
      }
      courseMap.set(course._id.toString(), program._id.toString());
    }
    console.log(`Successfully migrated ${courseMap.size} courses/programs.`);

    // 2. Migrate Purchases to Enrollments
    console.log('Migrating Purchases to Enrollments...');
    const purchases = await Purchase.find({});
    console.log(`Found ${purchases.length} purchases to migrate.`);
    for (const purchase of purchases) {
      if (!purchase.courseId) continue;
      const newProgramId = courseMap.get(purchase.courseId.toString());
      if (!newProgramId) {
        console.warn(`Warning: Course mapping not found for Purchase ${purchase._id}`);
        continue;
      }

      // Check if enrollment already exists
      const existing = await Enrollment.findOne({
        studentId: purchase.studentId,
        programId: newProgramId
      });

      if (!existing) {
        const enrollment = new Enrollment({
          institute: purchase.institute,
          instituteId: purchase.instituteId,
          studentId: purchase.studentId,
          programId: newProgramId,
          enrolledAt: purchase.purchasedAt,
          status: purchase.status === 'refunded' ? 'suspended' : 'active'
        });
        await enrollment.save();
        count += 1;
      }
    }
    console.log('Completed Purchases/Enrollments migration.');

    // 3. Migrate Lessons -> Subjects, Units, Lessons, Content
    console.log('Migrating Lessons into hierarchy...');
    const oldLessons = await Lesson.find({ courseId: { $ne: null } });
    console.log(`Found ${oldLessons.length} lessons to migrate.`);
    for (const oldLesson of oldLessons) {
      const newProgramId = courseMap.get(oldLesson.courseId.toString());
      if (!newProgramId) {
        console.warn(`Warning: Program mapping not found for Lesson ${oldLesson._id} (courseId: ${oldLesson.courseId})`);
        continue;
      }

      // Resolve Subject
      const subjectName = oldLesson.subjectTitle || 'General';
      const subjectKey = `${newProgramId}_${subjectName}`;
      let subjectId = subjectMap.get(subjectKey);
      if (!subjectId) {
        let subject = await Subject.findOne({ programId: newProgramId, subjectName });
        if (!subject) {
          const subjectCode = subjectName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) || 'GEN';
          subject = new Subject({
            programId: newProgramId,
            subjectCode,
            subjectName,
            description: '',
            institute: oldLesson.institute,
            instituteId: oldLesson.instituteId,
            displayOrder: oldLesson.subjectOrder || 0
          });
          await subject.save();
          count += 1;
        }
        subjectId = subject._id.toString();
        subjectMap.set(subjectKey, subjectId);
      }

      // Resolve Unit
      const unitName = oldLesson.moduleTitle || 'Unit 1';
      const unitKey = `${subjectId}_${unitName}`;
      let unitId = unitMap.get(unitKey);
      if (!unitId) {
        let unit = await Unit.findOne({ subjectId, name: unitName });
        if (!unit) {
          unit = new Unit({
            subjectId,
            name: unitName,
            description: '',
            institute: oldLesson.institute,
            instituteId: oldLesson.instituteId,
            displayOrder: oldLesson.moduleOrder || 0
          });
          await unit.save();
          count += 1;
        }
        unitId = unit._id.toString();
        unitMap.set(unitKey, unitId);
      }

      // Create new Lesson (with unitId instead of courseId)
      // Check if new lesson exists
      let newLesson = await Lesson.findOne({ unitId, slug: oldLesson.slug });
      if (!newLesson) {
        newLesson = new Lesson({
          unitId,
          title: oldLesson.title,
          description: oldLesson.description,
          order: oldLesson.order,
          institute: oldLesson.institute,
          instituteId: oldLesson.instituteId,
          slug: oldLesson.slug
        });
        await newLesson.save();
        count += 1;
      }
      lessonMap.set(oldLesson._id.toString(), newLesson._id.toString());

      // Migrate Video Content
      if (oldLesson.youtubeVideoId) {
        let videoContent = await Content.findOne({ lessonId: newLesson._id, type: 'video', youtubeVideoId: oldLesson.youtubeVideoId });
        if (!videoContent) {
          videoContent = new Content({
            lessonId: newLesson._id,
            type: 'video',
            title: oldLesson.title + ' Video',
            description: oldLesson.description,
            order: 1,
            institute: oldLesson.institute,
            instituteId: oldLesson.instituteId,
            youtubeVideoId: oldLesson.youtubeVideoId,
            youtubeThumbnail: oldLesson.youtubeThumbnail,
            youtubeDuration: oldLesson.youtubeDuration,
            videoProvider: oldLesson.videoProvider || 'youtube',
            uploadStatus: oldLesson.uploadStatus === 'ready' ? 'ready' : 'pending',
            videoAssetId: oldLesson.videoAssetId
          });
          await videoContent.save();
          count += 1;
        }
        videoContentMap.set(oldLesson._id.toString(), videoContent._id.toString());
      }

      // Migrate PDF Content
      if (oldLesson.attachmentUrl) {
        let pdfContent = await Content.findOne({ lessonId: newLesson._id, type: 'pdf', attachmentUrl: oldLesson.attachmentUrl });
        if (!pdfContent) {
          pdfContent = new Content({
            lessonId: newLesson._id,
            type: 'pdf',
            title: oldLesson.attachmentName || (oldLesson.title + ' PDF'),
            description: '',
            order: 2,
            institute: oldLesson.institute,
            instituteId: oldLesson.instituteId,
            attachmentUrl: oldLesson.attachmentUrl,
            attachmentName: oldLesson.attachmentName
          });
          await pdfContent.save();
          count += 1;
        }
        pdfContentMap.set(oldLesson._id.toString(), pdfContent._id.toString());
      }
    }
    console.log('Completed Lessons and Content migration.');

    // 4. Migrate WatchHistory -> WatchHistory & ContentProgress
    console.log('Migrating Watch History...');
    const oldHistory = await WatchHistory.find({ lessonId: { $ne: null } });
    console.log(`Found ${oldHistory.length} history records to migrate.`);
    for (const history of oldHistory) {
      const newContentId = videoContentMap.get(history.lessonId.toString());
      if (!newContentId) {
        continue;
      }

      // Create new WatchHistory
      const existingHistory = await WatchHistory.findOne({
        studentId: history.studentId,
        contentId: newContentId
      });

      if (!existingHistory) {
        const watchTimeVal = history.progress * (history.durationSeconds || 0) / 100;
        const newHistory = new WatchHistory({
          institute: history.institute,
          instituteId: history.instituteId,
          studentId: history.studentId,
          contentId: newContentId,
          watchTime: Math.round(watchTimeVal),
          duration: history.durationSeconds || 0,
          progress: history.progress,
          completed: history.completed,
          lastWatchedAt: history.watchedAt || history.lastWatchedAt || new Date()
        });
        await newHistory.save();
        count += 1;
      }

      // Create ContentProgress if completed
      if (history.completed) {
        const existingProgress = await ContentProgress.findOne({
          studentId: history.studentId,
          contentId: newContentId
        });

        if (!existingProgress) {
          const contentProgress = new ContentProgress({
            instituteId: history.instituteId,
            studentId: history.studentId,
            contentId: newContentId,
            completed: true,
            completedAt: history.watchedAt || new Date()
          });
          await contentProgress.save();
          count += 1;
        }
      }
    }
    console.log('Completed Watch History migration.');

    // Update log to success
    log.status = 'success';
    log.recordsProcessed = count;
    log.completedAt = new Date();
    await log.save();
    console.log(`Migration completed successfully! Processed ${count} database operations.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    log.status = 'failed';
    log.errors.push(err.message || 'Unknown error');
    log.completedAt = new Date();
    await log.save();
    process.exit(1);
  }
};

runMigration();
