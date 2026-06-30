import { LiveClass } from '../models/LiveClass.js';
import { LiveAttendance } from '../models/LiveAttendance.js';
import { Enrollment } from '../models/Enrollment.js';
import { Notification } from '../models/Notification.js';
import { Program } from '../models/Program.js';
import { Faculty } from '../models/Faculty.js';
import { getAccessiblePrograms, verifyStudentAccess } from '../utils/accessHelper.js';

// Create a new Live Class (Admin only)
export const createLiveClass = async (req, res) => {
  const {
    courseId,
    title,
    description,
    platform,
    meetingUrl,
    facultyId,
    startTime,
    endTime,
    status,
    notifyStudents
  } = req.body;

  try {
    const instituteId = req.user.institute;
    if (!instituteId) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    // Verify Course belongs to the institute
    const course = await Program.findOne({ _id: courseId, institute: instituteId, isDeleted: false });
    if (!course) {
      return res.status(404).json({ message: 'Course not found in this institute' });
    }

    // Verify Faculty belongs to the institute
    const faculty = await Faculty.findOne({ _id: facultyId, institute: instituteId });
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty member not found in this institute' });
    }

    const liveClass = new LiveClass({
      instituteId,
      courseId,
      title,
      description: description || '',
      platform,
      meetingUrl,
      facultyId,
      startTime,
      endTime,
      status: status || 'upcoming'
    });

    const createdClass = await liveClass.save();

    // Notify students enrolled in this course if requested
    if (notifyStudents) {
      const enrollments = await Enrollment.find({
        programId: courseId,
        institute: instituteId,
        isActive: { $ne: false }
      });

      const notifications = enrollments.map(e => ({
        institute: instituteId,
        userId: e.studentId,
        targetType: 'user',
        programId: courseId,
        title: '🎥 New Live Class Scheduled',
        message: `"${title}" has been scheduled for course "${course.name}". Tap to view.`,
        url: '/student?tab=live-classes',
        type: 'live_class',
        read: false
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    res.status(201).json(createdClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an existing Live Class (Admin only)
export const updateLiveClass = async (req, res) => {
  const {
    courseId,
    title,
    description,
    platform,
    meetingUrl,
    facultyId,
    startTime,
    endTime,
    status,
    notifyStudents
  } = req.body;

  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // Check institute isolation
    if (String(liveClass.instituteId) !== String(req.user.institute)) {
      return res.status(403).json({ message: 'Forbidden: cross-tenant access denied' });
    }

    if (courseId) {
      const course = await Program.findOne({ _id: courseId, institute: req.user.institute, isDeleted: false });
      if (!course) return res.status(404).json({ message: 'Course not found' });
      liveClass.courseId = courseId;
    }

    if (facultyId) {
      const faculty = await Faculty.findOne({ _id: facultyId, institute: req.user.institute });
      if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
      liveClass.facultyId = facultyId;
    }

    liveClass.title = title || liveClass.title;
    liveClass.description = description !== undefined ? description : liveClass.description;
    liveClass.platform = platform || liveClass.platform;
    liveClass.meetingUrl = meetingUrl || liveClass.meetingUrl;
    liveClass.startTime = startTime || liveClass.startTime;
    liveClass.endTime = endTime || liveClass.endTime;
    liveClass.status = status || liveClass.status;

    const updatedClass = await liveClass.save();

    if (notifyStudents) {
      const enrollments = await Enrollment.find({
        programId: liveClass.courseId,
        institute: req.user.institute,
        isActive: { $ne: false }
      });

      const course = await Program.findById(liveClass.courseId);

      const notifications = enrollments.map(e => ({
        institute: req.user.institute,
        userId: e.studentId,
        targetType: 'user',
        programId: liveClass.courseId,
        title: '🎥 Live Class Rescheduled',
        message: `"${liveClass.title}" is now scheduled for ${new Date(liveClass.startTime).toLocaleString()}. Tap to view details.`,
        url: '/student?tab=live-classes',
        type: 'live_class',
        read: false
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    res.json(updatedClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a Live Class (Admin only)
export const deleteLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // Check institute isolation
    if (String(liveClass.instituteId) !== String(req.user.institute)) {
      return res.status(403).json({ message: 'Forbidden: cross-tenant access denied' });
    }

    await LiveClass.deleteOne({ _id: liveClass._id });
    await LiveAttendance.deleteMany({ liveClassId: liveClass._id });

    res.json({ message: 'Live class and related attendance records removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Live Classes
// Admin: returns all live classes in the institute
// Student: returns live classes for courses they are enrolled in
export const getLiveClasses = async (req, res) => {
  try {
    const instituteId = req.user.institute;
    if (!instituteId) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    if (req.user.role === 'admin' || req.user.role === 'owner') {
      const query = req.user.role === 'owner' ? {} : { instituteId };
      const liveClasses = await LiveClass.find(query)
        .populate('courseId', 'name thumbnail')
        .populate('facultyId', 'name avatar')
        .sort({ startTime: 1 });

      // For admin dashboard, we also aggregate the student attendance count per live class
      const liveClassIds = liveClasses.map(lc => lc._id);
      const attendanceCounts = await LiveAttendance.aggregate([
        { $match: { liveClassId: { $in: liveClassIds } } },
        { $group: { _id: '$liveClassId', count: { $sum: 1 } } }
      ]);

      const countMap = {};
      attendanceCounts.forEach(ac => {
        countMap[ac._id.toString()] = ac.count;
      });

      const classesWithAttendance = liveClasses.map(lc => {
        const obj = lc.toObject();
        obj.attendanceCount = countMap[lc._id.toString()] || 0;
        return obj;
      });

      return res.json(classesWithAttendance);
    }

    if (req.user.role === 'student') {
      // Find all enrolled / allowed program IDs using central helper
      const programIds = await getAccessiblePrograms(req.user);

      const liveClasses = await LiveClass.find({
        instituteId,
        courseId: { $in: programIds }
      })
        .populate('courseId', 'name thumbnail')
        .populate('facultyId', 'name avatar')
        .sort({ startTime: 1 });

      // Include whether student joined or not
      const attendances = await LiveAttendance.find({ studentId: req.user._id, liveClassId: { $in: liveClasses.map(c => c._id) } });
      const attendedSet = new Set(attendances.map(a => a.liveClassId.toString()));

      const classesWithAttendance = liveClasses.map(lc => {
        const obj = lc.toObject();
        obj.hasAttended = attendedSet.has(lc._id.toString());
        return obj;
      });

      return res.json(classesWithAttendance);
    }

    res.status(403).json({ message: 'Role not authorized' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Live Classes by Course Id (Student & Admin)
export const getLiveClassesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instituteId = req.user.institute;

    if (!instituteId) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    // Verify student has program/course access or user is an admin
    if (req.user.role === 'student') {
      const access = await verifyStudentAccess({
        user: req.user,
        programId: courseId
      });
      if (!access.granted) {
        return res.status(403).json({ message: access.reason || 'Forbidden: Not enrolled in this course' });
      }
    } else if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Forbidden: Unauthorized access' });
    }

    const liveClasses = await LiveClass.find({
      instituteId,
      courseId
    })
      .populate('courseId', 'name thumbnail')
      .populate('facultyId', 'name avatar')
      .sort({ startTime: 1 });

    if (req.user.role === 'student') {
      const attendances = await LiveAttendance.find({ studentId: req.user._id, liveClassId: { $in: liveClasses.map(c => c._id) } });
      const attendedSet = new Set(attendances.map(a => a.liveClassId.toString()));

      const classesWithAttendance = liveClasses.map(lc => {
        const obj = lc.toObject();
        obj.hasAttended = attendedSet.has(lc._id.toString());
        return obj;
      });
      return res.json(classesWithAttendance);
    }

    res.json(liveClasses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Join Live Class (Student only: Records attendance and returns target URL)
export const joinLiveClass = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Forbidden: student access required' });
    }

    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // Institute isolation check
    if (String(liveClass.instituteId) !== String(req.user.institute)) {
      return res.status(403).json({ message: 'Forbidden: cross-tenant access denied' });
    }

    // Access check (handles Enrollment, CourseAssignment, Purchase, courseName, etc.)
    const access = await verifyStudentAccess({
      user: req.user,
      programId: liveClass.courseId
    });

    if (!access.granted) {
      return res.status(403).json({ message: access.reason || 'Forbidden: Not enrolled in this course' });
    }

    // Record attendance (UPSERT: updates if already exists)
    await LiveAttendance.findOneAndUpdate(
      { liveClassId: liveClass._id, studentId: req.user._id },
      { joinedAt: new Date() },
      { upsert: true, new: true }
    );

    // Return URL
    res.json({ meetingUrl: liveClass.meetingUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Attendance Records for Admin
export const getLiveClassAttendance = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ message: 'Live class not found' });
    }

    // Check institute isolation
    if (String(liveClass.instituteId) !== String(req.user.institute)) {
      return res.status(403).json({ message: 'Forbidden: cross-tenant access denied' });
    }

    const attendance = await LiveAttendance.find({ liveClassId: liveClass._id })
      .populate('studentId', 'name email user_id avatar')
      .sort({ joinedAt: 1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
