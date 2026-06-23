import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { generateTemporaryPassword } from '../src/utils/passwordGenerator.js';
import { protect } from '../src/middleware/auth.js';
import { createStudent, resendWelcomeEmail, resetStudentPassword } from '../src/controllers/analyticsController.js';
import { previewStudentImport, confirmStudentImport } from '../src/controllers/studentImportController.js';
import { changeStudentPassword } from '../src/controllers/studentAccountController.js';
import { User } from '../src/models/User.js';
import { Course } from '../src/models/Course.js';
import { Purchase } from '../src/models/Purchase.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { SecuritySession } from '../src/models/SecuritySession.js';
import { Institute } from '../src/models/Institute.js';
import { StudentImportJob } from '../src/models/StudentImportJob.js';
import { Notification } from '../src/models/Notification.js';
import { Program } from '../src/models/Program.js';
import { Enrollment } from '../src/models/Enrollment.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Tests ───────────────────────────────────────────────────────────────────

test('Student Onboarding Flow Verification', async (t) => {

  await t.test('generateTemporaryPassword - matches requirements', async () => {
    const pwd = generateTemporaryPassword();
    assert.ok(pwd.length >= 8, 'Should be at least 8 characters');
    assert.match(pwd, /^Trineo@\d{4}$/, 'Should match Trineo@XXXX format');
    assert.ok(/[A-Z]/.test(pwd), 'Should contain uppercase letter');
    assert.ok(/[a-z]/.test(pwd), 'Should contain lowercase letter');
    assert.ok(/\d/.test(pwd), 'Should contain a digit');
    assert.ok(/[@]/.test(pwd), 'Should contain @ special character');
  });

  await t.test('protect middleware - enforces password change redirection', async () => {
    const mockUser = {
      _id: 'user-123',
      status: 'active',
      mustChangePassword: true,
      activeSessionToken: 'token-123'
    };

    const mocks = [
      {
        target: jwt,
        method: 'verify',
        impl: () => ({ id: 'user-123', sessionToken: 'token-123' })
      },
      {
        target: User,
        method: 'findById',
        impl: () => ({
          select: () => Promise.resolve(mockUser)
        })
      }
    ];

    await withMocks(mocks, async () => {
      // Allowed endpoint
      const reqAllow = {
        headers: { authorization: 'Bearer token-123' },
        originalUrl: '/api/student-account/password/change',
        path: '/api/student-account/password/change'
      };
      const { res: resAllow, state: stateAllow } = makeResponse();
      let nextCalledAllow = false;

      await protect(reqAllow, resAllow, () => { nextCalledAllow = true; });
      assert.equal(nextCalledAllow, true, 'Next should be called for password change endpoint');

      // Blocked endpoint
      const reqBlock = {
        headers: { authorization: 'Bearer token-123' },
        originalUrl: '/api/courses',
        path: '/api/courses'
      };
      const { res: resBlock, state: stateBlock } = makeResponse();
      let nextCalledBlock = false;

      await protect(reqBlock, resBlock, () => { nextCalledBlock = true; });
      assert.equal(nextCalledBlock, false, 'Next should NOT be called for blocked endpoint');
      assert.equal(stateBlock.statusCode, 403, 'Should return 403');
      assert.equal(stateBlock.body.mustChangePassword, true, 'Should mark mustChangePassword true');
    });
  });

  await t.test('createStudent - generates password, flags mustChangePassword, checks duplicate', async () => {
    let userCreated = null;
    let emailSent = false;

    const mocks = [
      {
        target: User,
        method: 'findOne',
        impl: (query) => {
          if (query.email === 'duplicate@example.com') {
            return Promise.resolve({ _id: 'existing-id' });
          }
          return Promise.resolve(null);
        }
      },
      {
        target: User,
        method: 'create',
        impl: (data) => {
          userCreated = data;
          return Promise.resolve({ _id: 'new-id', ...data, createdAt: new Date() });
        }
      },
      {
        target: Course,
        method: 'findOne',
        impl: () => Promise.resolve(null)
      },
      {
        target: Notification,
        method: 'create',
        impl: () => Promise.resolve({})
      },
      {
        target: Institute,
        method: 'findById',
        impl: () => Promise.resolve({})
      }
    ];

    await withMocks(mocks, async () => {
      // Test duplicate check
      const req = {
        user: { institute: '507f1f77bcf86cd799439011' },
        body: { name: 'Dup Student', email: 'duplicate@example.com' }
      };
      const { res: resDup, state: stateDup } = makeResponse();
      await createStudent(req, resDup);

      assert.equal(stateDup.statusCode, 400);
      assert.equal(stateDup.body.message, 'Student with this email already exists');

      // Test successful creation
      const reqOk = {
        user: { institute: '507f1f77bcf86cd799439011' },
        body: { name: 'New Student', email: 'new@example.com', branchName: 'CS', batchName: 'B1' }
      };
      const { res: resOk, state: stateOk } = makeResponse();
      await createStudent(reqOk, resOk);

      assert.equal(stateOk.statusCode, 201);
      assert.equal(stateOk.body.student.email, 'new@example.com');
      assert.equal(stateOk.body.student.mustChangePassword, true);
      assert.ok(userCreated);
      assert.equal(userCreated.mustChangePassword, true);
      assert.match(userCreated.password, /^Trineo@\d{4}$/);
    });
  });

  await t.test('confirmStudentImport - handles columns, creates users, reports summary', async () => {
    let userCreatedCount = 0;
    const importedRows = [];

    const mockJob = {
      _id: 'job-123',
      rows: [
        { rowNumber: 2, name: 'Alice', email: 'alice@example.com', phone: '123', batch: 'B1', branch: 'CS', course: 'LMS Intro', status: 'pending' },
        { rowNumber: 3, name: 'Bob', email: 'bob@example.com', phone: '456', batch: 'B1', branch: 'CS', course: 'LMS Intro', status: 'skipped', error: 'Duplicate Email in file' }
      ],
      save: () => Promise.resolve()
    };

    const mocks = [
      {
        target: StudentImportJob,
        method: 'findOne',
        impl: () => Promise.resolve(mockJob)
      },
      {
        target: User,
        method: 'findOne',
        impl: (query) => {
          // No DB duplicates for Alice
          if (query.email === 'alice@example.com') return Promise.resolve(null);
          return Promise.resolve({ _id: 'dup-id' });
        }
      },
      {
        target: Program,
        method: 'findOne',
        impl: () => Promise.resolve({ _id: 'program-123', name: 'LMS Intro' })
      },
      {
        target: User,
        method: 'create',
        impl: (data) => {
          userCreatedCount++;
          importedRows.push(data);
          return Promise.resolve({ _id: `id-${userCreatedCount}`, ...data });
        }
      },
      {
        target: Enrollment,
        method: 'create',
        impl: () => Promise.resolve({})
      },
      {
        target: Enrollment,
        method: 'findOneAndUpdate',
        impl: () => Promise.resolve({})
      },
      {
        target: AuditLog,
        method: 'create',
        impl: () => Promise.resolve({})
      },
      {
        target: Institute,
        method: 'findById',
        impl: () => ({
          populate: () => Promise.resolve(null)
        })
      }
    ];

    await withMocks(mocks, async () => {
      const req = {
        user: { role: 'admin', institute: '507f1f77bcf86cd799439011', _id: '507f1f77bcf86cd799439012' },
        params: { jobId: 'job-123' },
        headers: {},
        socket: {}
      };
      const { res, state } = makeResponse();
      await confirmStudentImport(req, res);

      assert.equal(state.statusCode, 200);
      assert.equal(state.body.created, 1);
      assert.equal(state.body.skipped, 1);
      assert.equal(state.body.errors, 0);

      assert.equal(importedRows.length, 1);
      assert.equal(importedRows[0].email, 'alice@example.com');
      assert.equal(importedRows[0].mustChangePassword, true);
      assert.match(importedRows[0].password, /^Trineo@\d{4}$/);
    });
  });

  await t.test('changeStudentPassword - forces password change completion and session preservation', async () => {
    let savedUser = null;
    let securitySessionsTerminated = false;
    let securitySessionsMatchingKept = true;

    const mockUser = {
      _id: 'user-123',
      role: 'student',
      mustChangePassword: true,
      activeSessionToken: 'sess-token-123',
      matchPassword: () => Promise.resolve(true),
      save: function () {
        savedUser = this;
        return Promise.resolve(this);
      }
    };

    const mocks = [
      {
        target: User,
        method: 'findById',
        impl: () => Promise.resolve(mockUser)
      },
      {
        target: SecuritySession,
        method: 'updateMany',
        impl: (query) => {
          if (query.tokenSuffix && query.tokenSuffix.$ne) {
            // Terminating others, keeping suffix
            securitySessionsTerminated = true;
          } else {
            // Terminating all
            securitySessionsTerminated = true;
            securitySessionsMatchingKept = false;
          }
          return Promise.resolve({});
        }
      },
      {
        target: AuditLog,
        method: 'create',
        impl: () => Promise.resolve({})
      }
    ];

    await withMocks(mocks, async () => {
      const req = {
        user: { role: 'student', _id: 'user-123' },
        token: 'sess-token-123',
        headers: {},
        socket: {},
        body: { currentPassword: 'old', newPassword: 'newPassword123!', confirmPassword: 'newPassword123!' }
      };
      const { res, state } = makeResponse();
      await changeStudentPassword(req, res);

      assert.equal(state.statusCode, 200);
      assert.equal(state.body.mustChangePassword, false);
      assert.equal(savedUser.mustChangePassword, false);
      assert.equal(savedUser.activeSessionToken, 'sess-token-123', 'Active session token should be preserved');
      assert.equal(securitySessionsTerminated, true, 'Other security sessions should be marked terminated');
      assert.equal(securitySessionsMatchingKept, true, 'Active matching session should remain active');
    });
  });
});
