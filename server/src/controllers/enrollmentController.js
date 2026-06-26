import { Enrollment } from '../models/Enrollment.js';
import { Program } from '../models/Program.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';

const requireInstitute = (req, res) => {
  if (req.user.role === 'owner') return true;
  if (!req.user.institute) {
    res.status(403).json({ message: 'Forbidden: institute access required' });
    return false;
  }
  return true;
};

const instituteFilter = (req) => (req.user.role === 'owner' ? {} : { institute: req.user.institute });

export const enrollInProgram = async (req, res) => {
  const programId = req.body.programId || req.body.courseId;
  const studentId = req.user._id;

  try {
    if (!requireInstitute(req, res)) return;

    const program = await Program.findOne({ _id: programId, ...instituteFilter(req), isDeleted: false });
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const existing = await Enrollment.findOne({ studentId, programId, ...instituteFilter(req) });
    if (existing && existing.status === 'active') {
      return res.status(400).json({ message: 'Program access already active' });
    }

    let enrollment;
    if (existing) {
      existing.status = 'active';
      existing.enrolledAt = Date.now();
      enrollment = await existing.save();
    } else {
      enrollment = await Enrollment.create({
        institute: req.user.institute,
        studentId,
        programId,
        status: 'active'
      });
    }

    await Notification.create({
      userId: studentId,
      targetType: 'user',
      institute: req.user.institute,
      message: `Enrolled successfully in program: ${program.name}`,
      type: 'enrollment'
    });

    res.status(201).json({
      message: 'Enrolled successfully',
      enrollment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEnrollments = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    if (req.user.role !== 'student') {
      // For owners and admins, fetch all enrollments in the institute
      const filter = instituteFilter(req);
      const enrollments = await Enrollment.find(filter)
        .populate('studentId', 'name email phone')
        .populate('programId', 'name');
      return res.json(enrollments);
    }

    // For students, fetch all their enrollments
    const enrollments = await Enrollment.find({ studentId: req.user._id, ...instituteFilter(req) })
      .populate('programId');

    const enrolledPrograms = enrollments.map(e => {
      if (!e.programId || e.programId.isDeleted) return null;
      const progObj = e.programId.toObject();
      progObj.title = progObj.name;
      progObj.isEnrolled = e.status === 'active';
      progObj.enrollmentStatus = e.status;
      return progObj;
    }).filter(p => p !== null);

    res.json(enrolledPrograms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminAssignProgram = async (req, res) => {
  const programId = req.body.programId || req.body.courseId;
  const { studentId } = req.body;

  try {
    if (!requireInstitute(req, res)) return;

    const student = await User.findOne({ _id: studentId, ...instituteFilter(req) });
    const program = await Program.findOne({ _id: programId, ...instituteFilter(req), isDeleted: false });

    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const existing = await Enrollment.findOne({ studentId, programId, ...instituteFilter(req) });
    if (existing && existing.status === 'active') {
      return res.status(400).json({ message: 'Student is already enrolled' });
    }

    if (existing) {
      existing.status = 'active';
      existing.enrolledAt = Date.now();
      await existing.save();
    } else {
      await Enrollment.create({
        institute: req.user.institute,
        studentId,
        programId,
        status: 'active'
      });
    }

    await Notification.create({
      userId: studentId,
      targetType: 'user',
      institute: req.user.institute,
      message: `You were enrolled in program "${program.name}" by the institute admin.`,
      type: 'enrollment'
    });

    res.status(201).json({ message: 'Program assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminRemoveProgram = async (req, res) => {
  const programId = req.body.programId || req.body.courseId;
  const { studentId } = req.body;

  try {
    if (!requireInstitute(req, res)) return;

    // Soft suspension or hard delete of enrollment record
    const removed = await Enrollment.findOneAndDelete({ studentId, programId, ...instituteFilter(req) });
    if (!removed) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    await Notification.create({
      userId: studentId,
      targetType: 'user',
      institute: req.user.institute,
      message: `Your enrollment for the selected program was removed by the institute admin.`,
      type: 'system'
    });

    res.json({ message: 'Program enrollment removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminBulkEnroll = async (req, res) => {
  const programId = req.body.programId || req.body.courseId;
  const { studentIds = [] } = req.body;

  try {
    if (!requireInstitute(req, res)) return;

    const program = await Program.findOne({ _id: programId, ...instituteFilter(req), isDeleted: false });
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const results = await Promise.all(studentIds.map(async (studentId) => {
      const student = await User.findOne({ _id: studentId, ...instituteFilter(req) });
      if (!student || student.role !== 'student') {
        return { studentId, status: 'skipped' };
      }

      const existing = await Enrollment.findOne({ studentId, programId, ...instituteFilter(req) });
      if (existing && existing.status === 'active') {
        return { studentId, status: 'already-enrolled' };
      }

      if (existing) {
        existing.status = 'active';
        existing.enrolledAt = Date.now();
        await existing.save();
      } else {
        await Enrollment.create({
          institute: req.user.institute,
          studentId,
          programId,
          status: 'active'
        });
      }

      await Notification.create({
        userId: studentId,
        targetType: 'user',
        institute: req.user.institute,
        message: `You were enrolled in program "${program.name}" through a bulk admin enrollment.`,
        type: 'enrollment'
      });

      return { studentId, status: 'enrolled' };
    }));

    res.json({ message: 'Bulk enrollment completed', results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
