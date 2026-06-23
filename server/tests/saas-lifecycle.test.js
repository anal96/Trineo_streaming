import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { registerInstitute, getActivePlans } from '../src/controllers/onboardingController.js';
import {
  getOnboardingRequests,
  approveOnboardingRequest,
  rejectOnboardingRequest,
  requestOnboardingInfo,
  getBillingDashboard,
  getBillingPayments,
  createBillingPayment,
  recordBillingPaymentPaid
} from '../src/controllers/ownerController.js';
import { checkStudentQuota, checkStorageQuota } from '../src/utils/quotaEnforcer.js';
import { requireActiveSubscription } from '../src/middleware/requireActiveSubscription.js';
import { loginUser } from '../src/controllers/authController.js';
import { Institute } from '../src/models/Institute.js';
import { User } from '../src/models/User.js';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan.js';
import { SubscriptionPayment } from '../src/models/SubscriptionPayment.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { OwnerActionLog } from '../src/models/OwnerActionLog.js';

// ─── Mocking Helpers ──────────────────────────────────────────────────────────
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

test('SaaS Lifecycle & Manual Payments Flow', async (t) => {

  await t.test('registerInstitute - successfully registers new pending institute', async () => {
    let instituteCreated = null;
    let userCreated = null;
    let auditLogCreated = null;

    const mocks = [
      {
        target: User,
        method: 'findOne',
        impl: () => Promise.resolve(null)
      },
      {
        target: Institute,
        method: 'findOne',
        impl: () => Promise.resolve(null)
      },
      {
        target: SubscriptionPlan,
        method: 'findById',
        impl: (id) => Promise.resolve({ _id: id, name: 'Starter', price: 99, studentLimit: 100, storageLimit: 100 })
      },
      {
        target: Institute.prototype,
        method: 'save',
        impl: function() {
          instituteCreated = this;
          this._id = new mongoose.Types.ObjectId();
          this.instituteCode = 'TEMP-12345';
          return Promise.resolve(this);
        }
      },
      {
        target: User.prototype,
        method: 'save',
        impl: function() {
          userCreated = this;
          this._id = new mongoose.Types.ObjectId();
          return Promise.resolve(this);
        }
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (data) => {
          auditLogCreated = data;
          return Promise.resolve(data);
        }
      }
    ];

    await withMocks(mocks, async () => {
      const req = {
        body: {
          name: 'GFI Academy',
          email: 'admin@gfi.edu',
          contactPerson: 'Director GFI',
          phone: '9988776655',
          planId: new mongoose.Types.ObjectId().toString(),
          adminPassword: 'securePassword123!'
        },
        headers: {},
        socket: {}
      };
      const { res, state } = makeResponse();
      await registerInstitute(req, res);

      assert.equal(state.statusCode, 201);
      assert.ok(instituteCreated);
      assert.equal(instituteCreated.onboardingStatus, 'pending');
      assert.equal(instituteCreated.subscriptionStatus, 'inactive');
      assert.equal(userCreated.status, 'inactive');
      assert.equal(auditLogCreated.eventType, 'INSTITUTE_REGISTERED');
    });
  });

  await t.test('approveOnboardingRequest - updates statuses, activates 14-day trial & admin user', async () => {
    let savedInstitute = null;
    let savedUser = null;
    let generatedCode = '';
    const auditLogs = [];

    const mockInstitute = {
      _id: '507f1f77bcf86cd799439011',
      name: 'GFI Academy',
      email: 'admin@gfi.edu',
      contactPerson: 'Director GFI',
      onboardingStatus: 'pending',
      subscriptionStatus: 'inactive',
      save: function() {
        savedInstitute = this;
        generatedCode = this.instituteCode;
        return Promise.resolve(this);
      }
    };

    const mockAdminUser = {
      _id: '507f1f77bcf86cd799439012',
      status: 'inactive',
      save: function() {
        savedUser = this;
        return Promise.resolve(this);
      }
    };

    const mocks = [
      {
        target: Institute,
        method: 'findById',
        impl: () => Promise.resolve(mockInstitute)
      },
      {
        target: Institute,
        method: 'findOne',
        impl: () => Promise.resolve(null) // No duplicate sequence code matches
      },
      {
        target: User,
        method: 'findOne',
        impl: () => Promise.resolve(mockAdminUser)
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (data) => {
          auditLogs.push(data);
          return Promise.resolve(data);
        }
      },
      {
        target: OwnerActionLog,
        method: 'create',
        impl: (data) => {
          return Promise.resolve(data);
        }
      }
    ];

    await withMocks(mocks, async () => {
      const req = {
        params: { id: '507f1f77bcf86cd799439011' },
        user: { _id: '507f1f77bcf86cd799439013' },
        headers: {},
        socket: {}
      };
      const { res, state } = makeResponse();
      await approveOnboardingRequest(req, res);

      assert.equal(state.statusCode, 200);
      assert.ok(savedInstitute);
      assert.equal(savedInstitute.onboardingStatus, 'approved');
      assert.equal(savedInstitute.subscriptionStatus, 'active');
      assert.equal(savedInstitute.isTrialActive, true);
      assert.ok(savedInstitute.trialEndDate > new Date());
      assert.equal(savedUser.status, 'active');
      assert.ok(generatedCode.startsWith('GFI'));
      assert.equal(auditLogs.length, 2);
      assert.equal(auditLogs[0].eventType, 'INSTITUTE_APPROVED');
      assert.equal(auditLogs[1].eventType, 'TRIAL_STARTED');
    });
  });

  await t.test('createBillingPayment - creates invoice with manual invoiceNumber', async () => {
    let savedPayment = null;
    let auditLog = null;

    const mockInstitute = {
      _id: '507f1f77bcf86cd799439011',
      instituteCode: 'GFI001',
      billingCycle: 'monthly',
      planId: '507f1f77bcf86cd799439014'
    };

    const mocks = [
      {
        target: Institute,
        method: 'findById',
        impl: () => Promise.resolve(mockInstitute)
      },
      {
        target: SubscriptionPayment,
        method: 'countDocuments',
        impl: () => Promise.resolve(5)
      },
      {
        target: SubscriptionPayment.prototype,
        method: 'save',
        impl: function() {
          savedPayment = this;
          return Promise.resolve(this);
        }
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (data) => {
          auditLog = data;
          return Promise.resolve(data);
        }
      }
    ];

    await withMocks(mocks, async () => {
      const req = {
        body: {
          instituteId: '507f1f77bcf86cd799439011',
          amount: 99,
          dueDate: '2026-07-10',
          notes: 'Invoice for Starter plan'
        },
        user: { _id: '507f1f77bcf86cd799439013' },
        headers: {},
        socket: {}
      };
      const { res, state } = makeResponse();
      await createBillingPayment(req, res);

      assert.equal(state.statusCode, 201);
      assert.ok(savedPayment);
      assert.equal(savedPayment.invoiceNumber, `INV-${new Date().getFullYear()}-0006`);
      assert.equal(savedPayment.amount, 99);
      assert.equal(savedPayment.status, 'pending');
      assert.equal(auditLog.eventType, 'PAYMENT_DUE');
    });
  });

  await t.test('recordBillingPaymentPaid - marks paid and restores active subscription status', async () => {
    let savedPayment = null;
    let savedInstitute = null;
    const auditLogs = [];

    const mockPayment = {
      _id: '507f1f77bcf86cd799439015',
      instituteId: '507f1f77bcf86cd799439011',
      instituteCode: 'GFI001',
      amount: 99,
      billingCycle: 'monthly',
      status: 'pending',
      save: function() {
        savedPayment = this;
        return Promise.resolve(this);
      }
    };

    const mockInstitute = {
      _id: '507f1f77bcf86cd799439011',
      instituteCode: 'GFI001',
      subscriptionStatus: 'payment_due',
      save: function() {
        savedInstitute = this;
        return Promise.resolve(this);
      }
    };

    const mocks = [
      {
        target: SubscriptionPayment,
        method: 'findById',
        impl: () => Promise.resolve(mockPayment)
      },
      {
        target: Institute,
        method: 'findById',
        impl: () => Promise.resolve(mockInstitute)
      },
      {
        target: AuditLog,
        method: 'create',
        impl: (data) => {
          auditLogs.push(data);
          return Promise.resolve(data);
        }
      }
    ];

    await withMocks(mocks, async () => {
      const req = {
        params: { id: '507f1f77bcf86cd799439015' },
        body: {
          paymentMethod: 'upi',
          paymentReference: 'UPI123456789',
          notes: 'Received via GPay'
        },
        user: { _id: '507f1f77bcf86cd799439013' },
        headers: {},
        socket: {}
      };
      const { res, state } = makeResponse();
      await recordBillingPaymentPaid(req, res);

      assert.equal(state.statusCode, 200);
      assert.ok(savedPayment);
      assert.equal(savedPayment.status, 'paid');
      assert.equal(savedPayment.paymentMethod, 'upi');
      assert.equal(savedPayment.paymentReference, 'UPI123456789');
      assert.equal(savedInstitute.subscriptionStatus, 'active');
      assert.equal(savedInstitute.isTrialActive, false);
      assert.equal(auditLogs.length, 2);
      assert.equal(auditLogs[0].eventType, 'PAYMENT_RECEIVED');
      assert.equal(auditLogs[1].eventType, 'SUBSCRIPTION_REACTIVATED');
    });
  });

  await t.test('checkStudentQuota & checkStorageQuota - enforces Starter plan limit limits', async () => {
    const mockInstitute = {
      _id: '507f1f77bcf86cd799439011',
      storageUsedGB: 95,
      planId: { name: 'Starter', studentLimit: 100, storageLimit: 100 }
    };

    const mocks = [
      {
        target: Institute,
        method: 'findById',
        impl: () => ({
          populate: () => Promise.resolve(mockInstitute)
        })
      },
      {
        target: User,
        method: 'countDocuments',
        impl: () => Promise.resolve(98)
      }
    ];

    await withMocks(mocks, async () => {
      // Students count inside limit should pass
      const ok = await checkStudentQuota('507f1f77bcf86cd799439011', 1);
      assert.equal(ok, true);

      // Exceed student limit should throw
      await assert.rejects(
        () => checkStudentQuota('507f1f77bcf86cd799439011', 5),
        /Your plan limit has been reached. Please contact Trineo Support./
      );

      // Exceed storage limit (approx 6GB in bytes = 6 * 1024^3) should throw
      await assert.rejects(
        () => checkStorageQuota('507f1f77bcf86cd799439011', 6 * 1024 * 1024 * 1024),
        /Your plan limit has been reached. Please contact Trineo Support./
      );
    });
  });

  await t.test('requireActiveSubscription middleware - permits active status, blocks suspended', async () => {
    let nextCalled = false;

    const mockActiveInstitute = {
      _id: 'inst-active',
      subscriptionStatus: 'active'
    };

    const mockSuspendedInstitute = {
      _id: 'inst-suspended',
      subscriptionStatus: 'suspended'
    };

    const mocks = [
      {
        target: Institute,
        method: 'findById',
        impl: (id) => {
          if (id === 'inst-active') return Promise.resolve(mockActiveInstitute);
          return Promise.resolve(mockSuspendedInstitute);
        }
      }
    ];

    await withMocks(mocks, async () => {
      const { res: resActive, state: stateActive } = makeResponse();
      nextCalled = false;
      await requireActiveSubscription(
        { user: { institute: 'inst-active' } },
        resActive,
        () => { nextCalled = true; }
      );
      assert.equal(nextCalled, true, 'Should proceed for active subscription');

      const { res: resSuspended, state: stateSuspended } = makeResponse();
      nextCalled = false;
      await requireActiveSubscription(
        { user: { institute: 'inst-suspended' } },
        resSuspended,
        () => { nextCalled = true; }
      );
      assert.equal(nextCalled, false, 'Should block suspended subscription');
      assert.equal(stateSuspended.statusCode, 403);
      assert.match(stateSuspended.body.message, /Institute subscription inactive./);
    });
  });
});
