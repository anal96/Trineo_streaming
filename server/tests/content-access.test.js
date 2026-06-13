import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyStudentAccess } from '../src/utils/accessHelper.js';
import { StudentAccess } from '../src/models/StudentAccess.js';
import { AccessPackage } from '../src/models/AccessPackage.js';
import { BatchAccess } from '../src/models/BatchAccess.js';
import { Purchase } from '../src/models/Purchase.js';
import { Course } from '../src/models/Course.js';

const withMock = async (target, method, impl, fn) => {
  const original = target[method];
  target[method] = impl;
  try {
    return await fn();
  } finally {
    target[method] = original;
  }
};

test('content access rules verification', async (t) => {
  const mockUser = {
    _id: 'student-123',
    institute: 'inst-1',
    role: 'student',
    status: 'active'
  };

  await t.test('allows owner and admin by default', async () => {
    const adminUser = { role: 'admin' };
    const access = await verifyStudentAccess({ user: adminUser, courseId: 'course-1' });
    assert.equal(access.granted, true);
    assert.equal(access.source, 'role');
  });

  await t.test('blocks suspended accounts', async () => {
    const suspendedUser = { role: 'student', status: 'suspended' };
    const access = await verifyStudentAccess({ user: suspendedUser, courseId: 'course-1' });
    assert.equal(access.granted, false);
    assert.equal(access.status, 'suspended');
  });

  await t.test('blocks access when course is locked', async () => {
    // Mock StudentAccess.find to return a course-level lock record
    await withMock(StudentAccess, 'find', () => Promise.resolve([
      { accessType: 'course', status: 'locked' }
    ]), async () => {
      const access = await verifyStudentAccess({
        user: mockUser,
        courseId: 'course-1'
      });
      assert.equal(access.granted, false);
      assert.equal(access.status, 'locked');
      assert.match(access.reason, /Locked/);
    });
  });

  await t.test('blocks access when lesson is locked', async () => {
    // Mock StudentAccess.find to return a lesson-level lock record
    await withMock(StudentAccess, 'find', () => Promise.resolve([
      { accessType: 'lesson', lessonId: 'lesson-locked', status: 'locked' }
    ]), async () => {
      const access = await verifyStudentAccess({
        user: mockUser,
        courseId: 'course-1',
        lessonId: 'lesson-locked'
      });
      assert.equal(access.granted, false);
      assert.equal(access.status, 'locked');
    });
  });

  await t.test('grants access when purchase is active', async () => {
    // Mock StudentAccess.find to return empty
    // Mock Purchase.findOne to return a valid purchase
    await withMock(StudentAccess, 'find', () => Promise.resolve([]), async () => {
      await withMock(Purchase, 'findOne', () => Promise.resolve({ _id: 'purchase-1' }), async () => {
        const access = await verifyStudentAccess({
          user: mockUser,
          courseId: 'course-1'
        });
        assert.equal(access.granted, true);
        assert.equal(access.source, 'purchase');
      });
    });
  });
});
