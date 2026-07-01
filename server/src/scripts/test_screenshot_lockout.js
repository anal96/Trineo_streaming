import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { SecurityState } from '../models/SecurityState.js';

import { SecuritySession } from '../models/SecuritySession.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trineo_stream';

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB:', MONGO_URI);

  // 1. Setup/Reset test user
  const email = 'ram@finfirst.co.in';
  const user = await User.findOne({ email });
  if (!user) {
    console.error('Test user not found');
    process.exit(1);
  }

  user.status = 'active';
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'trineo_stream_premium_saas_crm_lms_secret_key_2026_xyz',
    { expiresIn: '30d' }
  );
  user.activeSessionToken = token;
  await user.save();
  console.log(`Reset user ${email} status to active.`);

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

  const syncSession = async (tkn) => {
    await SecuritySession.updateMany(
      { userId: user._id, status: 'active' },
      { $set: { status: 'terminated' } }
    );
    await SecuritySession.create({
      userId: user._id,
      tokenSuffix: tkn.slice(-12),
      status: 'active',
      userAgent,
      browser: 'Chrome',
      device: 'Windows',
      sessionId: `sess-${Date.now()}`
    });
  };

  await syncSession(token);

  // Reset SecurityState to 2 violations
  let state = await SecurityState.findOne({ userId: user._id });
  if (!state) {
    state = await SecurityState.create({ userId: user._id });
  }
  state.violationCount = 2;
  state.accountLocked = false;
  state.penaltyUntil = null;
  state.forceLogout = false;
  state.lastViolationAt = new Date(Date.now() - 10000); // clear debounce
  await state.save();
  console.log(`Reset SecurityState for ${email} to 2 violations.`);

  // 2. Trigger Violation 3 (Session Terminated)
  console.log('\n--- Triggering Violation 3 ---');
  let res = await fetch('http://127.0.0.1:5000/api/security/audit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': userAgent
    },
    body: JSON.stringify({
      eventType: 'screenshot',
      details: 'Test screenshot at violation 3'
    })
  });

  console.log('Violation 3 Status:', res.status);
  let payload = await res.json();
  console.log('Violation 3 Body:', JSON.stringify(payload, null, 2));

  // Verify response fields
  if (payload.action === 'session_terminated' && payload.code === 'SESSION_TERMINATED' && payload.logout === true) {
    console.log('✅ Violation 3 correctly standardizes SESSION_TERMINATED payload');
  } else {
    console.error('❌ Violation 3 standardization failed');
  }

  // 3. Clear token requirements & trigger Violation 4 (Account Locked)
  // Re-sign token since session is invalidated on attempt 3
  const freshUser = await User.findOne({ email: 'ram@finfirst.co.in' });
  if (!freshUser) {
    console.error('freshUser not found');
    process.exit(1);
  }
  const freshToken = jwt.sign(
    { id: freshUser._id },
    process.env.JWT_SECRET || 'trineo_stream_premium_saas_crm_lms_secret_key_2026_xyz',
    { expiresIn: '30d' }
  );
  freshUser.activeSessionToken = freshToken;
  freshUser.status = 'active';
  await freshUser.save();
  await syncSession(freshToken);
  
  state.lastViolationAt = new Date(Date.now() - 10000); // clear debounce
  await state.save();

  console.log('\n--- Triggering Violation 4 ---');
  res = await fetch('http://127.0.0.1:5000/api/security/audit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${freshToken}`,
      'Content-Type': 'application/json',
      'User-Agent': userAgent
    },
    body: JSON.stringify({
      eventType: 'screenshot',
      details: 'Test screenshot at violation 4'
    })
  });

  console.log('Violation 4 Status:', res.status);
  payload = await res.json();
  console.log('Violation 4 Body:', JSON.stringify(payload, null, 2));

  if (payload.action === 'account_locked' && payload.code === 'ACCOUNT_LOCKED' && payload.logout === true) {
    console.log('✅ Violation 4 correctly standardizes ACCOUNT_LOCKED payload');
  } else {
    console.error('❌ Violation 4 standardization failed');
  }

  // 4. Test subsequent polling
  console.log('\n--- Testing subsequent status polling (should fail with 403 Standardised JSON) ---');
  res = await fetch('http://127.0.0.1:5000/api/security/status', {
    headers: {
      'Authorization': `Bearer ${freshToken}`,
      'User-Agent': userAgent
    }
  });

  console.log('Subsequent status poll response status:', res.status);
  payload = await res.json();
  console.log('Subsequent status poll response body:', JSON.stringify(payload, null, 2));

  if (res.status === 403 && payload.code === 'ACCOUNT_LOCKED' && payload.logout === true) {
    console.log('✅ Subsequent status poll correctly returns standardized 403 ACCOUNT_LOCKED payload');
  } else {
    console.error('❌ Subsequent status poll check failed');
  }

  process.exit(0);
};

run().catch(console.error);
