import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Program } from '../models/Program.js';
import { Subject } from '../models/Subject.js';
import { Unit } from '../models/Unit.js';
import { Lesson } from '../models/Lesson.js';
import { StudentContentAccess } from '../models/StudentContentAccess.js';
import { StudentAccess } from '../models/StudentAccess.js';

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
    const students = await User.find(query).select('name email user_id batchName status packageExpiryDate program courseName phone branchName enrollmentDate');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Edit student status/expiry directly
// Helper to calculate student access status based on active state and expiry date
function calculateAccessStatus(userStatus, expiryDate) {
  if (userStatus === 'inactive') return 'suspended';
  if (!expiryDate) return 'active';
  return new Date(expiryDate) < new Date()
    ? 'expired'
    : 'active';
}

export const editStudentAccessRuleById = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { id } = req.params; // student user _id
    const { status, packageExpiryDate } = req.body;

    const student = await User.findOne({ _id: id, institute: req.user.institute });
    if (!student) {
      return res.status(404).json({ message: 'Student not found in this institute.' });
    }

    if (status !== undefined) student.status = status;
    if (packageExpiryDate !== undefined) {
      student.packageExpiryDate = packageExpiryDate ? new Date(packageExpiryDate) : null;
    }

    const saved = await student.save();

    // Synchronize direct permission rules
    const targetExpiry = student.packageExpiryDate;
    const targetStatus = calculateAccessStatus(student.status, targetExpiry);

    await StudentAccess.updateMany(
      { studentId: student._id },
      {
        $set: {
          expiryDate: targetExpiry,
          status: targetStatus
        }
      }
    );

    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Bulk status update
export const bulkToggleAccess = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { studentIds, status } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required.' });
    }
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required.' });
    }

    await User.updateMany(
      { _id: { $in: studentIds }, institute: req.user.institute, role: 'student' },
      { $set: { status } }
    );

    // Sync all related StudentAccess records using the status mapping table
    const students = await User.find({ _id: { $in: studentIds }, institute: req.user.institute, role: 'student' });
    const bulkOps = [];
    for (const student of students) {
      const targetStatus = calculateAccessStatus(status, student.packageExpiryDate);
      bulkOps.push({
        updateMany: {
          filter: { studentId: student._id },
          update: { $set: { status: targetStatus } }
        }
      });
    }

    if (bulkOps.length > 0) {
      await StudentAccess.bulkWrite(bulkOps);
    }

    res.json({ success: true, message: `Successfully updated status to ${status} for ${studentIds.length} students.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Bulk set expiry date
export const bulkSetExpiry = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { studentIds, packageExpiryDate } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required.' });
    }

    const expiry = packageExpiryDate ? new Date(packageExpiryDate) : null;

    await User.updateMany(
      { _id: { $in: studentIds }, institute: req.user.institute, role: 'student' },
      { $set: { packageExpiryDate: expiry } }
    );

    // Sync to related StudentAccess records
    const students = await User.find({ _id: { $in: studentIds }, institute: req.user.institute, role: 'student' });
    const bulkOps = [];
    for (const student of students) {
      const targetStatus = calculateAccessStatus(student.status, expiry);
      bulkOps.push({
        updateMany: {
          filter: { studentId: student._id },
          update: { $set: { expiryDate: expiry, status: targetStatus } }
        }
      });
    }

    if (bulkOps.length > 0) {
      await StudentAccess.bulkWrite(bulkOps);
    }

    res.json({ success: true, message: `Successfully updated expiry date for ${studentIds.length} students.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Bulk extend expiry date (e.g. by 30 or 90 days)
export const bulkExtendExpiry = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { studentIds, days } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required.' });
    }
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum)) {
      return res.status(400).json({ message: 'Valid days parameter is required.' });
    }

    const students = await User.find({ _id: { $in: studentIds }, institute: req.user.institute, role: 'student' });
    
    const userBulkOps = [];
    const studentBulkOps = [];

    for (const student of students) {
      let currentExpiry = student.packageExpiryDate ? new Date(student.packageExpiryDate) : new Date();
      if (isNaN(currentExpiry.getTime()) || currentExpiry < new Date()) {
        currentExpiry = new Date();
      }
      currentExpiry.setDate(currentExpiry.getDate() + daysNum);
      
      userBulkOps.push({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { packageExpiryDate: currentExpiry } }
        }
      });

      const targetStatus = calculateAccessStatus(student.status, currentExpiry);
      studentBulkOps.push({
        updateMany: {
          filter: { studentId: student._id },
          update: { $set: { expiryDate: currentExpiry, status: targetStatus } }
        }
      });
    }

    if (userBulkOps.length > 0) {
      await User.bulkWrite(userBulkOps);
    }

    if (studentBulkOps.length > 0) {
      await StudentAccess.bulkWrite(studentBulkOps);
    }

    res.json({ success: true, message: `Successfully extended access by ${daysNum} days for ${students.length} students.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Get Data Health summary analytics
export const getAccessAnalytics = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const instituteId = req.user.institute;
    const now = new Date();

    const students = await User.find({ role: 'student', institute: instituteId });

    let validRules = 0;
    let requiringReview = 0;
    let expiringWithin7Days = 0;
    let suspendedRules = 0;
    let expiredRules = 0;

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    for (const student of students) {
      const isSuspended = student.status !== 'active';
      const isExpired = student.packageExpiryDate && new Date(student.packageExpiryDate) <= now;
      const isExpiringSoon = student.packageExpiryDate && 
                             new Date(student.packageExpiryDate) > now && 
                             new Date(student.packageExpiryDate) <= sevenDaysLater;

      // Rules Requiring Review (e.g. status is active, but missing program/batch or invalid/missing expiry)
      const isInvalidExpiry = !student.packageExpiryDate || isNaN(new Date(student.packageExpiryDate).getTime());
      const isMissingProgram = !student.program && !student.courseName;

      if (isSuspended) {
        suspendedRules++;
      } else if (isExpired) {
        expiredRules++;
      } else {
        // Active & not expired
        validRules++;
        if (isExpiringSoon) {
          expiringWithin7Days++;
        }
      }

      if (isMissingProgram || isInvalidExpiry) {
        requiringReview++;
      }
    }

    res.json({
      validRules,
      requiringReview,
      expiringWithin7Days,
      suspendedRules,
      expiredRules
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 7. Get content access restrictions list and hierarchy tree for a student
export const getStudentRestrictions = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { studentId } = req.params;
    const student = await User.findOne({ _id: studentId, institute: req.user.institute });
    if (!student) {
      return res.status(404).json({ message: 'Student not found in this institute.' });
    }

    // Resolve program/batch the student belongs to
    const batchName = student.program || student.courseName;
    if (!batchName) {
      return res.json({
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          user_id: student.user_id,
          batchName: 'N/A',
          status: student.status
        },
        restrictions: [],
        hierarchy: null
      });
    }

    const program = await Program.findOne({ name: batchName, institute: req.user.institute, isDeleted: false });
    if (!program) {
      return res.json({
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          user_id: student.user_id,
          batchName: batchName,
          status: student.status
        },
        restrictions: [],
        hierarchy: null
      });
    }

    // Get the syllabus hierarchy
    const subjects = await Subject.find({ programId: program._id, isDeleted: false }).sort({ displayOrder: 1 });
    const subjectIds = subjects.map(s => s._id);
    const units = await Unit.find({ subjectId: { $in: subjectIds }, isDeleted: false }).sort({ displayOrder: 1 });
    const unitIds = units.map(u => u._id);
    const lessons = await Lesson.find({ unitId: { $in: unitIds }, isDeleted: false }).sort({ order: 1 });

    // Fetch existing restrictions
    const restrictions = await StudentContentAccess.find({
      studentId: student._id,
      batchId: program._id
    });

    res.json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        user_id: student.user_id,
        batchName: batchName,
        status: student.status
      },
      program: {
        id: program._id,
        name: program.name
      },
      restrictions,
      hierarchy: {
        subjects: subjects.map(s => {
          const subUnits = units.filter(u => u.subjectId.toString() === s._id.toString()).map(u => {
            const unitLessons = lessons.filter(l => l.unitId.toString() === u._id.toString()).map(l => ({
              id: l._id,
              title: l.title
            }));
            return {
              id: u._id,
              name: u.name,
              lessons: unitLessons
            };
          });
          return {
            id: s._id,
            subjectCode: s.subjectCode,
            subjectName: s.subjectName,
            units: subUnits
          };
        })
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 8. Toggle student block/allow restriction for a specific node
export const toggleStudentRestriction = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { studentId } = req.params;
    const { batchId, subjectId, unitId, topicId, status } = req.body;

    if (!batchId || !status || !['allowed', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'batchId and valid status are required.' });
    }

    const student = await User.findOne({ _id: studentId, institute: req.user.institute });
    if (!student) {
      return res.status(404).json({ message: 'Student not found in this institute.' });
    }

    const query = {
      studentId: student._id,
      batchId: new mongoose.Types.ObjectId(batchId),
      subjectId: subjectId ? new mongoose.Types.ObjectId(subjectId) : null,
      unitId: unitId ? new mongoose.Types.ObjectId(unitId) : null,
      topicId: topicId ? new mongoose.Types.ObjectId(topicId) : null
    };

    if (status === 'allowed') {
      await StudentContentAccess.deleteOne(query);
      return res.json({ success: true, message: 'Access allowed (restriction removed).' });
    } else {
      const update = {
        institute: req.user.institute,
        status: 'blocked'
      };
      const result = await StudentContentAccess.findOneAndUpdate(
        query,
        { $set: update },
        { upsert: true, new: true }
      );
      return res.json({ success: true, restriction: result });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 9. Apply bulk Quick Action to student access
export const applyQuickAction = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { studentId } = req.params;
    const { batchId, action } = req.body;

    if (!batchId || !action) {
      return res.status(400).json({ message: 'batchId and action are required.' });
    }

    const student = await User.findOne({ _id: studentId, institute: req.user.institute });
    if (!student) {
      return res.status(404).json({ message: 'Student not found in this institute.' });
    }

    if (req.user.role !== 'owner') {
      const programObj = await Program.findOne({ _id: batchId, institute: req.user.institute });
      if (!programObj) {
        return res.status(404).json({ message: 'Batch not found in this institute.' });
      }
    }

    const studentObjId = student._id;
    const programObjId = new mongoose.Types.ObjectId(batchId);

    if (action === 'allow_all') {
      await StudentContentAccess.deleteMany({
        studentId: studentObjId,
        batchId: programObjId
      });
      return res.json({ success: true, message: 'Cleared all restrictions.' });
    }

    if (action === 'block_all' || action === 'block_batch') {
      await StudentContentAccess.deleteMany({
        studentId: studentObjId,
        batchId: programObjId
      });
      await StudentContentAccess.create({
        institute: req.user.institute,
        studentId: studentObjId,
        batchId: programObjId,
        status: 'blocked'
      });
      return res.json({ success: true, message: 'Blocked entire batch.' });
    }

    if (action === 'block_subject') {
      const subjects = await Subject.find({ programId: programObjId, isDeleted: false });
      const bulkOps = subjects.map(s => ({
        updateOne: {
          filter: {
            studentId: studentObjId,
            batchId: programObjId,
            subjectId: s._id,
            unitId: null,
            topicId: null
          },
          update: {
            $set: {
              institute: req.user.institute,
              status: 'blocked'
            }
          },
          upsert: true
        }
      }));
      if (bulkOps.length > 0) {
        await StudentContentAccess.bulkWrite(bulkOps);
      }
      return res.json({ success: true, message: `Blocked all ${subjects.length} subjects.` });
    }

    if (action === 'block_unit') {
      const subjects = await Subject.find({ programId: programObjId, isDeleted: false });
      const subjectIds = subjects.map(s => s._id);
      const units = await Unit.find({ subjectId: { $in: subjectIds }, isDeleted: false });
      const bulkOps = [];
      
      for (const u of units) {
        bulkOps.push({
          updateOne: {
            filter: {
              studentId: studentObjId,
              batchId: programObjId,
              subjectId: u.subjectId,
              unitId: u._id,
              topicId: null
            },
            update: {
              $set: {
                institute: req.user.institute,
                status: 'blocked'
              }
            },
            upsert: true
          }
        });
      }
      if (bulkOps.length > 0) {
        await StudentContentAccess.bulkWrite(bulkOps);
      }
      return res.json({ success: true, message: `Blocked all ${units.length} units.` });
    }

    if (action === 'block_topic') {
      const subjects = await Subject.find({ programId: programObjId, isDeleted: false });
      const subjectIds = subjects.map(s => s._id);
      const units = await Unit.find({ subjectId: { $in: subjectIds }, isDeleted: false });
      const unitIds = units.map(u => u._id);
      const lessons = await Lesson.find({ unitId: { $in: unitIds }, isDeleted: false });
      const bulkOps = [];

      for (const l of lessons) {
        const unit = units.find(u => u._id.toString() === l.unitId.toString());
        if (unit) {
          bulkOps.push({
            updateOne: {
              filter: {
                studentId: studentObjId,
                batchId: programObjId,
                subjectId: unit.subjectId,
                unitId: unit._id,
                topicId: l._id
              },
              update: {
                $set: {
                  institute: req.user.institute,
                  status: 'blocked'
                }
              },
              upsert: true
            }
          });
        }
      }
      if (bulkOps.length > 0) {
        await StudentContentAccess.bulkWrite(bulkOps);
      }
      return res.json({ success: true, message: `Blocked all ${lessons.length} topics.` });
    }

    return res.status(400).json({ message: 'Invalid quick action.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 10. Bulk toggle content restriction for multiple students
export const bulkToggleRestriction = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { studentIds, batchId, subjectId, unitId, topicId, status } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required.' });
    }
    if (!batchId || !status || !['allowed', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'batchId and valid status are required.' });
    }

    const programObjId = new mongoose.Types.ObjectId(batchId);
    let successCount = 0;

    for (const sid of studentIds) {
      const student = await User.findOne({ _id: sid, institute: req.user.institute, role: 'student' });
      if (!student) continue;

      const query = {
        studentId: student._id,
        batchId: programObjId,
        subjectId: subjectId ? new mongoose.Types.ObjectId(subjectId) : null,
        unitId: unitId ? new mongoose.Types.ObjectId(unitId) : null,
        topicId: topicId ? new mongoose.Types.ObjectId(topicId) : null
      };

      if (status === 'allowed') {
        await StudentContentAccess.deleteOne(query);
      } else {
        await StudentContentAccess.findOneAndUpdate(
          query,
          { $set: { institute: req.user.institute, status: 'blocked' } },
          { upsert: true, new: true }
        );
      }
      successCount++;
    }

    res.json({ success: true, message: `Access updated for ${successCount} students.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 11. Bulk quick action for multiple students
export const bulkQuickAction = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { studentIds, batchId, action } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required.' });
    }
    if (!batchId || !action) {
      return res.status(400).json({ message: 'batchId and action are required.' });
    }

    if (req.user.role !== 'owner') {
      const programObj = await Program.findOne({ _id: batchId, institute: req.user.institute });
      if (!programObj) {
        return res.status(404).json({ message: 'Batch not found in this institute.' });
      }
    }

    const programObjId = new mongoose.Types.ObjectId(batchId);
    const instituteId = req.user.institute;

    // Pre-fetch hierarchy data once (shared across all students)
    let subjects = [], units = [], lessons = [];
    if (['block_subject', 'block_unit', 'block_topic'].includes(action)) {
      subjects = await Subject.find({ programId: programObjId, isDeleted: false });
      const subjectIds = subjects.map(s => s._id);
      if (['block_unit', 'block_topic'].includes(action)) {
        units = await Unit.find({ subjectId: { $in: subjectIds }, isDeleted: false });
        if (action === 'block_topic') {
          const unitIds = units.map(u => u._id);
          lessons = await Lesson.find({ unitId: { $in: unitIds }, isDeleted: false });
        }
      }
    }

    // Validate all student IDs belong to the institute
    const validStudents = await User.find({
      _id: { $in: studentIds },
      institute: instituteId,
      role: 'student'
    }).select('_id');
    const validIds = validStudents.map(s => s._id);

    if (validIds.length === 0) {
      return res.status(404).json({ message: 'No valid students found.' });
    }

    if (action === 'allow_all') {
      await StudentContentAccess.deleteMany({
        studentId: { $in: validIds },
        batchId: programObjId
      });
      return res.json({ success: true, message: `Cleared all restrictions for ${validIds.length} students.` });
    }

    if (action === 'block_all' || action === 'block_batch') {
      // Clear existing then create batch-level block for each student
      await StudentContentAccess.deleteMany({
        studentId: { $in: validIds },
        batchId: programObjId
      });
      const docs = validIds.map(sid => ({
        institute: instituteId,
        studentId: sid,
        batchId: programObjId,
        status: 'blocked'
      }));
      await StudentContentAccess.insertMany(docs);
      return res.json({ success: true, message: `Blocked entire batch for ${validIds.length} students.` });
    }

    if (action === 'block_subject') {
      const bulkOps = [];
      for (const sid of validIds) {
        for (const s of subjects) {
          bulkOps.push({
            updateOne: {
              filter: { studentId: sid, batchId: programObjId, subjectId: s._id, unitId: null, topicId: null },
              update: { $set: { institute: instituteId, status: 'blocked' } },
              upsert: true
            }
          });
        }
      }
      if (bulkOps.length > 0) await StudentContentAccess.bulkWrite(bulkOps);
      return res.json({ success: true, message: `Blocked all subjects for ${validIds.length} students.` });
    }

    if (action === 'block_unit') {
      const bulkOps = [];
      for (const sid of validIds) {
        for (const u of units) {
          bulkOps.push({
            updateOne: {
              filter: { studentId: sid, batchId: programObjId, subjectId: u.subjectId, unitId: u._id, topicId: null },
              update: { $set: { institute: instituteId, status: 'blocked' } },
              upsert: true
            }
          });
        }
      }
      if (bulkOps.length > 0) await StudentContentAccess.bulkWrite(bulkOps);
      return res.json({ success: true, message: `Blocked all units for ${validIds.length} students.` });
    }

    if (action === 'block_topic') {
      const bulkOps = [];
      for (const sid of validIds) {
        for (const l of lessons) {
          const unit = units.find(u => u._id.toString() === l.unitId.toString());
          if (unit) {
            bulkOps.push({
              updateOne: {
                filter: { studentId: sid, batchId: programObjId, subjectId: unit.subjectId, unitId: unit._id, topicId: l._id },
                update: { $set: { institute: instituteId, status: 'blocked' } },
                upsert: true
              }
            });
          }
        }
      }
      if (bulkOps.length > 0) await StudentContentAccess.bulkWrite(bulkOps);
      return res.json({ success: true, message: `Blocked all topics for ${validIds.length} students.` });
    }

    return res.status(400).json({ message: 'Invalid quick action.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 12. Get hierarchy for a given batch (program) - used for bulk controls
export const getBatchHierarchy = async (req, res) => {
  try {
    if (!checkAdminOrOwner(req)) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { batchName } = req.params;
    if (!batchName) {
      return res.status(400).json({ message: 'batchName is required.' });
    }

    const program = await Program.findOne({ name: batchName, institute: req.user.institute, isDeleted: false });
    if (!program) {
      return res.json({ program: null, hierarchy: null });
    }

    const subjects = await Subject.find({ programId: program._id, isDeleted: false }).sort({ displayOrder: 1 });
    const subjectIds = subjects.map(s => s._id);
    const units = await Unit.find({ subjectId: { $in: subjectIds }, isDeleted: false }).sort({ displayOrder: 1 });
    const unitIds = units.map(u => u._id);
    const lessons = await Lesson.find({ unitId: { $in: unitIds }, isDeleted: false }).sort({ order: 1 });

    res.json({
      program: { id: program._id, name: program.name },
      hierarchy: {
        subjects: subjects.map(s => {
          const subUnits = units.filter(u => u.subjectId.toString() === s._id.toString()).map(u => {
            const unitLessons = lessons.filter(l => l.unitId.toString() === u._id.toString()).map(l => ({
              id: l._id,
              title: l.title
            }));
            return { id: u._id, name: u.name, lessons: unitLessons };
          });
          return { id: s._id, subjectCode: s.subjectCode, subjectName: s.subjectName, units: subUnits };
        })
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 13. Get all access overrides & content restrictions for a student
export const getStudentAccessRules = async (req, res) => {
  try {
    const { studentId } = req.params;

    const isSelf = req.user._id.toString() === studentId;
    const isStaff = ['admin', 'owner', 'faculty'].includes(req.user.role);

    if (!isSelf && !isStaff) {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    if (isStaff && req.user.role !== 'owner') {
      const studentExists = await User.findOne({ _id: studentId, institute: req.user.institute });
      if (!studentExists) {
        return res.status(404).json({ message: 'Student not found in this institute.' });
      }
    }

    const overrides = await StudentAccess.find({ studentId })
      .populate('programId')
      .populate('subjectId');

    const mappedOverrides = overrides.map(rule => {
      const courseObj = rule.programId ? {
        _id: rule.programId._id,
        title: rule.programId.title || rule.programId.name || 'Unknown Batch'
      } : null;

      const subjectNameStr = rule.subjectId ? (rule.subjectId.name || rule.subjectId.title || rule.subjectId.subjectName || String(rule.subjectId._id || rule.subjectId)) : '';

      return {
        _id: rule._id,
        accessType: rule.accessLevel === 'program' ? 'course' : rule.accessLevel,
        courseId: courseObj,
        subjectId: subjectNameStr,
        status: rule.status,
        expiryDate: rule.expiryDate,
        createdAt: rule.createdAt
      };
    });

    const blocks = await StudentContentAccess.find({ studentId, status: 'blocked' })
      .populate('batchId')
      .populate('subjectId')
      .populate('unitId')
      .populate('topicId');

    const mappedBlocks = blocks.map(rule => {
      const accessType = rule.topicId ? 'lesson' : (rule.unitId ? 'module' : (rule.subjectId ? 'subject' : 'course'));
      
      const courseObj = rule.batchId ? {
        _id: rule.batchId._id,
        title: rule.batchId.title || rule.batchId.name || 'Unknown Batch'
      } : null;

      const lessonObj = rule.topicId ? {
        _id: rule.topicId._id,
        title: rule.topicId.title || ''
      } : null;

      const moduleIdStr = rule.unitId ? (rule.unitId.name || rule.unitId.title || '') : '';
      const subjectNameStr = rule.subjectId ? (rule.subjectId.name || rule.subjectId.title || rule.subjectId.subjectName || '') : '';

      return {
        _id: rule._id,
        accessType,
        courseId: courseObj,
        lessonId: lessonObj,
        moduleId: moduleIdStr,
        subjectId: subjectNameStr,
        status: 'locked',
        expiryDate: null,
        createdAt: rule.createdAt
      };
    });

    const allRules = [...mappedOverrides, ...mappedBlocks];
    res.json(allRules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

