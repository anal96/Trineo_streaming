import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { StudentAccess } from '../models/StudentAccess.js';
import { AccessPackage } from '../models/AccessPackage.js';
import { BatchAccess } from '../models/BatchAccess.js';
import { Purchase } from '../models/Purchase.js';

// Middleware permission check helper inside controller
const checkAdminOrOwner = (req) => {
  return req.user && (req.user.role === 'admin' || req.user.role === 'owner');
};

// 1. List students in the same institute
export const getStudents = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const query = { role: 'student', institute: req.user.institute };
    const students = await User.find(query).select('name email user_id batchName courseName status assignedPackage packageExpiryDate').populate('assignedPackage', 'name');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Direct Student Access Rules
export const getStudentAccessRules = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Forbidden: Admin access or self-query required' });
    }
    const rules = await StudentAccess.find({ studentId, institute: req.user.institute })
      .populate('courseId', 'title')
      .populate('lessonId', 'title');
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudentAccessRule = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const {
      studentId,
      courseId,
      subjectId,
      moduleId,
      lessonId,
      accessType,
      status,
      startDate,
      expiryDate
    } = req.body;

    if (!studentId || !courseId || !accessType) {
      return res.status(400).json({ message: 'studentId, courseId, and accessType are required.' });
    }

    if (!expiryDate) {
      return res.status(400).json({ message: 'Expiry date is required for all access grants.' });
    }

    if (accessType === 'course' && !startDate) {
      return res.status(400).json({ message: 'Expiry date is required for all access grants.' });
    }

    // Tenant safety check on student
    const student = await User.findOne({ _id: studentId, institute: req.user.institute });
    if (!student) {
      return res.status(404).json({ message: 'Student not found in this institute.' });
    }

    const query = {
      studentId,
      courseId,
      accessType,
      subjectId: subjectId || '',
      moduleId: moduleId || '',
      lessonId: lessonId || null,
      institute: req.user.institute
    };

    const update = {
      status,
      startDate: startDate || null,
      expiryDate: expiryDate || null
    };

    const rule = await StudentAccess.findOneAndUpdate(
      query,
      { $set: update },
      { upsert: true, new: true }
    );

    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Edit student access rule by document _id (PUT route)
export const editStudentAccessRuleById = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { id } = req.params;
    const { status, startDate, expiryDate } = req.body;

    if (!expiryDate) {
      return res.status(400).json({ message: 'Expiry date is required for all access grants.' });
    }

    const rule = await StudentAccess.findOne({ _id: id, institute: req.user.institute });
    if (!rule) {
      return res.status(404).json({ message: 'Access rule not found.' });
    }

    rule.status = status || rule.status;
    rule.startDate = startDate || null;
    rule.expiryDate = expiryDate || null;

    const saved = await rule.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStudentAccessRule = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { id } = req.params;
    const rule = await StudentAccess.findOneAndDelete({ _id: id, institute: req.user.institute });
    if (!rule) {
      return res.status(404).json({ message: 'Access rule not found.' });
    }
    res.json({ message: 'Access rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Package CRUD
export const getAccessPackages = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const packages = await AccessPackage.find({ institute: req.user.institute })
      .populate('courseIds', 'title')
      .populate('lessonIds', 'title');
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAccessPackage = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { name, description, courseIds, subjectIds, moduleIds, lessonIds } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Package name is required.' });
    }

    const pkg = new AccessPackage({
      name,
      description: description || '',
      courseIds: courseIds || [],
      subjectIds: subjectIds || [],
      moduleIds: moduleIds || [],
      lessonIds: lessonIds || [],
      institute: req.user.institute
    });

    const saved = await pkg.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAccessPackage = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { id } = req.params;
    const { name, description, courseIds, subjectIds, moduleIds, lessonIds } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Package name is required.' });
    }

    const pkg = await AccessPackage.findOne({ _id: id, institute: req.user.institute });
    if (!pkg) {
      return res.status(404).json({ message: 'Access Package not found.' });
    }

    pkg.name = name;
    pkg.description = description || '';
    pkg.courseIds = courseIds || [];
    pkg.subjectIds = subjectIds || [];
    pkg.moduleIds = moduleIds || [];
    pkg.lessonIds = lessonIds || [];

    const saved = await pkg.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAccessPackage = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { id } = req.params;
    const pkg = await AccessPackage.findOneAndDelete({ _id: id, institute: req.user.institute });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Clean up references in User model
    await User.updateMany(
      { assignedPackage: id, institute: req.user.institute },
      { $set: { assignedPackage: null, packageExpiryDate: null } }
    );

    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignPackageToStudent = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { studentId } = req.params;
    const { packageId, packageExpiryDate } = req.body;

    if (packageId && !packageExpiryDate) {
      return res.status(400).json({ message: 'Expiry date is required for all access grants.' });
    }

    const student = await User.findOne({ _id: studentId, institute: req.user.institute });
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (packageId) {
      const pkg = await AccessPackage.findOne({ _id: packageId, institute: req.user.institute });
      if (!pkg) {
        return res.status(404).json({ message: 'Access Package not found.' });
      }
    }

    student.assignedPackage = packageId || null;
    student.packageExpiryDate = packageExpiryDate ? new Date(packageExpiryDate) : null;
    await student.save();

    res.json({ message: 'Package assigned successfully', student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Batch Access CRUD
export const getBatchAccessRules = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const rules = await BatchAccess.find({ institute: req.user.institute })
      .populate('courseIds', 'title')
      .populate('lessonIds', 'title');
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBatchAccessRule = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { batchName, courseIds, subjectIds, moduleIds, lessonIds, status, startDate, expiryDate } = req.body;

    if (!batchName) {
      return res.status(400).json({ message: 'batchName is required.' });
    }

    if (!expiryDate) {
      return res.status(400).json({ message: 'Expiry date is required for all access grants.' });
    }

    const query = { batchName, institute: req.user.institute };
    const update = {
      courseIds: courseIds || [],
      subjectIds: subjectIds || [],
      moduleIds: moduleIds || [],
      lessonIds: lessonIds || [],
      status: status || 'active',
      startDate: startDate || null,
      expiryDate: expiryDate || null
    };

    const rule = await BatchAccess.findOneAndUpdate(
      query,
      { $set: update },
      { upsert: true, new: true }
    );

    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Edit batch access rule by document _id (PUT route)
export const editBatchAccessRuleById = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { id } = req.params;
    const { courseIds, subjectIds, moduleIds, lessonIds, status, startDate, expiryDate } = req.body;

    if (!expiryDate) {
      return res.status(400).json({ message: 'Expiry date is required for all access grants.' });
    }

    const rule = await BatchAccess.findOne({ _id: id, institute: req.user.institute });
    if (!rule) {
      return res.status(404).json({ message: 'Batch access rule not found.' });
    }

    rule.courseIds = courseIds || [];
    rule.subjectIds = subjectIds || [];
    rule.moduleIds = moduleIds || [];
    rule.lessonIds = lessonIds || [];
    rule.status = status || 'active';
    rule.startDate = startDate || null;
    rule.expiryDate = expiryDate || null;

    const saved = await rule.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBatchAccessRule = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { id } = req.params;
    const rule = await BatchAccess.findOneAndDelete({ _id: id, institute: req.user.institute });
    if (!rule) {
      return res.status(404).json({ message: 'Batch access rule not found.' });
    }
    res.json({ message: 'Batch access rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Distinct dynamic curriculum selectors
export const getCurriculumMeta = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { courseId } = req.params;

    const lessons = await Lesson.find({ courseId, institute: req.user.institute });
    
    // Dynamic mapping of distinct subjects & modules
    const subjects = [...new Set(lessons.map(l => l.subjectTitle || 'General'))];
    const modules = [...new Set(lessons.map(l => l.moduleTitle || 'Module 1'))];
    const lessonMeta = lessons.map(l => ({
      _id: l._id,
      title: l.title,
      subjectTitle: l.subjectTitle || 'General',
      moduleTitle: l.moduleTitle || 'Module 1'
    }));

    res.json({ subjects, modules, lessons: lessonMeta });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Access Analytics Reports
export const getAccessAnalytics = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const instituteId = req.user.institute;
    const now = new Date();

    // Students summary
    const totalStudents = await User.countDocuments({ role: 'student', institute: instituteId });
    const inactiveStudents = await User.countDocuments({ role: 'student', institute: instituteId, status: 'inactive' });
    
    // Direct Access rule totals
    const directLocksCount = await StudentAccess.countDocuments({
      institute: instituteId,
      status: { $in: ['locked', 'suspended', 'expired'] }
    });

    const activeDirectCount = await StudentAccess.countDocuments({
      institute: instituteId,
      status: 'active',
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: now } }
      ]
    });

    // Package subscriptions
    const packages = await AccessPackage.find({ institute: instituteId });
    const packageStats = [];
    for (const pkg of packages) {
      const studentCount = await User.countDocuments({
        role: 'student',
        institute: instituteId,
        assignedPackage: pkg._id,
        $or: [
          { packageExpiryDate: null },
          { packageExpiryDate: { $gte: now } }
        ]
      });
      packageStats.push({
        name: pkg.name,
        count: studentCount
      });
    }

    // Sort by count descending
    packageStats.sort((a, b) => b.count - a.count);

    // Expired packages summary
    const expiredPackagesCount = await User.countDocuments({
      role: 'student',
      institute: instituteId,
      assignedPackage: { $ne: null },
      packageExpiryDate: { $lt: now }
    });

    // Total active packages summary
    const activePackagesCount = await User.countDocuments({
      role: 'student',
      institute: instituteId,
      assignedPackage: { $ne: null },
      $or: [
        { packageExpiryDate: null },
        { packageExpiryDate: { $gte: now } }
      ]
    });

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // 1. Student overrides expiring in 7 days
    const upcomingStudentOverrides = await StudentAccess.find({
      institute: instituteId,
      status: 'active',
      expiryDate: { $gte: now, $lte: sevenDaysLater }
    }).populate('studentId', 'name email user_id').populate('courseId', 'title');

    // 2. Student packages expiring in 7 days
    const upcomingUserPackages = await User.find({
      role: 'student',
      institute: instituteId,
      assignedPackage: { $ne: null },
      packageExpiryDate: { $gte: now, $lte: sevenDaysLater }
    }).populate('assignedPackage', 'name');

    // 3. Batch access rules expiring in 7 days
    const upcomingBatchRules = await BatchAccess.find({
      institute: instituteId,
      status: 'active',
      expiryDate: { $gte: now, $lte: sevenDaysLater }
    });

    const upcomingExpirationsList = [
      ...upcomingStudentOverrides.map(o => ({
        type: 'override',
        studentName: o.studentId?.name || 'N/A',
        studentId: o.studentId?.user_id || 'N/A',
        target: o.accessType === 'lesson' ? `Lesson` : o.accessType === 'module' ? `Module` : o.accessType === 'subject' ? `Subject` : `Course: ${o.courseId?.title}`,
        expiryDate: o.expiryDate
      })),
      ...upcomingUserPackages.map(u => ({
        type: 'package',
        studentName: u.name,
        studentId: u.user_id,
        target: `Package: ${u.assignedPackage?.name || 'N/A'}`,
        expiryDate: u.packageExpiryDate
      })),
      ...upcomingBatchRules.map(b => ({
        type: 'batch',
        studentName: 'Entire Batch',
        studentId: b.batchName,
        target: `Batch Rule`,
        expiryDate: b.expiryDate
      }))
    ];

    // Expired student overrides
    const expiredStudentOverrides = await StudentAccess.find({
      institute: instituteId,
      $or: [
        { status: 'expired' },
        { expiryDate: { $lt: now } }
      ]
    }).populate('studentId', 'name email user_id').populate('courseId', 'title');

    const expiredOverridesList = expiredStudentOverrides.map(o => ({
      _id: o._id,
      studentName: o.studentId?.name || 'N/A',
      studentId: o.studentId?.user_id || 'N/A',
      target: o.accessType === 'lesson' ? `Lesson` : o.accessType === 'module' ? `Module` : o.accessType === 'subject' ? `Subject` : `Course: ${o.courseId?.title}`,
      expiryDate: o.expiryDate,
      status: o.status
    }));

    res.json({
      totalStudents,
      inactiveStudents,
      activeDirectCount,
      directLocksCount,
      activePackagesCount,
      expiredPackagesCount,
      popularPackages: packageStats.slice(0, 5),
      upcomingExpirations: upcomingExpirationsList,
      expiredOverrides: expiredOverridesList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
