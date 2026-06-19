import test from 'node:test';
import assert from 'node:assert/strict';
import securityRoutes from '../src/routes/securityRoutes.js';
import { tenantGuard } from '../src/middleware/tenantGuard.js';
import { Course } from '../src/models/Course.js';
import { Lesson } from '../src/models/Lesson.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { SecurityEvent } from '../src/models/SecurityEvent.js';

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

const runMiddleware = async (fn, req) => {
  const { res, state } = makeResponse();
  let nextCalled = false;

  await Promise.resolve(fn(req, res, () => {
    nextCalled = true;
  }));

  return { nextCalled, ...state };
};

const withMock = async (target, method, impl, fn) => {
  const original = target[method];
  target[method] = impl;
  try {
    return await fn();
  } finally {
    target[method] = original;
  }
};

const queryResult = (doc) => ({
  select() {
    return Promise.resolve(doc);
  }
});

const auditRoute = securityRoutes.stack.find((layer) => layer.route?.path === '/audit' && layer.route.methods?.get);
const auditHandler = auditRoute.route.stack[auditRoute.route.stack.length - 1].handle;

test('tenant isolation hardening', async (t) => {
  await t.test('rejects cross-tenant course read attempts', async () => {
    await withMock(Course, 'findOne', (query) => queryResult({ _id: query._id, institute: 'institute-b' }), async () => {
      const result = await runMiddleware(
        tenantGuard({ model: Course, idParam: 'id' }),
        { user: { role: 'admin', institute: 'institute-a' }, params: { id: 'course-1' }, body: {} }
      );

      assert.equal(result.statusCode, 403);
      assert.equal(result.body.message, 'Forbidden: cross-tenant access denied');
      assert.equal(result.nextCalled, false);
    });
  });

  await t.test('rejects cross-tenant course update attempts', async () => {
    await withMock(Course, 'findOne', (query) => queryResult({ _id: query._id, institute: 'institute-b' }), async () => {
      const result = await runMiddleware(
        tenantGuard({ model: Course, idParam: 'id' }),
        { user: { role: 'admin', institute: 'institute-a' }, params: { id: 'course-1' }, body: {} }
      );

      assert.equal(result.statusCode, 403);
      assert.equal(result.body.message, 'Forbidden: cross-tenant access denied');
    });
  });

  await t.test('rejects cross-tenant course delete attempts', async () => {
    await withMock(Course, 'findOne', (query) => queryResult({ _id: query._id, institute: 'institute-b' }), async () => {
      const result = await runMiddleware(
        tenantGuard({ model: Course, idParam: 'id' }),
        { user: { role: 'admin', institute: 'institute-a' }, params: { id: 'course-1' }, body: {} }
      );

      assert.equal(result.statusCode, 403);
      assert.equal(result.body.message, 'Forbidden: cross-tenant access denied');
    });
  });

  await t.test('rejects cross-tenant lesson watch attempts', async () => {
    await withMock(Lesson, 'findOne', (query) => queryResult({ _id: query._id, institute: 'institute-b' }), async () => {
      const result = await runMiddleware(
        tenantGuard({ model: Lesson, idParam: 'lessonId' }),
        { user: { role: 'student', institute: 'institute-a' }, params: { lessonId: 'lesson-1' }, body: {} }
      );

      assert.equal(result.statusCode, 403);
      assert.equal(result.body.message, 'Forbidden: cross-tenant access denied');
    });
  });

  await t.test('rejects cross-tenant video access attempts', async () => {
    await withMock(Lesson, 'findOne', (query) => queryResult({ _id: query._id, institute: 'institute-b' }), async () => {
      const result = await runMiddleware(
        tenantGuard({ model: Lesson, idParam: 'lessonId' }),
        { user: { role: 'student', institute: 'institute-a' }, params: { lessonId: 'lesson-1' }, body: {} }
      );

      assert.equal(result.statusCode, 403);
      assert.equal(result.body.message, 'Forbidden: cross-tenant access denied');
    });
  });

  await t.test('scopes audit log reads to the active institute', async () => {
    let capturedQuery = null;
    const chain = {
      populate() {
        return chain;
      },
      sort() {
        return chain;
      },
      limit() {
        return Promise.resolve([{ _id: 'audit-1' }]);
      }
    };

    await withMock(SecurityEvent, 'find', (query) => {
      capturedQuery = query;
      return chain;
    }, async () => {
      const { res, state } = makeResponse();
      await auditHandler(
        { user: { role: 'admin', institute: 'institute-a' }, query: {}, headers: {}, socket: {} },
        res
      );

      assert.equal(capturedQuery.institute, 'institute-a');
      assert.ok(state.body);
      assert.equal(state.statusCode, 200);
    });
  });
});
