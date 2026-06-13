import mongoose from 'mongoose';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { CourseAssignment } from '../models/CourseAssignment.js';
import { AuditLog } from '../models/AuditLog.js';

export const syncStudent = async (req, res) => {
  const { studentId, name, email, phone } = req.body;

  if (!studentId || !name || !email) {
    return res.status(400).json({ message: 'Missing required fields: studentId, name, and email are required.' });
  }

  try {
    // Check if the student already exists in this institute
    let student = await User.findOne({
      instituteId: req.institute.instituteId,
      $or: [
        { studentId: studentId },
        { email: email }
      ]
    });

    if (!student) {
      // Create student
      const tempPassword = crypto.randomBytes(16).toString('hex');
      student = new User({
        name,
        email,
        phone: phone || '',
        password: tempPassword,
        role: 'student',
        institute: req.institute._id,
        instituteId: req.institute.instituteId,
        studentId: studentId,
        crmStudentId: studentId,
        crmSource: req.headers['x-crm-source'] || 'gfi-crm',
        status: 'active',
        syncStatus: 'success',
        lastSyncedAt: new Date()
      });
      await student.save();
    } else {
      // Update student
      student.name = name;
      student.phone = phone || student.phone;
      student.crmStudentId = studentId;
      student.studentId = studentId; // ensure synced
      student.crmSource = req.headers['x-crm-source'] || student.crmSource || 'gfi-crm';
      student.syncStatus = 'success';
      student.lastSyncedAt = new Date();
      await student.save();
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown CRM';

    await AuditLog.create({
      institute: req.institute._id,
      instituteId: req.institute.instituteId,
      userId: student._id,
      eventType: 'STUDENT_SYNC',
      details: `Student sync successful. ID: ${studentId}, Email: ${email}`,
      ipAddress: ipAddress === '::1' ? '127.0.0.1' : ipAddress,
      userAgent
    });

    return res.json({
      success: true,
      userId: student._id.toString(),
      instituteId: req.institute.instituteId
    });
  } catch (error) {
    console.error('CRM Student Sync error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

export const assignCourse = async (req, res) => {
  const { studentId, courseId } = req.body;

  if (!studentId || !courseId) {
    return res.status(400).json({ message: 'Missing required fields: studentId and courseId are required.' });
  }

  try {
    // Find student in this institute
    const student = await User.findOne({
      studentId: studentId,
      instituteId: req.institute.instituteId
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found in this institute.' });
    }

    // Find course in this institute
    let course = null;
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      course = await Course.findOne({ _id: courseId, instituteId: req.institute.instituteId });
    }
    if (!course) {
      course = await Course.findOne({ slug: courseId, instituteId: req.institute.instituteId });
    }

    if (!course) {
      return res.status(404).json({ message: 'Course not found in this institute.' });
    }

    // Prevent duplicates and create CourseAssignment
    let assignment = await CourseAssignment.findOne({
      student: student._id,
      courseId: course._id,
      instituteId: req.institute.instituteId
    });

    if (!assignment) {
      assignment = new CourseAssignment({
        student: student._id,
        crmStudentId: studentId,
        courseId: course._id,
        institute: req.institute._id,
        instituteId: req.institute.instituteId
      });
      await assignment.save();
    }

    // Also create/ensure Purchase record for backward compatibility
    const Purchase = mongoose.model('Purchase');
    let purchase = await Purchase.findOne({
      studentId: student._id,
      courseId: course._id,
      institute: req.institute._id
    });

    if (!purchase) {
      purchase = new Purchase({
        studentId: student._id,
        courseId: course._id,
        institute: req.institute._id,
        instituteId: req.institute.instituteId,
        amount: 0,
        status: 'completed'
      });
      await purchase.save();
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown CRM';

    await AuditLog.create({
      institute: req.institute._id,
      instituteId: req.institute.instituteId,
      userId: student._id,
      eventType: 'COURSE_ASSIGNED',
      details: `Course ${course.title} assigned to student ${student.email}`,
      ipAddress: ipAddress === '::1' ? '127.0.0.1' : ipAddress,
      userAgent
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('CRM Course Assignment error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

export const unassignCourse = async (req, res) => {
  const { studentId, courseId } = req.body;

  if (!studentId || !courseId) {
    return res.status(400).json({ message: 'Missing required fields: studentId and courseId are required.' });
  }

  try {
    const student = await User.findOne({
      studentId: studentId,
      instituteId: req.institute.instituteId
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found in this institute.' });
    }

    let course = null;
    if (mongoose.Types.ObjectId.isValid(courseId)) {
      course = await Course.findOne({ _id: courseId, instituteId: req.institute.instituteId });
    }
    if (!course) {
      course = await Course.findOne({ slug: courseId, instituteId: req.institute.instituteId });
    }

    if (!course) {
      return res.status(404).json({ message: 'Course not found in this institute.' });
    }

    // Delete CourseAssignment
    await CourseAssignment.deleteOne({
      student: student._id,
      courseId: course._id,
      instituteId: req.institute.instituteId
    });

    // Revoke legacy Purchase access if any
    const Purchase = mongoose.model('Purchase');
    await Purchase.deleteOne({
      studentId: student._id,
      courseId: course._id,
      institute: req.institute._id
    });

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown CRM';

    await AuditLog.create({
      institute: req.institute._id,
      instituteId: req.institute.instituteId,
      userId: student._id,
      eventType: 'COURSE_UNASSIGNED',
      details: `Course ${course.title} unassigned from student ${student.email}`,
      ipAddress: ipAddress === '::1' ? '127.0.0.1' : ipAddress,
      userAgent
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('CRM Course Unassignment error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

export const getStudentAccess = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await User.findOne({
      instituteId: req.institute.instituteId,
      $or: [
        { studentId: studentId },
        { user_id: Number(studentId) || -1 },
        { _id: mongoose.Types.ObjectId.isValid(studentId) ? studentId : null }
      ]
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found in this institute.' });
    }

    const assignments = await CourseAssignment.find({
      student: student._id,
      instituteId: req.institute.instituteId
    }).populate('courseId');

    const assignedCourses = assignments
      .filter(a => a.courseId)
      .map(a => ({
        courseId: a.courseId._id.toString(),
        title: a.courseId.title,
        slug: a.courseId.slug
      }));

    return res.json({
      student: {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone
      },
      assignedCourses,
      accessStatus: student.status
    });
  } catch (error) {
    console.error('CRM Student Access query error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

export const checkIntegrationHealth = async (req, res) => {
  try {
    return res.json({
      success: true,
      message: 'CRM integration authenticated successfully',
      instituteId: req.institute.instituteId,
      name: req.institute.name
    });
  } catch (error) {
    console.error('CRM Health check error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};
