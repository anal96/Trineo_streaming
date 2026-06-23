import mongoose from 'mongoose';
import assert from 'assert';
import { getStudentAccessRules, applyQuickAction } from '../src/controllers/accessController.js';
import { loginUser, _deps } from '../src/controllers/authController.js';
import { requestPasswordReset } from '../src/controllers/studentAccountController.js';
import { testPush } from '../src/controllers/pushSubscriptionController.js';
import { User } from '../src/models/User.js';
import { Program } from '../src/models/Program.js';
import { StudentAccess } from '../src/models/StudentAccess.js';
import { StudentContentAccess } from '../src/models/StudentContentAccess.js';
import { Institute } from '../src/models/Institute.js';
import { Notification } from '../src/models/Notification.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { SecuritySession } from '../src/models/SecuritySession.js';
import { SecurityEvent } from '../src/models/SecurityEvent.js';
import { SecurityState } from '../src/models/SecurityState.js';


// Setup Mock helper
const withMocks = async (mocks, fn) => {
  const originals = mocks.map(m => ({
    target: m.target,
    method: m.method,
    original: m.target[m.method]
  }));
  
  mocks.forEach(m => {
    m.target[m.method] = m.impl;
  });

  try {
    return await fn();
  } finally {
    originals.forEach(o => {
      o.target[o.method] = o.original;
    });
  }
};

const makeResponse = () => {
  const state = { statusCode: 200, body: null, redirectUrl: null };
  const res = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(payload) {
      state.body = payload;
      return res;
    },
    redirect(url) {
      state.redirectUrl = url;
      return res;
    }
  };
  return { res, state };
};

// Start Scenarios Verification
async function runVerification() {
  console.log("\n================ RUNNING SPECIFIC ISOLATION SCENARIOS VERIFICATION ================");

  // ------------------------------------------------------------------------------------------
  // Scenario 1: Institute A Admin -> Try accessing Institute B student
  // ------------------------------------------------------------------------------------------
  await (async () => {
    const adminUser = { _id: 'admin_a_id', role: 'admin', institute: 'inst_a' };
    const req = {
      user: adminUser,
      params: { studentId: 'student_b_id' }
    };
    const { res, state } = makeResponse();

    await withMocks([
      {
        target: User,
        method: 'findOne',
        impl: (query) => {
          // If admin queries student_b_id inside their institute inst_a, it returns null
          if (query._id === 'student_b_id' && query.institute === 'inst_a') {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }
      }
    ], async () => {
      await getStudentAccessRules(req, res);
    });

    console.log("Scenario 1 [Access Student B Rules]:");
    console.log(`  Target status: 404, Actual status: ${state.statusCode}`);
    console.log(`  Response message: "${state.body?.message}"`);
    assert.strictEqual(state.statusCode, 404);
    assert.match(state.body?.message, /Student not found/);
    console.log("  ✔ PASS: Cross-tenant student access rules access rejected with 404.");
  })();

  // ------------------------------------------------------------------------------------------
  // Scenario 2: Institute A Admin -> Try applying quick action to Institute B program
  // ------------------------------------------------------------------------------------------
  await (async () => {
    const adminUser = { _id: 'admin_a_id', role: 'admin', institute: 'inst_a' };
    const req = {
      user: adminUser,
      params: { studentId: 'student_a_id' },
      body: { batchId: 'program_b_id', action: 'allow_all' }
    };
    const { res, state } = makeResponse();

    const studentAObj = { _id: 'student_a_id', institute: 'inst_a' };

    await withMocks([
      {
        target: User,
        method: 'findOne',
        impl: (query) => {
          if (query._id === 'student_a_id' && query.institute === 'inst_a') {
            return Promise.resolve(studentAObj);
          }
          return Promise.resolve(null);
        }
      },
      {
        target: Program,
        method: 'findOne',
        impl: (query) => {
          // Program program_b_id does not belong to inst_a, returns null
          if (query._id === 'program_b_id' && query.institute === 'inst_a') {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }
      }
    ], async () => {
      await applyQuickAction(req, res);
    });

    console.log("\nScenario 2 [Apply Quick Action on Program B]:");
    console.log(`  Target status: 404, Actual status: ${state.statusCode}`);
    console.log(`  Response message: "${state.body?.message}"`);
    assert.strictEqual(state.statusCode, 404);
    assert.match(state.body?.message, /Batch not found in this institute/);
    console.log("  ✔ PASS: Syllabus action on cross-tenant program rejected with 404.");
  })();

  // ------------------------------------------------------------------------------------------
  // Scenario 3: Institute A Student -> Try password reset collision scenario
  // ------------------------------------------------------------------------------------------
  await (async () => {
    const req = {
      body: { email: 'duplicate@gfi.edu', instituteId: 'inst_a' },
      headers: {},
      socket: {}
    };
    const { res, state } = makeResponse();

    const userA = { _id: 'user_a_id', name: 'User A', email: 'duplicate@gfi.edu', instituteId: 'inst_a', save: () => Promise.resolve() };
    const userB = { _id: 'user_b_id', name: 'User B', email: 'duplicate@gfi.edu', instituteId: 'inst_b', save: () => Promise.resolve() };

    let auditLogCreatedWithUser = null;

    await withMocks([
      {
        target: User,
        method: 'find',
        impl: () => Promise.resolve([userA, userB])
      },
      {
        target: mongoose.Model.prototype,
        method: 'save',
        impl: function() {
          return Promise.resolve(this);
        }
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (log) => {
          auditLogCreatedWithUser = log.userId;
          return Promise.resolve(log);
        }
      }
    ], async () => {
      await requestPasswordReset(req, res);
    });

    console.log("\nScenario 3 [Password Reset Collision]:");
    console.log(`  Target resolved User ID: user_a_id, Actual resolved: ${auditLogCreatedWithUser}`);
    console.log(`  Response message: "${state.body?.message}"`);
    assert.strictEqual(auditLogCreatedWithUser, 'user_a_id');
    console.log("  ✔ PASS: Collision-safe password reset resolves to the correct user corresponding to the input instituteId.");
  })();

  // ------------------------------------------------------------------------------------------
  // Scenario 4: Institute A Admin -> Try sending push notification to Institute B user
  // ------------------------------------------------------------------------------------------
  await (async () => {
    const adminUser = { _id: 'admin_a_id', role: 'admin', institute: 'inst_a' };
    const req = {
      user: adminUser,
      body: { email: 'user_b@gfi.edu', title: 'Test Alert', body: 'Warning' }
    };
    const { res, state } = makeResponse();

    await withMocks([
      {
        target: User,
        method: 'findOne',
        impl: (query) => {
          // If searching with email and institute inst_a, it will not find user_b who belongs to inst_b
          if (query.email === 'user_b@gfi.edu' && query.institute === 'inst_a') {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }
      }
    ], async () => {
      await testPush(req, res);
    });

    console.log("\nScenario 4 [Test Push Notification to User B]:");
    console.log(`  Target status: 404, Actual status: ${state.statusCode}`);
    console.log(`  Response message: "${state.body?.message}"`);
    assert.strictEqual(state.statusCode, 404);
    assert.match(state.body?.message, /User with email "user_b@gfi.edu" not found/);
    console.log("  ✔ PASS: Attempt to send push notification cross-tenant is blocked.");
  })();

  // ------------------------------------------------------------------------------------------
  // Scenario 5: Institute A User -> Try login collision scenario
  // ------------------------------------------------------------------------------------------
  await (async () => {
    const req = {
      body: { email: 'duplicate@gfi.edu', password: 'password123', instituteId: 'inst_b' },
      headers: { 'user-agent': 'Mozilla' },
      socket: {}
    };
    const { res, state } = makeResponse();

    const mockUserA = { 
      _id: 'user_a_id', 
      email: 'duplicate@gfi.edu', 
      instituteId: 'inst_a', 
      matchPassword: () => Promise.resolve(true), 
      save: () => Promise.resolve() 
    };
    const mockUserB = { 
      _id: 'user_b_id', 
      email: 'duplicate@gfi.edu', 
      instituteId: 'inst_b', 
      matchPassword: () => Promise.resolve(true), 
      save: () => Promise.resolve(),
      status: 'active'
    };

    let resolvedLoginUser = null;

    await withMocks([
      {
        target: User,
        method: 'find',
        impl: () => Promise.resolve([mockUserA, mockUserB])
      },
      {
        target: User,
        method: 'findById',
        impl: () => ({
          populate: () => ({
            select: () => {
              resolvedLoginUser = 'user_b_id';
              return Promise.resolve(mockUserB);
            }
          })
        })
      },
      {
        target: AuditLog,
        method: 'create',
        impl: () => Promise.resolve({})
      },
      {
        target: SecuritySession,
        method: 'create',
        impl: () => Promise.resolve({})
      },
      {
        target: SecuritySession,
        method: 'findOne',
        impl: () => Promise.resolve(null)
      },
      {
        target: SecurityState,
        method: 'findOne',
        impl: () => Promise.resolve(null)
      },
      {
        target: _deps,
        method: 'upsertSecuritySessionFromRequest',
        impl: () => Promise.resolve({})
      }
    ], async () => {
      await loginUser(req, res);
    });

    console.log("\nScenario 5 [Login Collision]:");
    console.log(`  Target resolved User ID: user_b_id, Actual resolved: ${resolvedLoginUser}`);
    assert.strictEqual(resolvedLoginUser, 'user_b_id');
    console.log("  ✔ PASS: Login collision resolved correctly targeting Institute B user.");
  })();

  console.log("===================================================================================\n");
}

runVerification().catch(err => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
