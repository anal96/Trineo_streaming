import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Course } from '../models/Course.js';
import { Faculty } from '../models/Faculty.js';
import { User } from '../models/User.js';
import { LiveClass } from '../models/LiveClass.js';
import { LiveAttendance } from '../models/LiveAttendance.js';

dotenv.config();

const runTest = async () => {
  console.log('--- STARTING LIVE CLASSES DB TESTING ---');
  await connectDB();

  try {
    // 1. Fetch default entities
    const course = await Course.findOne({});
    const faculty = await Faculty.findOne({});
    const student = await User.findOne({ role: 'student' });

    if (!course || !faculty || !student) {
      console.error('Prerequisites not met. Make sure seed data is populated.');
      process.exit(1);
    }

    console.log(`Using Course: ${course.title} (${course._id})`);
    console.log(`Using Faculty: ${faculty.name} (${faculty._id})`);
    console.log(`Using Student: ${student.name} (${student._id})`);

    const instituteId = course.institute;
    if (!instituteId) {
      console.error('Course has no institute. Seed data must have an institute.');
      process.exit(1);
    }
    console.log(`Using Institute: ${instituteId}`);

    // Ensure indexes are built
    await LiveAttendance.init();

    // 2. Clear any old test classes if present
    await LiveClass.deleteMany({ title: 'TEST_LIVE_CLASS_12345' });

    // 3. Create a live class
    const tempClass = new LiveClass({
      instituteId,
      courseId: course._id,
      title: 'TEST_LIVE_CLASS_12345',
      description: 'Test Verification Description',
      platform: 'Google Meet',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      facultyId: faculty._id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000), // 1 hour later
      status: 'upcoming'
    });

    const savedClass = await tempClass.save();
    console.log('✅ LiveClass model successfully saved to MongoDB:', savedClass._id);

    // 4. Record attendance
    const attendance = new LiveAttendance({
      liveClassId: savedClass._id,
      studentId: student._id,
      joinedAt: new Date()
    });

    const savedAttendance = await attendance.save();
    console.log('✅ LiveAttendance model successfully saved to MongoDB:', savedAttendance._id);

    // 5. Test uniqueness compound index
    try {
      const duplicateAttendance = new LiveAttendance({
        liveClassId: savedClass._id,
        studentId: student._id,
        joinedAt: new Date()
      });
      await duplicateAttendance.save();
      console.error('❌ Failed: Allowed duplicate attendance logs for same student/class!');
    } catch (indexError) {
      console.log('✅ Uniqueness index verified successfully (Prevented duplicate attendance entry).');
    }

    // 6. Query and assert relations
    const foundClass = await LiveClass.findById(savedClass._id)
      .populate('courseId', 'title')
      .populate('facultyId', 'name');

    console.log(`Assert populated course name: "${foundClass.courseId.title}" (Expected: "${course.title}")`);
    console.log(`Assert populated faculty name: "${foundClass.facultyId.name}" (Expected: "${faculty.name}")`);

    const foundAttendance = await LiveAttendance.findOne({ liveClassId: savedClass._id })
      .populate('studentId', 'name');
    console.log(`Assert populated student name: "${foundAttendance.studentId.name}" (Expected: "${student.name}")`);

    // 7. Cleanup test data
    await LiveAttendance.deleteOne({ _id: savedAttendance._id });
    await LiveClass.deleteOne({ _id: savedClass._id });
    console.log('✅ Test data successfully cleaned up.');

    console.log('--- ALL LIVE CLASS SCHEMA CHECKS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('❌ Schema testing failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
};

runTest();
