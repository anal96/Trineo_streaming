import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { verifyApiKey } from '../src/middleware/verifyApiKey.js';
import { syncStudent, assignCourse, getStudentAccess, checkIntegrationHealth } from '../src/controllers/integrationController.js';
import { Institute } from '../src/models/Institute.js';
import { User } from '../src/models/User.js';
import { Course } from '../src/models/Course.js';
import { CourseAssignment } from '../src/models/CourseAssignment.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Purchase } from '../src/models/Purchase.js';
import { verifyStudentAccess } from '../src/utils/accessHelper.js';
import { updateInstitute, generateApiKey, disableApiKey } from '../src/controllers/ownerController.js';
import { OwnerActionLog } from '../src/models/OwnerActionLog.js';

const makeResponse = () => {
  const state = {
    statusCode: 200,
    body: undefined
  };

  const res = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(payload) {
      state.body = payload;
      return res;
    }
  };

  return { res, state };
};

const withMocks = async (mocks, fn) => {
  const originals = [];
  for (const m of mocks) {
    originals.push({ target: m.target, method: m.method, original: m.target[m.method] });
    m.target[m.method] = m.impl;
  }
  try {
    return await fn();
  } finally {
    for (const orig of originals) {
      orig.target[orig.method] = orig.original;
    }
  }
};

test('CRM Integration API Verification', async (t) => {
  const testApiKey = 'trn_gfi_9a8c7d6e5f4a';
  const mockInstitute = {
    _id: '507f1f77bcf86cd799439011',
    instituteId: 'inst_gfi',
    apiKeyHash: bcrypt.hashSync(testApiKey, 10),
    status: 'active',
    name: 'GFI Institute'
  };

  await t.test('verifyApiKey middleware - rejects missing key', async () => {
    const req = { headers: {} };
    const { res, state } = makeResponse();
    let nextCalled = false;

    await verifyApiKey(req, res, () => { nextCalled = true; });

    assert.equal(state.statusCode, 401);
    assert.equal(state.body.message, 'Unauthorized: Missing API Key');
    assert.equal(nextCalled, false);
  });

  await t.test('verifyApiKey middleware - rejects invalid key', async () => {
    const req = { headers: { 'x-api-key': 'trn_invalid' } };
    const { res, state } = makeResponse();
    let nextCalled = false;

    await withMocks([{
      target: Institute,
      method: 'find',
      impl: () => Promise.resolve([])
    }], async () => {
      await verifyApiKey(req, res, () => { nextCalled = true; });
    });

    assert.equal(state.statusCode, 401);
    assert.equal(state.body.message, 'Unauthorized: Invalid API Key');
    assert.equal(nextCalled, false);
  });

  await t.test('verifyApiKey middleware - accepts valid key & logs access', async () => {
    const req = {
      headers: { 'x-api-key': 'trn_gfi_9a8c7d6e5f4a' },
      method: 'POST',
      originalUrl: '/api/integration/students',
      socket: {}
    };
    const { res, state } = makeResponse();
    let nextCalled = false;
    let loggedAccess = false;

    await withMocks([
      {
        target: Institute,
        method: 'find',
        impl: () => Promise.resolve([mockInstitute])
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.eventType, 'API_ACCESS');
          assert.equal(payload.instituteId, 'inst_gfi');
          loggedAccess = true;
          return Promise.resolve({});
        }
      }
    ], async () => {
      await verifyApiKey(req, res, () => { nextCalled = true; });
    });

    assert.equal(nextCalled, true);
    assert.equal(req.institute.instituteId, 'inst_gfi');
    assert.equal(req.user.role, 'admin');
    assert.equal(loggedAccess, true);
  });

  await t.test('syncStudent - creates new student & logs sync', async () => {
    const req = {
      institute: mockInstitute,
      body: {
        studentId: 'STU001',
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '1234567890'
      },
      headers: {},
      socket: {}
    };
    const { res, state } = makeResponse();
    let userSaved = false;
    let loggedSync = false;

    await withMocks([
      {
        target: User,
        method: 'findOne',
        impl: () => Promise.resolve(null)
      },
      {
        target: Institute,
        method: 'findById',
        impl: () => ({
          populate: () => Promise.resolve(null)
        })
      },
      {
        target: User.prototype,
        method: 'save',
        impl: function () {
          assert.equal(this.email, 'jane@example.com');
          assert.equal(this.studentId, 'STU001');
          assert.equal(this.instituteId, 'inst_gfi');
          this._id = new mongoose.Types.ObjectId();
          userSaved = true;
          return Promise.resolve(this);
        }
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.eventType, 'STUDENT_SYNC');
          loggedSync = true;
          return Promise.resolve({});
        }
      }
    ], async () => {
      await syncStudent(req, res);
    });

    assert.equal(userSaved, true);
    assert.equal(loggedSync, true);
    assert.equal(state.body.success, true);
    assert.ok(state.body.userId);
  });

  await t.test('syncStudent - updates existing student', async () => {
    const existingStudentObj = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Old Name',
      email: 'jane@example.com',
      studentId: 'STU001',
      instituteId: 'inst_gfi',
      save() {
        assert.equal(this.name, 'Jane Updated');
        return Promise.resolve(this);
      }
    };

    const req = {
      institute: mockInstitute,
      body: {
        studentId: 'STU001',
        name: 'Jane Updated',
        email: 'jane@example.com'
      },
      headers: {},
      socket: {}
    };
    const { res, state } = makeResponse();

    await withMocks([
      {
        target: User,
        method: 'findOne',
        impl: () => Promise.resolve(existingStudentObj)
      },
      {
        target: AuditLog,
        method: 'create',
        impl: () => Promise.resolve({})
      }
    ], async () => {
      await syncStudent(req, res);
    });

    assert.equal(state.body.success, true);
    assert.equal(state.body.userId, existingStudentObj._id.toString());
  });

  await t.test('assignCourse - assigns course and creates CourseAssignment & Purchase', async () => {
    const student = { _id: new mongoose.Types.ObjectId(), studentId: 'STU001', instituteId: 'inst_gfi', email: 'jane@example.com' };
    const course = { _id: new mongoose.Types.ObjectId(), slug: 'react-course', title: 'React Masterclass', instituteId: 'inst_gfi' };

    const req = {
      institute: mockInstitute,
      body: {
        studentId: 'STU001',
        courseId: 'react-course'
      },
      headers: {},
      socket: {}
    };
    const { res, state } = makeResponse();
    let assignmentSaved = false;
    let purchaseSaved = false;

    await withMocks([
      {
        target: User,
        method: 'findOne',
        impl: (query) => {
          assert.equal(query.studentId, 'STU001');
          assert.equal(query.instituteId, 'inst_gfi');
          return Promise.resolve(student);
        }
      },
      {
        target: Course,
        method: 'findOne',
        impl: (query) => {
          assert.equal(query.instituteId, 'inst_gfi');
          return Promise.resolve(course);
        }
      },
      {
        target: CourseAssignment,
        method: 'findOne',
        impl: (query) => {
          assert.equal(query.student.toString(), student._id.toString());
          assert.equal(query.courseId.toString(), course._id.toString());
          return Promise.resolve(null);
        }
      },
      {
        target: CourseAssignment.prototype,
        method: 'save',
        impl: function () {
          assert.equal(this.student.toString(), student._id.toString());
          assert.equal(this.crmStudentId, 'STU001');
          assert.equal(this.courseId.toString(), course._id.toString());
          assignmentSaved = true;
          return Promise.resolve(this);
        }
      },
      {
        target: Purchase,
        method: 'findOne',
        impl: () => Promise.resolve(null)
      },
      {
        target: Purchase.prototype,
        method: 'save',
        impl: function () {
          assert.equal(this.status, 'completed');
          purchaseSaved = true;
          return Promise.resolve(this);
        }
      },
      {
        target: AuditLog,
        method: 'create',
        impl: () => Promise.resolve({})
      }
    ], async () => {
      await assignCourse(req, res);
    });

    assert.equal(assignmentSaved, true);
    assert.equal(purchaseSaved, true);
    assert.equal(state.statusCode, 200);
    assert.equal(state.body.success, true);
  });

  await t.test('verifyStudentAccess - grants access if CourseAssignment is active', async () => {
    const studentUser = {
      _id: new mongoose.Types.ObjectId(),
      role: 'student',
      status: 'active',
      institute: '507f1f77bcf86cd799439011',
      instituteId: 'inst_gfi'
    };

    await withMocks([
      {
        target: CourseAssignment,
        method: 'findOne',
        impl: (query) => {
          assert.equal(query.student.toString(), studentUser._id.toString());
          return Promise.resolve({ _id: 'assignment-123' });
        }
      }
    ], async () => {
      const accessResult = await verifyStudentAccess({
        user: studentUser,
        courseId: new mongoose.Types.ObjectId()
      });
      assert.equal(accessResult.granted, true);
      assert.equal(accessResult.source, 'assignment');
    });
  });

  await t.test('getStudentAccess - retrieves correct access profile', async () => {
    const student = {
      _id: new mongoose.Types.ObjectId(),
      studentId: 'STU001',
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '1234567890',
      status: 'active'
    };

    const course = {
      _id: new mongoose.Types.ObjectId(),
      title: 'React Masterclass',
      slug: 'react-course'
    };

    const mockAssignments = [
      {
        courseId: course
      }
    ];

    const req = {
      institute: mockInstitute,
      params: { studentId: 'STU001' }
    };
    const { res, state } = makeResponse();

    await withMocks([
      {
        target: User,
        method: 'findOne',
        impl: () => Promise.resolve(student)
      },
      {
        target: CourseAssignment,
        method: 'find',
        impl: (query) => {
          assert.equal(query.student.toString(), student._id.toString());
          return {
            populate() {
              return Promise.resolve(mockAssignments);
            }
          };
        }
      }
    ], async () => {
      await getStudentAccess(req, res);
    });

    assert.equal(state.body.student.studentId, 'STU001');
    assert.equal(state.body.assignedCourses.length, 1);
    assert.equal(state.body.assignedCourses[0].title, 'React Masterclass');
    assert.equal(state.body.accessStatus, 'active');
  });

  await t.test('Owner Panel - updateInstitute - updates fields and logs action', async () => {
    const inst = {
      _id: 'inst-123',
      name: 'Stanford University',
      instituteId: 'stanford_inst',
      status: 'active',
      save: async () => {
        return inst;
      }
    };
    const req = {
      params: { id: 'inst-123' },
      body: {
        name: 'Stanford Uni',
        contactPerson: 'Jane',
        phone: '123'
      },
      user: { _id: 'owner-id' },
      headers: {},
      socket: {}
    };
    const { res, state } = makeResponse();
    let loggedAction = false;
    let saved = false;

    inst.save = async function() {
      assert.equal(this.name, 'Stanford Uni');
      assert.equal(this.contactPerson, 'Jane');
      assert.equal(this.phone, '123');
      saved = true;
      return this;
    };

    await withMocks([
      {
        target: Institute,
        method: 'findById',
        impl: () => Promise.resolve(inst)
      },
      {
        target: OwnerActionLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.action, 'update_institute');
          assert.equal(payload.targetInstitute, 'inst-123');
          loggedAction = true;
          return Promise.resolve({});
        }
      }
    ], async () => {
      await updateInstitute(req, res);
    });

    assert.equal(saved, true);
    assert.equal(loggedAction, true);
    assert.equal(state.statusCode, 200);
    assert.equal(state.body.name, 'Stanford Uni');
  });

  await t.test('Owner Panel - generateApiKey - generates key, hashes it, logs action', async () => {
    const inst = {
      _id: 'inst-123',
      name: 'Stanford University',
      apiKeyHash: null,
      save: async () => {
        return inst;
      }
    };
    const req = {
      params: { id: 'inst-123' },
      user: { _id: 'owner-id' },
      headers: {},
      socket: {}
    };
    const { res, state } = makeResponse();
    let loggedAction = false;
    let saved = false;

    inst.save = async function() {
      assert.ok(this.apiKeyHash);
      assert.ok(this.apiKeyHash.startsWith('$2a$') || this.apiKeyHash.startsWith('$2b$')); // valid bcrypt hash
      saved = true;
      return this;
    };

    await withMocks([
      {
        target: Institute,
        method: 'findById',
        impl: () => Promise.resolve(inst)
      },
      {
        target: OwnerActionLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.action, 'generate_api_key');
          assert.equal(payload.targetInstitute, 'inst-123');
          loggedAction = true;
          return Promise.resolve({});
        }
      }
    ], async () => {
      await generateApiKey(req, res);
    });

    assert.equal(saved, true);
    assert.equal(loggedAction, true);
    assert.equal(state.statusCode, 200);
    assert.equal(state.body.success, true);
    assert.ok(state.body.apiKey.startsWith('trn_'));
  });

  await t.test('Owner Panel - disableApiKey - revokes key and logs action', async () => {
    const inst = {
      _id: 'inst-123',
      name: 'Stanford University',
      apiKeyHash: 'somehash',
      save: async () => {
        return inst;
      }
    };
    const req = {
      params: { id: 'inst-123' },
      user: { _id: 'owner-id' },
      headers: {},
      socket: {}
    };
    const { res, state } = makeResponse();
    let loggedAction = false;
    let saved = false;

    inst.save = async function() {
      assert.equal(this.apiKeyHash, null);
      saved = true;
      return this;
    };

    await withMocks([
      {
        target: Institute,
        method: 'findById',
        impl: () => Promise.resolve(inst)
      },
      {
        target: OwnerActionLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.action, 'disable_api_key');
          assert.equal(payload.targetInstitute, 'inst-123');
          loggedAction = true;
          return Promise.resolve({});
        }
      }
    ], async () => {
      await disableApiKey(req, res);
    });

    assert.equal(saved, true);
    assert.equal(loggedAction, true);
    assert.equal(state.statusCode, 200);
    assert.equal(state.body.success, true);
  });

  await t.test('checkIntegrationHealth - returns success if apiKey is authenticated', async () => {
    const req = {
      institute: mockInstitute
    };
    const { res, state } = makeResponse();

    await checkIntegrationHealth(req, res);

    assert.equal(state.statusCode, 200);
    assert.equal(state.body.success, true);
    assert.equal(state.body.instituteId, 'inst_gfi');
    assert.equal(state.body.name, 'GFI Institute');
  });
});
