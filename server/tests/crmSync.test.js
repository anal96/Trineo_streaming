import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { syncStudentProfile } from '../src/services/crmSyncService.js';
import { User } from '../src/models/User.js';
import { Course } from '../src/models/Course.js';
import { CourseAssignment } from '../src/models/CourseAssignment.js';
import { CourseIntegrationMap } from '../src/models/CourseIntegrationMap.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Institute } from '../src/models/Institute.js';

// Setup environment secrets
process.env.TRINEO_SSO_SECRET = 'sso_secret_123';
process.env.CRM_INTEGRATION_SECRET = 'crm_secret_123';
process.env.CRM_API_URL = 'http://mock-crm.invalid';
process.env.ENABLE_CRM_SYNC = 'true';
process.env.ENABLE_SSO = 'true';

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

    const mockInstituteDoc = {
      _id: new mongoose.Types.ObjectId(),
      instituteId: 'inst_gfi',
      integration: {
        crmApiUrl: 'http://mock-crm.invalid',
        crmInstituteId: mockCrmInstId,
        syncEnabled: true,
        successfulSyncCount: 0,
        failedSyncCount: 0,
        lastSuccessfulSyncAt: null
      }
    };

    const findOneOrig = Institute.findOne;
    let findOneCalled = false;
    Institute.findOne = ({ instituteId }) => {
      if (instituteId === 'inst_gfi') {
        findOneCalled = true;
        return Promise.resolve(mockInstituteDoc);
      }
      return findOneOrig({ instituteId });
    };

    const findByIdAndUpdateOrig = Institute.findByIdAndUpdate;
    let findByIdAndUpdateCalled = false;
    let lastSuccessfulSyncUpdated = false;
    Institute.findByIdAndUpdate = (id, update) => {
      if (id.toString() === mockInstituteDoc._id.toString()) {
        findByIdAndUpdateCalled = true;
        if (update.$inc && update.$inc['integration.successfulSyncCount']) {
          mockInstituteDoc.integration.successfulSyncCount += update.$inc['integration.successfulSyncCount'];
        }
        if (update.$set && update.$set['integration.lastSuccessfulSyncAt']) {
          lastSuccessfulSyncUpdated = true;
          mockInstituteDoc.integration.lastSuccessfulSyncAt = update.$set['integration.lastSuccessfulSyncAt'];
        }
        return Promise.resolve(mockInstituteDoc);
      }
      return findByIdAndUpdateOrig(id, update);
    };

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
      const decoded = jwt.verify(token, 'crm_secret_123');
      assert.equal(decoded.studentId, mockStudentId);
      assert.equal(decoded.crmInstituteId, mockCrmInstId);
      assert.equal(decoded.trineoInstituteId, mockInstituteDoc._id.toString());
      assert.equal(decoded.iss, 'trineo-stream');
      assert.equal(decoded.aud, 'crm-integration');
      assert.equal(decoded.purpose, 'profile-sync');
      assert.ok(decoded.jti);

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
      assert.ok(findOneCalled);
      assert.ok(findByIdAndUpdateCalled);
      assert.ok(lastSuccessfulSyncUpdated);
      assert.equal(mockInstituteDoc.integration.successfulSyncCount, 1);
      assert.ok(mockInstituteDoc.integration.lastSuccessfulSyncAt instanceof Date);

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
      Institute.findOne = findOneOrig;
      Institute.findByIdAndUpdate = findByIdAndUpdateOrig;
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

    const mockInstituteDoc = {
      _id: new mongoose.Types.ObjectId(),
      instituteId: 'inst_gfi',
      integration: {
        crmApiUrl: 'http://mock-crm.invalid',
        crmInstituteId: mockCrmInstId,
        syncEnabled: true,
        successfulSyncCount: 0,
        failedSyncCount: 0,
        lastSuccessfulSyncAt: null
      }
    };

    const findOneOrig = Institute.findOne;
    Institute.findOne = ({ instituteId }) => {
      if (instituteId === 'inst_gfi') {
        return Promise.resolve(mockInstituteDoc);
      }
      return findOneOrig({ instituteId });
    };

    const findByIdAndUpdateOrig = Institute.findByIdAndUpdate;
    let findByIdAndUpdateCalled = false;
    Institute.findByIdAndUpdate = (id, update) => {
      if (id.toString() === mockInstituteDoc._id.toString()) {
        findByIdAndUpdateCalled = true;
        if (update.$inc && update.$inc['integration.failedSyncCount']) {
          mockInstituteDoc.integration.failedSyncCount += update.$inc['integration.failedSyncCount'];
        }
        return Promise.resolve(mockInstituteDoc);
      }
      return findByIdAndUpdateOrig(id, update);
    };

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

      assert.ok(findByIdAndUpdateCalled);
      assert.equal(mockInstituteDoc.integration.failedSyncCount, 1);
      assert.equal(user.syncStatus, 'failed');
      assert.equal(user.lastSyncError, 'Connection refused');
      assert.ok(auditLogs.some(log => log.eventType === 'PROFILE_SYNC_FAILED'));

    } finally {
      Institute.findOne = findOneOrig;
      Institute.findByIdAndUpdate = findByIdAndUpdateOrig;
      User.prototype.save = saveOrig;
      AuditLog.create = auditOrig;
    }
  });

  await t.test('syncStudentProfile - aborts sync if integration is not configured or disabled', async () => {
    const mockStudentId = 'STU-123';
    const mockCrmInstId = 'inst-gfi-99';
    const user = new User({
      name: 'Old Name',
      studentId: mockStudentId,
      crmStudentId: mockStudentId,
      instituteId: 'inst_gfi',
      syncStatus: 'pending'
    });

    const mockInstituteDoc = {
      _id: new mongoose.Types.ObjectId(),
      instituteId: 'inst_gfi',
      integration: {
        crmApiUrl: '', // empty
        crmInstituteId: mockCrmInstId,
        syncEnabled: false, // disabled
        successfulSyncCount: 0,
        failedSyncCount: 0,
        lastSuccessfulSyncAt: null
      }
    };

    const findOneOrig = Institute.findOne;
    Institute.findOne = ({ instituteId }) => {
      if (instituteId === 'inst_gfi') {
        return Promise.resolve(mockInstituteDoc);
      }
      return findOneOrig({ instituteId });
    };

    const saveOrig = User.prototype.save;
    let saved = false;
    User.prototype.save = function () {
      saved = true;
      return Promise.resolve(this);
    };

    let fetchCalled = false;
    global.fetch = async () => {
      fetchCalled = true;
      return { ok: true };
    };

    try {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      await syncStudentProfile(mockStudentId, mockCrmInstId, user);
      
      process.env.NODE_ENV = originalEnv;

      assert.equal(user.syncStatus, 'pending');
      assert.equal(user.lastSyncError, '');
      assert.ok(saved);
      assert.equal(fetchCalled, false);
      assert.equal(mockInstituteDoc.integration.failedSyncCount, 0);
      assert.equal(mockInstituteDoc.integration.successfulSyncCount, 0);
    } finally {
      Institute.findOne = findOneOrig;
      User.prototype.save = saveOrig;
    }
  });

  await t.test('syncStudentProfile - throws error if CRM_INTEGRATION_SECRET is missing', async () => {
    const mockStudentId = 'STU-123';
    const mockCrmInstId = 'inst-gfi-99';
    const user = new User({
      name: 'Old Name',
      studentId: mockStudentId,
      crmStudentId: mockStudentId,
      instituteId: 'inst_gfi',
      syncStatus: 'pending'
    });

    const mockInstituteDoc = {
      _id: new mongoose.Types.ObjectId(),
      instituteId: 'inst_gfi',
      integration: {
        crmApiUrl: 'http://mock-crm.invalid',
        crmInstituteId: mockCrmInstId,
        syncEnabled: true,
        successfulSyncCount: 0,
        failedSyncCount: 0,
        lastSuccessfulSyncAt: null
      }
    };

    const findOneOrig = Institute.findOne;
    Institute.findOne = ({ instituteId }) => {
      if (instituteId === 'inst_gfi') {
        return Promise.resolve(mockInstituteDoc);
      }
      return findOneOrig({ instituteId });
    };

    const originalSecret = process.env.CRM_INTEGRATION_SECRET;
    delete process.env.CRM_INTEGRATION_SECRET;

    try {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      await assert.rejects(
        async () => {
          await syncStudentProfile(mockStudentId, mockCrmInstId, user);
        },
        /CRM_INTEGRATION_SECRET environment variable is missing/
      );
      
      process.env.NODE_ENV = originalEnv;
    } finally {
      Institute.findOne = findOneOrig;
      process.env.CRM_INTEGRATION_SECRET = originalSecret;
    }
  });
});
