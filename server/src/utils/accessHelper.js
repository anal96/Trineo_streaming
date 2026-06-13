import mongoose from 'mongoose';
import { StudentAccess } from '../models/StudentAccess.js';
import { AccessPackage } from '../models/AccessPackage.js';
import { BatchAccess } from '../models/BatchAccess.js';
import { Purchase } from '../models/Purchase.js';
import { CourseAssignment } from '../models/CourseAssignment.js';

export const verifyStudentAccess = async ({ user, courseId, subjectTitle, moduleTitle, lessonId }) => {
  if (!user) {
    return { granted: false, reason: 'Unauthorized access', status: 'locked' };
  }

  // Owner and Admin bypass all restrictions
  if (user.role === 'owner' || user.role === 'admin') {
    return { granted: true, source: 'role' };
  }

  // Suspended or inactive user status
  if (user.status !== 'active') {
    return { granted: false, reason: 'Student account is suspended or inactive.', status: 'suspended' };
  }

  const studentId = user._id;
  const instituteId = user.institute;
  const now = new Date();

  // Primary Integration Access Check (CourseAssignment)
  if (mongoose.Types.ObjectId.isValid(studentId) && mongoose.Types.ObjectId.isValid(courseId)) {
    try {
      const assignment = await CourseAssignment.findOne({
        student: studentId,
        courseId
      });
      if (assignment) {
        return { granted: true, source: 'assignment' };
      }
    } catch (err) {
      console.error('Error in primary integration access check:', err);
    }
  }

  // Fetch all direct accesses for this student in this institute and course
  const directAccesses = await StudentAccess.find({
    studentId,
    courseId,
    institute: instituteId
  });

  // Helper helper to filter direct records that target a specific resource level or higher
  const getMatchingDirect = () => {
    return directAccesses.filter(access => {
      if (access.accessType === 'course') {
        return true;
      }
      if (access.accessType === 'subject' && subjectTitle && access.subjectId === subjectTitle) {
        return true;
      }
      if (access.accessType === 'module' && moduleTitle && access.moduleId === moduleTitle) {
        return true;
      }
      if (access.accessType === 'lesson' && lessonId && access.lessonId && access.lessonId.toString() === lessonId.toString()) {
        return true;
      }
      return false;
    });
  };

  // 1. Direct Negatives (Explicit Locks / Suspension / Expiration)
  // Check if there is any explicit block (locked/suspended/expired) matching the target hierarchy
  const relevantDirects = getMatchingDirect();
  
  const blockRecord = relevantDirects.find(d => 
    d.status === 'locked' || 
    d.status === 'suspended' || 
    d.status === 'expired' ||
    (d.expiryDate && new Date(d.expiryDate) < now) ||
    (d.startDate && new Date(d.startDate) > now)
  );

  if (blockRecord) {
    let status = 'locked';
    let reason = `🔒 ${blockRecord.accessType.charAt(0).toUpperCase() + blockRecord.accessType.slice(1)} Locked`;
    if (blockRecord.accessType === 'course') {
      reason = '🔒 Course Locked. Please contact your institute for access.';
    } else if (blockRecord.accessType === 'subject') {
      reason = '🔒 Subject Locked. Access not activated by your institute.';
    }
    
    if (blockRecord.status === 'suspended') {
      status = 'suspended';
      reason = '🔒 Access Suspended';
    } else if (blockRecord.status === 'expired' || (blockRecord.expiryDate && new Date(blockRecord.expiryDate) < now)) {
      status = 'expired';
      reason = 'Your access has expired. Please contact the institute.';
    } else if (blockRecord.startDate && new Date(blockRecord.startDate) > now) {
      status = 'locked';
      reason = '🔒 Access not yet active';
    }
    return { granted: false, reason, status, level: blockRecord.accessType };
  }

  // 2. Direct Positives (Explicit Active Grants)
  // If there's an active direct grant at lesson, module, subject, or course level
  const activeRecord = relevantDirects.find(d => 
    d.status === 'active' && 
    (!d.startDate || new Date(d.startDate) <= now) && 
    (!d.expiryDate || new Date(d.expiryDate) >= now)
  );

  if (activeRecord) {
    return { granted: true, source: 'direct_grant', level: activeRecord.accessType };
  }

  // 3. Access Package
  if (user.assignedPackage) {
    const packageExpired = user.packageExpiryDate && new Date(user.packageExpiryDate) < now;
    const pkg = await AccessPackage.findOne({ _id: user.assignedPackage, institute: instituteId });
    if (pkg) {
      // Evaluate package hierarchy
      const courseCovered = pkg.courseIds.some(cid => cid.toString() === courseId.toString());
      const subjectCovered = subjectTitle && pkg.subjectIds.some(sub => sub === subjectTitle);
      const moduleCovered = moduleTitle && pkg.moduleIds.some(mod => mod === moduleTitle);
      const lessonCovered = lessonId && pkg.lessonIds.some(lid => lid.toString() === lessonId.toString());

      if (courseCovered || subjectCovered || moduleCovered || lessonCovered) {
        if (packageExpired) {
          return { granted: false, reason: 'Your access has expired. Please contact the institute.', status: 'expired' };
        }
        return { granted: true, source: 'package', packageName: pkg.name };
      }
    }
  }

  // 4. Batch Access
  if (user.batchName) {
    const batchRules = await BatchAccess.find({
      batchName: user.batchName,
      institute: instituteId
    });

    const activeBatchRule = batchRules.find(ba => {
      const isExpired = ba.expiryDate && new Date(ba.expiryDate) < now;
      const notStarted = ba.startDate && new Date(ba.startDate) > now;
      if (isExpired || notStarted || ba.status !== 'active') return false;

      const courseCovered = ba.courseIds.some(cid => cid.toString() === courseId.toString());
      const subjectCovered = subjectTitle && ba.subjectIds.some(sub => sub === subjectTitle);
      const moduleCovered = moduleTitle && ba.moduleIds.some(mod => mod === moduleTitle);
      const lessonCovered = lessonId && ba.lessonIds.some(lid => lid.toString() === lessonId.toString());

      return courseCovered || subjectCovered || moduleCovered || lessonCovered;
    });

    if (activeBatchRule) {
      return { granted: true, source: 'batch', batchName: user.batchName };
    }

    // Check if there was a batch rule covering it that is expired/locked/suspended
    const blockedBatchRule = batchRules.find(ba => {
      const isExpired = ba.expiryDate && new Date(ba.expiryDate) < now;
      const isSuspendedOrLocked = ba.status === 'locked' || ba.status === 'suspended' || ba.status === 'expired';
      if (!isExpired && !isSuspendedOrLocked) return false;

      const courseCovered = ba.courseIds.some(cid => cid.toString() === courseId.toString());
      const subjectCovered = subjectTitle && ba.subjectIds.some(sub => sub === subjectTitle);
      const moduleCovered = moduleTitle && ba.moduleIds.some(mod => mod === moduleTitle);
      const lessonCovered = lessonId && ba.lessonIds.some(lid => lid.toString() === lessonId.toString());

      return courseCovered || subjectCovered || moduleCovered || lessonCovered;
    });

    if (blockedBatchRule) {
      const isExpired = blockedBatchRule.expiryDate && new Date(blockedBatchRule.expiryDate) < now;
      if (isExpired || blockedBatchRule.status === 'expired') {
        return { granted: false, reason: 'Your access has expired. Please contact the institute.', status: 'expired' };
      }
      if (blockedBatchRule.status === 'suspended') {
        return { granted: false, reason: '🔒 Access Suspended', status: 'suspended' };
      }
      return { granted: false, reason: '🔒 Batch Locked', status: 'locked' };
    }
  }

  // 5. Legacy Purchase or Assigned CourseName Fallback
  if (user.courseName) {
    const course = await mongoose.model('Course').findById(courseId);
    if (course && course.title === user.courseName) {
      return { granted: true, source: 'assigned_name' };
    }
  }

  const purchase = await Purchase.findOne({
    studentId,
    courseId,
    status: 'completed'
  });

  if (purchase) {
    return { granted: true, source: 'purchase' };
  }

  return { granted: false, reason: 'Access not activated by your institute.', status: 'locked' };
};
