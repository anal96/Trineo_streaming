import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { syncStudentProfile } from '../src/services/crmSyncService.js';
import { User } from '../src/models/User.js';
import { Course } from '../src/models/Course.js';
import { CourseAssignment } from '../src/models/CourseAssignment.js';
import { CourseIntegrationMap } from '../src/models/CourseIntegrationMap.js';
import { AuditLog } from '../src/models/AuditLog.js';

// Setup environment secret
process.env.TRINEO_SSO_SECRET = 'sso_secret_123';
process.env.CRM_API_URL = 'http://mock-crm.invalid';

test('CRM Profile & Course Sync Service Verification', async (t) => {
  const originalFetch = global.fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  await t.test('syncStudentProfile - succeeds and reconciles data', async () => {
    const mockStudentId = 'STU-123';
    const mockCrmInstId = 'inst-gfi-99';
    
    const user = new User({
      name: 'Old Name',
      email: 'old@gfi.edu',
      studentId: mockStudentId,
      crmStudentId: mockStudentId,
      instituteId: 'inst_gfi',
      syncStatus: 'pending'
    });

    const mockCrmStudentResponse = {
      success: true,
      student: {
        studentId: mockStudentId,
        name: 'New Name',
        email: 'new@gfi.edu',
        phone: '1234567890',
        status: 'Active',
        batch: 'Batch 2026',
        program: 'Computer Science',
        branch: 'Main Branch',
        faculty: 'Dr. Connor',
        courseAssignments: ['crm-c1', 'crm-c2']
      }
    };

    let fetchCalled = false;
    global.fetch = async (url, options) => {
      fetchCalled = true;
      assert.equal(url, 'http://mock-crm.invalid/api/stream/student-profile');
      assert.equal(options.method, 'POST');
      const authHeader = options.headers.Authorization;
      assert.ok(authHeader.startsWith('Bearer '));
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, 'sso_secret_123');
      assert.equal(decoded.studentId, mockStudentId);
      assert.equal(decoded.crmInstituteId, mockCrmInstId);

      return {
        ok: true,
        json: async () => mockCrmStudentResponse
      };
    };

    const saveOrig = User.prototype.save;
    let saved = false;
    User.prototype.save = function () {
      saved = true;
      return Promise.resolve(this);
    };

    const auditLogs = [];
    const auditOrig = AuditLog.create;
    AuditLog.create = (log) => {
      auditLogs.push(log);
      return Promise.resolve(log);
    };

    const mappings = [
      { crmCourseId: 'crm-c1', trineoCourseId: new mongoose.Types.ObjectId(), instituteId: 'inst_gfi' },
      { crmCourseId: 'crm-c2', trineoCourseId: new mongoose.Types.ObjectId(), instituteId: 'inst_gfi' }
    ];
    const mapOrig = CourseIntegrationMap.findOne;
    CourseIntegrationMap.findOne = ({ crmCourseId }) => {
      const match = mappings.find(m => m.crmCourseId === crmCourseId);
      return Promise.resolve(match);
    };

    const currentAssignments = [];
    const findAssignmentOrig = CourseAssignment.find;
    CourseAssignment.find = () => Promise.resolve(currentAssignments);

    const createdAssignments = [];
    const createAssignmentOrig = CourseAssignment.create;
    CourseAssignment.create = (doc) => {
      createdAssignments.push(doc);
      return Promise.resolve(doc);
    };

    const deletedAssignments = [];
    const deleteAssignmentOrig = CourseAssignment.deleteOne;
    CourseAssignment.deleteOne = (query) => {
      deletedAssignments.push(query);
      return Promise.resolve({});
    };

    try {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      await syncStudentProfile(mockStudentId, mockCrmInstId, user);
      
      process.env.NODE_ENV = originalEnv;

      assert.ok(fetchCalled);
      assert.ok(saved);
      assert.equal(user.name, 'New Name');
      assert.equal(user.email, 'new@gfi.edu');
      assert.equal(user.batchName, 'Batch 2026');
      assert.equal(user.program, 'Computer Science');
      assert.equal(user.branchName, 'Main Branch');
      assert.equal(user.faculty, 'Dr. Connor');
      assert.equal(user.status, 'active');
      assert.equal(user.syncStatus, 'success');
      assert.equal(user.lastSyncError, '');
      assert.ok(user.lastSyncedAt instanceof Date);

      assert.equal(createdAssignments.length, 2);
      assert.equal(createdAssignments[0].courseId.toString(), mappings[0].trineoCourseId.toString());
      assert.equal(createdAssignments[1].courseId.toString(), mappings[1].trineoCourseId.toString());

      assert.ok(auditLogs.some(log => log.eventType === 'PROFILE_SYNC_SUCCESS'));
      assert.ok(auditLogs.some(log => log.eventType === 'COURSE_SYNC_SUCCESS'));

    } finally {
      User.prototype.save = saveOrig;
      AuditLog.create = auditOrig;
      CourseIntegrationMap.findOne = mapOrig;
      CourseAssignment.find = findAssignmentOrig;
      CourseAssignment.create = createAssignmentOrig;
      CourseAssignment.deleteOne = deleteAssignmentOrig;
    }
  });

  await t.test('syncStudentProfile - handles CRM API offline failure', async () => {
    const mockStudentId = 'STU-123';
    const mockCrmInstId = 'inst-gfi-99';
    const user = new User({
      name: 'Old Name',
      studentId: mockStudentId,
      crmStudentId: mockStudentId,
      instituteId: 'inst_gfi',
      syncStatus: 'pending'
    });

    global.fetch = async () => {
      throw new Error('Connection refused');
    };

    const saveOrig = User.prototype.save;
    User.prototype.save = function () {
      return Promise.resolve(this);
    };

    const auditLogs = [];
    const auditOrig = AuditLog.create;
    AuditLog.create = (log) => {
      auditLogs.push(log);
      return Promise.resolve(log);
    };

    try {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      await syncStudentProfile(mockStudentId, mockCrmInstId, user);
      
      process.env.NODE_ENV = originalEnv;

      assert.equal(user.syncStatus, 'failed');
      assert.equal(user.lastSyncError, 'Connection refused');
      assert.ok(auditLogs.some(log => log.eventType === 'PROFILE_SYNC_FAILED'));

    } finally {
      User.prototype.save = saveOrig;
      AuditLog.create = auditOrig;
    }
  });
});
