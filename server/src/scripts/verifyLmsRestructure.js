import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Program } from '../models/Program.js';
import { Subject } from '../models/Subject.js';
import { Unit } from '../models/Unit.js';
import { Lesson } from '../models/Lesson.js';
import { Content } from '../models/Content.js';
import { Enrollment } from '../models/Enrollment.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { ContentProgress } from '../models/ContentProgress.js';
import { MigrationLog } from '../models/MigrationLog.js';

async function verifyMigration() {
  await connectDB();

  console.log('\n--- VERIFYING LMS RESTRUCTURE DATA ---');

  const log = await MigrationLog.findOne({ migrationName: 'CourseToProgramRestructure' }).sort({ startedAt: -1 });
  console.log(`Migration Log:`, log ? {
    status: log.status,
    recordsProcessed: log.recordsProcessed,
    startedAt: log.startedAt,
    completedAt: log.completedAt,
    errors: log.errors
  } : 'Not Found');

  const programsCount = await Program.countDocuments({});
  console.log(`Programs: ${programsCount}`);

  const subjectsCount = await Subject.countDocuments({});
  console.log(`Subjects: ${subjectsCount}`);

  const unitsCount = await Unit.countDocuments({});
  console.log(`Units: ${unitsCount}`);

  const newLessonsCount = await Lesson.countDocuments({ unitId: { $ne: null } });
  const oldLessonsCount = await Lesson.countDocuments({ courseId: { $ne: null } });
  console.log(`New Lessons (with unitId): ${newLessonsCount}`);
  console.log(`Old Lessons (with courseId): ${oldLessonsCount}`);

  const contentCount = await Content.countDocuments({});
  const videoContentCount = await Content.countDocuments({ type: 'video' });
  const pdfContentCount = await Content.countDocuments({ type: 'pdf' });
  console.log(`Content Items: ${contentCount} (Videos: ${videoContentCount}, PDFs: ${pdfContentCount})`);

  const enrollmentsCount = await Enrollment.countDocuments({});
  console.log(`Enrollments: ${enrollmentsCount}`);

  const newHistoryCount = await WatchHistory.countDocuments({ contentId: { $ne: null } });
  const oldHistoryCount = await WatchHistory.countDocuments({ lessonId: { $ne: null } });
  console.log(`New WatchHistory (with contentId): ${newHistoryCount}`);
  console.log(`Old WatchHistory (with lessonId): ${oldHistoryCount}`);

  // Debug watch histories
  const histories = await WatchHistory.find({ lessonId: { $ne: null } });
  for (const h of histories) {
    const lesson = await Lesson.findById(h.lessonId);
    console.log(`  - Old WatchHistory student: ${h.studentId}, lesson: ${h.lessonId} (${lesson ? lesson.title : 'Not Found'}), youtubeVideoId: ${lesson ? lesson.youtubeVideoId : 'N/A'}`);
  }

  const progressCount = await ContentProgress.countDocuments({});
  console.log(`ContentProgress records: ${progressCount}`);

  console.log('--- VERIFICATION COMPLETE ---\n');

  await mongoose.connection.close();
}

verifyMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
