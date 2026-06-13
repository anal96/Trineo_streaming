import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ssoLogin, loginUser, getActiveSession, logoutUser, _deps } from '../src/controllers/authController.js';
import { protect } from '../src/middleware/auth.js';
import { Institute } from '../src/models/Institute.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { SecuritySession } from '../src/models/SecuritySession.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeResponse = () => {
  const state = {
    statusCode: 200,
    redirectUrl: undefined,
    cookies: {},
    body: undefined
  };

  const res = {
    status(code) { state.statusCode = code; return res; },
    json(payload) { state.body = payload; return res; },
    redirect(url) { state.redirectUrl = url; return res; },
    cookie(name, val, options) { state.cookies[name] = { val, options }; return res; },
    clearCookie(name, options) { delete state.cookies[name]; return res; }
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

const TEST_SECRET = 'trineo_sso_shared_secret_key_2026';

/** Build a valid SSO token with all required fields. */
const makeToken = (overrides = {}) => jwt.sign(
  {
    jti: `test-jti-${Date.now()}-${Math.random()}`,
    userId: 'crm-user-456',
    email: 'jit_user@gfi.edu',
    role: 'student',
    instituteId: 'inst_gfi',
    ...overrides
  },
  TEST_SECRET,
  { issuer: 'gfi-crm', audience: 'trineo-stream', expiresIn: '5m' }
);

/** No-op mocks for _deps that are always needed in the happy path. */
const noopDeps = () => [
  {
    target: _deps,
    method: 'UsedSSOToken',
    // Simulate: token not seen before on findOne, create succeeds
    impl: Object.assign(
      function () {},
      {
        findOne: () => Promise.resolve(null),
        create: () => Promise.resolve({ jti: 'x', userId: 'y', usedAt: new Date(), expiresAt: new Date() })
      }
    )
  },
  {
    target: _deps,
    method: 'upsertSecuritySessionFromRequest',
    impl: () => Promise.resolve({})
  }
];

// ─── Test Suite ───────────────────────────────────────────────────────────────

test('SSO Login Controller Verification', async (t) => {
  const mockInstObj = {
    _id: new mongoose.Types.ObjectId(),
    instituteId: 'inst_gfi',
    status: 'active',
    name: 'GFI Institute'
  };

  // ── Token presence ──────────────────────────────────────────────────────────
  await t.test('ssoLogin - rejects missing token parameter', async () => {
    const req = { query: {}, headers: { host: 'localhost:5000' }, socket: {} };
    const { res, state } = makeResponse();
    let loggedFailed = false;

    await withMocks([
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.eventType, 'SSO_LOGIN_FAILED');
          loggedFailed = true;
          return Promise.resolve({});
        }
      }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(loggedFailed, true);
    assert.equal(state.redirectUrl, 'http://localhost:5173/login?error=Invalid or expired SSO token');
  });

  // ── Signature validation ────────────────────────────────────────────────────
  await t.test('ssoLogin - rejects invalid signature token', async () => {
    const req = {
      query: { token: 'invalid.token.signature' },
      headers: { host: 'localhost:5000' },
      socket: {}
    };
    const { res, state } = makeResponse();
    let loggedFailed = false;

    await withMocks([
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.eventType, 'SSO_LOGIN_FAILED');
          assert.ok(payload.details.includes('verification failed'));
          loggedFailed = true;
          return Promise.resolve({});
        }
      }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(loggedFailed, true);
    assert.equal(state.redirectUrl, 'http://localhost:5173/login?error=Invalid or expired SSO token');
  });

  // ── Issuer + Audience enforcement ───────────────────────────────────────────
  await t.test('ssoLogin - rejects token with wrong issuer', async () => {
    const badToken = jwt.sign(
      { jti: 'jti-bad-iss', userId: 'u1', email: 'u@gfi.edu', role: 'student', instituteId: 'inst_gfi' },
      TEST_SECRET,
      { issuer: 'wrong-system', audience: 'trineo-stream', expiresIn: '5m' }
    );
    const req = { query: { token: badToken }, headers: { host: 'localhost:5000' }, socket: {} };
    const { res, state } = makeResponse();
    let loggedFailed = false;

    await withMocks([
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.eventType, 'SSO_LOGIN_FAILED');
          assert.ok(payload.details.includes('verification failed'));
          loggedFailed = true;
          return Promise.resolve({});
        }
      }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(loggedFailed, true);
    assert.equal(state.redirectUrl, 'http://localhost:5173/login?error=Invalid or expired SSO token');
  });

  await t.test('ssoLogin - rejects token with wrong audience', async () => {
    const badToken = jwt.sign(
      { jti: 'jti-bad-aud', userId: 'u1', email: 'u@gfi.edu', role: 'student', instituteId: 'inst_gfi' },
      TEST_SECRET,
      { issuer: 'gfi-crm', audience: 'some-other-service', expiresIn: '5m' }
    );
    const req = { query: { token: badToken }, headers: { host: 'localhost:5000' }, socket: {} };
    const { res, state } = makeResponse();
    let loggedFailed = false;

    await withMocks([
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.eventType, 'SSO_LOGIN_FAILED');
          loggedFailed = true;
          return Promise.resolve({});
        }
      }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(loggedFailed, true);
    assert.equal(state.redirectUrl, 'http://localhost:5173/login?error=Invalid or expired SSO token');
  });

  // ── Missing jti ─────────────────────────────────────────────────────────────
  await t.test('ssoLogin - rejects token missing jti claim', async () => {
    // jwt.sign without jti option — jti field won't be in payload
    const noJtiToken = jwt.sign(
      { userId: 'u1', email: 'u@gfi.edu', role: 'student', instituteId: 'inst_gfi' },
      TEST_SECRET,
      { issuer: 'gfi-crm', audience: 'trineo-stream', expiresIn: '5m' }
    );
    const req = { query: { token: noJtiToken }, headers: { host: 'localhost:5000' }, socket: {} };
    const { res, state } = makeResponse();
    let loggedFailed = false;

    await withMocks([
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.eventType, 'SSO_LOGIN_FAILED');
          assert.ok(payload.details.includes('jti'));
          loggedFailed = true;
          return Promise.resolve({});
        }
      }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(loggedFailed, true);
    assert.equal(state.redirectUrl, 'http://localhost:5173/login?error=Invalid or expired SSO token');
  });

  // ── Institute not found ─────────────────────────────────────────────────────
  await t.test('ssoLogin - rejects valid token if target institute not found', async () => {
    const token = makeToken({ instituteId: 'non_existent_inst' });
    const req = { query: { token }, headers: { host: 'localhost:5000' }, socket: {} };
    const { res, state } = makeResponse();
    let loggedFailed = false;

    await withMocks([
      {
        target: _deps,
        method: 'UsedSSOToken',
        impl: Object.assign(function () {}, {
          findOne: () => Promise.resolve(null),
          create: () => Promise.resolve({})
        })
      },
      {
        target: Institute,
        method: 'findOne',
        impl: () => Promise.resolve(null)
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          if (payload.eventType === 'SSO_LOGIN_FAILED') {
            assert.ok(payload.details.includes('not found'));
            loggedFailed = true;
          }
          return Promise.resolve({});
        }
      }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(loggedFailed, true);
    assert.equal(state.redirectUrl, 'http://localhost:5173/login?error=Invalid or expired SSO token');
  });

  // ── Replay protection ───────────────────────────────────────────────────────
  await t.test('ssoLogin - rejects already-used jti (replay attack)', async () => {
    const reusedJti = `replay-jti-${Date.now()}`;
    const token = makeToken({ jti: reusedJti });
    const req = { query: { token }, headers: { host: 'localhost:5000' }, socket: {} };
    const { res, state } = makeResponse();
    let loggedReuse = false;

    const existingRecord = { jti: reusedJti, userId: 'crm-user-456', usedAt: new Date(Date.now() - 30000), expiresAt: new Date(Date.now() + 270000) };

    await withMocks([
      {
        target: _deps,
        method: 'UsedSSOToken',
        impl: Object.assign(function () {}, {
          findOne: () => Promise.resolve(existingRecord),
          create: () => { throw new Error('Should not reach create'); }
        })
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          assert.equal(payload.eventType, 'SSO_TOKEN_REUSED');
          assert.ok(payload.details.includes(reusedJti));
          assert.ok(payload.details.includes('already used'));
          loggedReuse = true;
          return Promise.resolve({});
        }
      }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(loggedReuse, true);
    assert.equal(state.redirectUrl, 'http://localhost:5173/login?error=SSO token already used');
  });

  await t.test('ssoLogin - stores jti in UsedSSOToken on first use', async () => {
    const newJti = `fresh-jti-${Date.now()}`;
    const token = makeToken({ jti: newJti });
    const req = {
      query: { token },
      headers: { host: 'localhost:5000', 'user-agent': 'Chrome' },
      socket: {}
    };
    const { res, state } = makeResponse();
    let jtiStored = false;

    await withMocks([
      {
        target: _deps,
        method: 'UsedSSOToken',
        impl: Object.assign(function () {}, {
          findOne: () => Promise.resolve(null), // fresh jti
          create: (doc) => {
            assert.equal(doc.jti, newJti);
            assert.equal(doc.userId, 'crm-user-456');
            assert.ok(doc.expiresAt instanceof Date);
            jtiStored = true;
            return Promise.resolve(doc);
          }
        })
      },
      { target: Institute, method: 'findOne', impl: () => Promise.resolve(mockInstObj) },
      { target: User, method: 'findOne', impl: () => Promise.resolve(null) },
      {
        target: User,
        method: 'findById',
        impl: (id) => ({
          populate: () => ({
            select: () => Promise.resolve({ _id: id, user_id: 123456, name: 'jit_user', email: 'jit_user@gfi.edu', role: 'student', institute: mockInstObj })
          })
        })
      },
      {
        target: User.prototype,
        method: 'save',
        impl: function () { this._id = new mongoose.Types.ObjectId(); return Promise.resolve(this); }
      },
      { target: AuditLog, method: 'create', impl: () => Promise.resolve({}) },
      { target: _deps, method: 'upsertSecuritySessionFromRequest', impl: () => Promise.resolve({}) }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(jtiStored, true);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────
  await t.test('ssoLogin - provisions user JIT, sets secure cookie and redirects', async () => {
    const token = makeToken();
    const req = {
      query: { token },
      headers: { host: 'localhost:5000', 'user-agent': 'Chrome' },
      socket: {}
    };
    const { res, state } = makeResponse();
    let userSaved = false;
    let loggedSuccess = false;

    await withMocks([
      {
        target: _deps,
        method: 'UsedSSOToken',
        impl: Object.assign(function () {}, {
          findOne: () => Promise.resolve(null),
          create: () => Promise.resolve({})
        })
      },
      { target: Institute, method: 'findOne', impl: () => Promise.resolve(mockInstObj) },
      { target: User, method: 'findOne', impl: () => Promise.resolve(null) },
      {
        target: User,
        method: 'findById',
        impl: (id) => ({
          populate: () => ({
            select: () => Promise.resolve({ _id: id, user_id: 123456, name: 'jit_user', email: 'jit_user@gfi.edu', role: 'student', institute: mockInstObj })
          })
        })
      },
      {
        target: User.prototype,
        method: 'save',
        impl: function () {
          assert.equal(this.email, 'jit_user@gfi.edu');
          assert.equal(this.studentId, 'crm-user-456');
          assert.equal(this.role, 'student');
          this._id = new mongoose.Types.ObjectId();
          userSaved = true;
          return Promise.resolve(this);
        }
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          if (payload.eventType === 'SSO_LOGIN_SUCCESS') {
            assert.ok(payload.details.includes('Successful SSO login'));
            loggedSuccess = true;
          }
          return Promise.resolve({});
        }
      },
      { target: _deps, method: 'upsertSecuritySessionFromRequest', impl: () => Promise.resolve({}) }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(userSaved, true);
    assert.equal(loggedSuccess, true);
    assert.equal(state.redirectUrl, 'http://localhost:5173/student');
    assert.ok(state.cookies['token']);
    assert.equal(state.cookies['token'].options.httpOnly, true);
    assert.equal(state.cookies['token'].options.sameSite, 'none');
  });

  await t.test('ssoLogin - redirects admins to /admin', async () => {
    const token = makeToken({ userId: 'crm-admin-1', email: 'admin@gfi.edu', role: 'admin' });
    const req = {
      query: { token },
      headers: { host: 'localhost:5000', 'user-agent': 'Chrome' },
      socket: {}
    };
    const { res, state } = makeResponse();

    await withMocks([
      {
        target: _deps,
        method: 'UsedSSOToken',
        impl: Object.assign(function () {}, {
          findOne: () => Promise.resolve(null),
          create: () => Promise.resolve({})
        })
      },
      { target: Institute, method: 'findOne', impl: () => Promise.resolve(mockInstObj) },
      { target: User, method: 'findOne', impl: () => Promise.resolve(null) },
      {
        target: User,
        method: 'findById',
        impl: (id) => ({
          populate: () => ({
            select: () => Promise.resolve({ _id: id, user_id: 123456, name: 'admin', email: 'admin@gfi.edu', role: 'admin', institute: mockInstObj })
          })
        })
      },
      {
        target: User.prototype,
        method: 'save',
        impl: function () { this._id = new mongoose.Types.ObjectId(); return Promise.resolve(this); }
      },
      { target: AuditLog, method: 'create', impl: () => Promise.resolve({}) },
      { target: _deps, method: 'upsertSecuritySessionFromRequest', impl: () => Promise.resolve({}) }
    ], async () => { await ssoLogin(req, res); });

    assert.equal(state.redirectUrl, 'http://localhost:5173/admin');
  });

  // ── getActiveSession ────────────────────────────────────────────────────────
  await t.test('getActiveSession - returns user profile without JWT token', async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      user_id: 123456,
      name: 'SSO User',
      email: 'sso_user@gfi.edu',
      role: 'student',
      phone: '1234567890',
      branchName: 'Main Branch',
      batchName: '2026 Batch',
      courseName: 'Full Stack Web',
      enrollmentDate: new Date(),
      institute: mockInstObj
    };

    const req = { user: mockUser };
    const { res, state } = makeResponse();

    await withMocks([
      {
        target: User,
        method: 'findById',
        impl: () => ({
          populate: () => ({ select: () => Promise.resolve(mockUser) })
        })
      }
    ], async () => { await getActiveSession(req, res); });

    assert.equal(state.body._id, mockUser._id);
    assert.equal(state.body.user_id, mockUser.user_id);
    assert.equal(state.body.name, mockUser.name);
    assert.equal(state.body.email, mockUser.email);
    assert.equal(state.body.role, mockUser.role);
    assert.equal(state.body.token, undefined); // Token MUST not be present
  });

  // ── Single Active Session enforcement ─────────────────────────────────────
  await t.test('loginUser - enforces single active session and logs SESSION_REPLACED', async () => {
    const mockUserInstance = {
      _id: new mongoose.Types.ObjectId(),
      email: 'active_session@gfi.edu',
      status: 'active',
      activeSessionToken: 'existing-session-token',
      matchPassword: () => Promise.resolve(true),
      save: function () { return Promise.resolve(this); }
    };

    const req = {
      body: { email: 'active_session@gfi.edu', password: 'password123' },
      headers: { 'user-agent': 'Mozilla' },
      socket: {}
    };
    const { res, state } = makeResponse();

    let sessionReplacedLogged = false;
    let loginSuccessLogged = false;
    let securitySessionsTerminated = false;

    await withMocks([
      { target: User, method: 'findOne', impl: () => Promise.resolve(mockUserInstance) },
      {
        target: User,
        method: 'findById',
        impl: (id) => ({
          populate: () => ({ select: () => Promise.resolve(mockUserInstance) })
        })
      },
      { target: _deps, method: 'upsertSecuritySessionFromRequest', impl: () => Promise.resolve({}) },
      {
        target: SecuritySession,
        method: 'updateMany',
        impl: (filter, update) => {
          assert.equal(filter.userId, mockUserInstance._id);
          assert.equal(update.$set.status, 'terminated');
          securitySessionsTerminated = true;
          return Promise.resolve({});
        }
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (payload) => {
          if (payload.eventType === 'SESSION_REPLACED') {
            sessionReplacedLogged = true;
          } else if (payload.eventType === 'LOGIN_SUCCESS') {
            loginSuccessLogged = true;
          }
          return Promise.resolve({});
        }
      }
    ], async () => {
      await loginUser(req, res);
    });

    assert.equal(securitySessionsTerminated, true);
    assert.equal(sessionReplacedLogged, true);
    assert.equal(loginSuccessLogged, true);
    assert.ok(mockUserInstance.activeSessionToken);
    assert.notEqual(mockUserInstance.activeSessionToken, 'existing-session-token');
  });

  await t.test('protect middleware - blocks access when activeSessionToken does not match', async () => {
    const mockUserInstance = {
      _id: new mongoose.Types.ObjectId(),
      role: 'student',
      status: 'active',
      activeSessionToken: 'new-active-session-token'
    };

    const oldToken = jwt.sign({ id: mockUserInstance._id }, process.env.JWT_SECRET || 'trineo_stream_premium_saas_crm_lms_secret_key_2026_xyz');
    
    const req = {
      cookies: { token: oldToken },
      headers: {},
      query: {}
    };

    let responseStatus = null;
    let responseBody = null;

    const res = {
      status(code) { responseStatus = code; return res; },
      json(body) { responseBody = body; return res; }
    };

    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await withMocks([
      { target: User, method: 'findById', impl: () => ({ select: () => Promise.resolve(mockUserInstance) }) }
    ], async () => {
      await protect(req, res, next);
    });

    assert.equal(responseStatus, 401);
    assert.equal(responseBody.message, 'Session expired. Logged in from another device.');
    assert.equal(responseBody.oneDeviceViolation, true);
    assert.equal(nextCalled, false);
  });
});
