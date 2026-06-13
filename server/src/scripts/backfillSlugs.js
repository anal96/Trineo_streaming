import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { slugify, uniqueSlug } from '../utils/slugify.js';

const run = async () => {
  await connectDB();

  // --- Backfill Course slugs ---
  const courses = await Course.find().sort({ createdAt: 1, _id: 1 });
  console.log(`Backfilling ${courses.length} courses`);
  let coursesUpdated = 0;

  for (const course of courses) {
    try {
      if (course.slug) {
        console.log(`  Course already has slug: ${course.title} -> ${course.slug}`);
      } else {
        const baseSlug = slugify(course.title);
        const slug = await uniqueSlug(Course, baseSlug, {}, course._id);
        await Course.updateOne({ _id: course._id }, { $set: { slug } });
        console.log(`  Course slug set: ${course.title} -> ${slug}`);
        coursesUpdated++;
      }
    } catch (err) {
      console.error(`  ERROR backfilling course "${course.title}" (${course._id}):`, err.message);
    }
  }

  // --- Backfill Lesson slugs ---
  const lessons = await Lesson.find().sort({ courseId: 1, moduleOrder: 1, order: 1, createdAt: 1, _id: 1 });
  console.log(`Backfilling ${lessons.length} lessons`);
  let lessonsUpdated = 0;
  let lessonsSkipped = 0;

  for (const lesson of lessons) {
    try {
      if (lesson.slug) {
        lessonsSkipped++;
        continue;
      }
      const baseSlug = slugify(lesson.title);
      const slug = await uniqueSlug(Lesson, baseSlug, { courseId: lesson.courseId }, lesson._id);
      await Lesson.updateOne({ _id: lesson._id }, { $set: { slug } });
      console.log(`  Lesson slug set: ${lesson.title} -> ${slug}`);
      lessonsUpdated++;
    } catch (err) {
      console.error(`  ERROR backfilling lesson "${lesson.title}" (${lesson._id}):`, err.message);
    }
  }

  console.log(`\nSlug backfill complete.`);
  console.log(`  Courses: ${coursesUpdated} updated, ${courses.length - coursesUpdated} already had slugs`);
  console.log(`  Lessons: ${lessonsUpdated} updated, ${lessonsSkipped} already had slugs`);
  process.exit(0);
};

run().catch((error) => {
  console.error('Slug backfill failed:', error);
  process.exit(1);
});
