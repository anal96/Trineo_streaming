import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { S3Client } from '@aws-sdk/client-s3';
import { registerInstitute, getActivePlans } from '../src/controllers/onboardingController.js';
import {
  getOnboardingRequests,
  approveOnboardingRequest,
  rejectOnboardingRequest,
  requestOnboardingInfo,
  getBillingDashboard,
  getBillingInvoices,
  createBillingInvoice,
  recordBillingInvoicePaid
} from '../src/controllers/ownerController.js';
import { checkStudentQuota, checkStorageQuota } from '../src/utils/quotaEnforcer.js';
import { requireActiveSubscription } from '../src/middleware/requireActiveSubscription.js';
import { loginUser } from '../src/controllers/authController.js';
import { Institute } from '../src/models/Institute.js';
import { User } from '../src/models/User.js';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan.js';
import { SubscriptionInvoice } from '../src/models/SubscriptionInvoice.js';
import { InvoiceCounter } from '../src/models/InvoiceCounter.js';
import { InvoiceAudit } from '../src/models/InvoiceAudit.js';
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
  // Set fake env variables to make isR2Configured return true globally for tests
  process.env.R2_ACCESS_KEY_ID = 'fake';
  process.env.R2_SECRET_ACCESS_KEY = 'fake';
  process.env.R2_ENDPOINT = 'https://fake-endpoint.com';
  process.env.R2_BUCKET_NAME = 'fake-bucket';
  process.env.R2_PUBLIC_URL = 'https://fake-public.com';

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
        target: SubscriptionPlan,
        method: 'findById',
        impl: () => Promise.resolve({ _id: '507f1f77bcf86cd799439014', name: 'Starter', price: 99, studentLimit: 100, storageLimit: 100, billingCycle: 'monthly' })
      },
      {
        target: SubscriptionPlan,
        method: 'findOne',
        impl: () => Promise.resolve({ _id: '507f1f77bcf86cd799439014', name: 'Starter', price: 99, studentLimit: 100, storageLimit: 100, billingCycle: 'monthly' })
      },
      {
        target: InvoiceCounter,
        method: 'findOneAndUpdate',
        impl: () => Promise.resolve({ year: new Date().getFullYear(), sequence: 6 })
      },
      {
        target: SubscriptionInvoice.prototype,
        method: 'save',
        impl: function() {
          return Promise.resolve(this);
        }
      },
      {
        target: InvoiceAudit,
        method: 'create',
        impl: (data) => {
          return Promise.resolve(data);
        }
      },
      {
        target: S3Client.prototype,
        method: 'send',
        impl: () => Promise.resolve({})
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

      if (state.statusCode !== 200) {
        throw new Error('Approve Onboarding Request Failed. Body: ' + JSON.stringify(state.body));
      }
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

  await t.test('createBillingInvoice - creates invoice with manual invoiceNumber', async () => {
    let savedInvoice = null;
    let auditsCreated = [];

    // Set fake env variables to make isR2Configured return true
    process.env.R2_ACCESS_KEY_ID = 'fake';
    process.env.R2_SECRET_ACCESS_KEY = 'fake';
    process.env.R2_ENDPOINT = 'https://fake-endpoint.com';
    process.env.R2_BUCKET_NAME = 'fake-bucket';
    process.env.R2_PUBLIC_URL = 'https://fake-public.com';

    const mockInstitute = {
      _id: '507f1f77bcf86cd799439011',
      instituteCode: 'GFI001',
      name: 'GFI Academy',
      billingCycle: 'monthly',
      planId: '507f1f77bcf86cd799439014',
      email: 'admin@gfi.edu',
      contactPerson: 'Director GFI'
    };

    const mocks = [
      {
        target: Institute,
        method: 'findById',
        impl: () => Promise.resolve(mockInstitute)
      },
      {
        target: SubscriptionPlan,
        method: 'findById',
        impl: () => Promise.resolve({ _id: '507f1f77bcf86cd799439014', name: 'Starter', price: 99, studentLimit: 100, storageLimit: 100, billingCycle: 'monthly' })
      },
      {
        target: InvoiceCounter,
        method: 'findOneAndUpdate',
        impl: () => Promise.resolve({ year: new Date().getFullYear(), sequence: 6 })
      },
      {
        target: SubscriptionInvoice.prototype,
        method: 'save',
        impl: function() {
          savedInvoice = this;
          this.notesTimeline = [];
          return Promise.resolve(this);
        }
      },
      {
        target: InvoiceAudit,
        method: 'create',
        impl: (data) => {
          auditsCreated.push(data);
          return Promise.resolve(data);
        }
      },
      {
        target: S3Client.prototype,
        method: 'send',
        impl: () => Promise.resolve({})
      }
    ];

    await withMocks(mocks, async () => {
      const req = {
        body: {
          instituteId: '507f1f77bcf86cd799439011',
          planId: '507f1f77bcf86cd799439014',
          amount: 99,
          dueDate: '2026-07-10',
          notes: 'Invoice for Starter plan'
        },
        user: { _id: '507f1f77bcf86cd799439013' },
        headers: {},
        socket: {}
      };
      const { res, state } = makeResponse();
      await createBillingInvoice(req, res);

      if (state.statusCode !== 201) {
        throw new Error('Create Billing Invoice Failed. Body: ' + JSON.stringify(state.body));
      }
      assert.equal(state.statusCode, 201);
      assert.ok(savedInvoice);
      assert.equal(savedInvoice.invoiceNumber, `INV-${new Date().getFullYear()}-000006`);
      assert.equal(savedInvoice.amountSnapshot, 99);
      assert.equal(savedInvoice.status, 'pending');
      assert.equal(auditsCreated.length, 2);
      assert.equal(auditsCreated[0].action, 'Invoice Created');
      assert.equal(auditsCreated[1].action, 'Invoice Emailed');
    });
  });

  await t.test('recordBillingInvoicePaid - marks paid and restores active subscription status', async () => {
    let savedInvoice = null;
    let savedInstitute = null;
    const auditsCreated = [];

    const mockInvoice = {
      _id: '507f1f77bcf86cd799439015',
      invoiceNumber: 'INV-2026-000006',
      instituteId: '507f1f77bcf86cd799439011',
      instituteCode: 'GFI001',
      billingCycleSnapshot: 'monthly',
      totalAmountSnapshot: 99,
      status: 'pending',
      notesTimeline: [],
      generatedPdfUrl: 'https://fake-public.com/invoices/GFI001/INV-2026-000006.pdf',
      save: function() {
        savedInvoice = this;
        return Promise.resolve(this);
      }
    };

    const mockInstitute = {
      _id: '507f1f77bcf86cd799439011',
      instituteCode: 'GFI001',
      name: 'GFI Academy',
      subscriptionStatus: 'payment_due',
      save: function() {
        savedInstitute = this;
        return Promise.resolve(this);
      }
    };

    const mocks = [
      {
        target: SubscriptionInvoice,
        method: 'findById',
        impl: () => Promise.resolve(mockInvoice)
      },
      {
        target: Institute,
        method: 'findById',
        impl: () => Promise.resolve(mockInstitute)
      },
      {
        target: InvoiceAudit,
        method: 'create',
        impl: (data) => {
          auditsCreated.push(data);
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
      await recordBillingInvoicePaid(req, res);

      assert.equal(state.statusCode, 200);
      assert.ok(savedInvoice);
      assert.equal(savedInvoice.status, 'paid');
      assert.equal(savedInvoice.paymentMethod, 'upi');
      assert.equal(savedInvoice.paymentReference, 'UPI123456789');
      assert.equal(savedInstitute.subscriptionStatus, 'active');
      assert.equal(savedInstitute.isTrialActive, false);
      assert.equal(auditsCreated.length, 2);
      assert.equal(auditsCreated[0].action, 'Marked Paid');
      assert.equal(auditsCreated[1].action, 'Reactivated');
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
