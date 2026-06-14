import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { CourseAssignment } from '../models/CourseAssignment.js';
import { Course } from '../models/Course.js';
import { CourseIntegrationMap } from '../models/CourseIntegrationMap.js';
import { AuditLog } from '../models/AuditLog.js';

/**
 * Perform asynchronous background student profile and course assignment sync.
 * 
 * @param {string} crmStudentId - The unique student ID from CRM
 * @param {string} crmInstituteId - The unique institute ID from CRM
 * @param {Object} user - User document on Trineo Stream
 */
export async function syncStudentProfile(crmStudentId, crmInstituteId, user) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  const secret = process.env.TRINEO_SSO_SECRET;
  if (!secret) {
    throw new Error('Sync configuration error: TRINEO_SSO_SECRET environment variable is missing.');
  }

  // Generate a short-lived token to authorize the request on the CRM
  const authPayload = { studentId: crmStudentId, crmInstituteId };
  const token = jwt.sign(authPayload, secret, { expiresIn: '1m' });

  const crmUrl = process.env.CRM_API_URL || 'http://localhost:5000';
  const syncEndpoint = `${crmUrl}/api/stream/student-profile`;

  try {
    // 1. Request student profile from CRM
    const response = await fetch(syncEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ studentId: crmStudentId, crmInstituteId })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `CRM returned status code ${response.status}`);
    }

    const resData = await response.json();
    if (!resData.success || !resData.student) {
      throw new Error(resData.message || 'CRM API returned unsuccessful status');
    }

    const crmStudent = resData.student;

    // 2. Update local student demographics
    user.name = crmStudent.name || user.name;
    user.email = crmStudent.email || user.email;
    user.batchName = crmStudent.batch || user.batchName;
    user.program = crmStudent.program || '';
    user.branchName = crmStudent.branch || user.branchName;
    user.faculty = crmStudent.faculty || '';
    user.status = crmStudent.status === 'Active' ? 'active' : 'inactive';
    user.lastSyncedAt = new Date();
    user.syncStatus = 'success';
    user.lastSyncError = '';
    await user.save();

    await AuditLog.create({
      userId: user._id,
      institute: user.institute || null,
      instituteId: user.instituteId || '',
      eventType: 'PROFILE_SYNC_SUCCESS',
      details: `Student ${crmStudentId} synchronized from CRM`,
      ipAddress: '127.0.0.1',
      userAgent: 'System Sync Service'
    });

    // 3. Reconcile course assignments
    try {
      const incomingCrmCourseIds = crmStudent.courseAssignments || [];
      const trineoCourseIds = [];

      // Resolve each CRM course ID using CourseIntegrationMap
      for (const crmId of incomingCrmCourseIds) {
        const mapping = await CourseIntegrationMap.findOne({
          crmCourseId: crmId,
          instituteId: user.instituteId
        });
        if (mapping) {
          trineoCourseIds.push(mapping.trineoCourseId.toString());
        }
      }

      // Fetch current active course assignments on Trineo for this student
      const currentAssignments = await CourseAssignment.find({
        student: user._id,
        instituteId: user.instituteId
      });

      const currentCourseIds = currentAssignments.map(a => a.courseId.toString());

      let addedCount = 0;
      let removedCount = 0;

      // Add missing assignments
      for (const tId of trineoCourseIds) {
        if (!currentCourseIds.includes(tId)) {
          await CourseAssignment.create({
            student: user._id,
            crmStudentId: crmStudentId,
            courseId: tId,
            institute: user.institute,
            instituteId: user.instituteId
          });
          addedCount++;
        }
      }

      // Remove assignments no longer present
      for (const assignment of currentAssignments) {
        const courseIdStr = assignment.courseId.toString();
        if (!trineoCourseIds.includes(courseIdStr)) {
          await CourseAssignment.deleteOne({ _id: assignment._id });
          removedCount++;
        }
      }

      await AuditLog.create({
        userId: user._id,
        institute: user.institute || null,
        instituteId: user.instituteId || '',
        eventType: 'COURSE_SYNC_SUCCESS',
        details: `Synchronized courses: added ${addedCount} courses, removed ${removedCount} courses`,
        ipAddress: '127.0.0.1',
        userAgent: 'System Sync Service'
      });

    } catch (courseErr) {
      console.error('Course Assignment Sync Error:', courseErr);
      await AuditLog.create({
        userId: user._id,
        institute: user.institute || null,
        instituteId: user.instituteId || '',
        eventType: 'COURSE_SYNC_FAILED',
        details: `Course sync failed for ${crmStudentId}: ${courseErr.message}`,
        ipAddress: '127.0.0.1',
        userAgent: 'System Sync Service'
      });
    }

  } catch (error) {
    console.error('Student Profile Sync Error:', error);
    
    // Record sync failure on the user doc
    user.syncStatus = 'failed';
    user.lastSyncError = error.message || 'CRM API unavailable';
    await user.save();

    await AuditLog.create({
      userId: user._id,
      institute: user.institute || null,
      instituteId: user.instituteId || '',
      eventType: 'PROFILE_SYNC_FAILED',
      details: `Profile sync failed for ${crmStudentId}: ${error.message}`,
      ipAddress: '127.0.0.1',
      userAgent: 'System Sync Service'
    });
  }
}
