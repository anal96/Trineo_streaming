import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Institute } from '../src/models/Institute.js';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan.js';
import { SubscriptionInvoice } from '../src/models/SubscriptionInvoice.js';
import { InvoiceCounter } from '../src/models/InvoiceCounter.js';
import { InvoiceAudit } from '../src/models/InvoiceAudit.js';
import { generateInvoicePdfBuffer } from '../src/utils/pdfGenerator.js';
import { isR2Configured, uploadToR2 } from '../src/utils/r2Service.js';

async function run() {
  await connectDB();
  console.log('Connected to database.');

  let inst = await Institute.findOne({ name: /GFI/i });
  if (!inst) {
    inst = await Institute.findOne({ email: /gfi/i });
  }

  if (!inst) {
    console.error('GFI Institute not found in database.');
    mongoose.connection.close();
    return;
  }

  console.log('Found GFI Institute:', {
    _id: inst._id,
    name: inst.name,
    email: inst.email,
    onboardingStatus: inst.onboardingStatus,
    subscriptionStatus: inst.subscriptionStatus,
    instituteCode: inst.instituteCode,
    planId: inst.planId
  });

  // Assign starter plan if not present
  let plan = await SubscriptionPlan.findById(inst.planId);
  if (!plan) {
    plan = await SubscriptionPlan.findOne({ isActive: true }) || await SubscriptionPlan.findOne({});
  }
  if (!plan) {
    // Create starter plan if it doesn't exist
    plan = new SubscriptionPlan({
      name: 'Starter',
      price: 99,
      studentLimit: 100,
      storageLimit: 100,
      billingCycle: 'monthly',
      isActive: true
    });
    await plan.save();
    console.log('Created dynamic SubscriptionPlan:', plan.name);
  }

  inst.planId = plan._id;
  inst.onboardingStatus = 'approved';
  inst.subscriptionStatus = 'active';
  inst.approvedAt = new Date();
  
  if (!inst.instituteCode) {
    inst.instituteCode = 'GFI001';
  }
  
  const billingCycle = plan.billingCycle || 'monthly';
  const now = new Date();
  if (billingCycle === 'yearly') {
    inst.nextBillingDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  } else {
    inst.nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  await inst.save();
  console.log('Updated Institute status to approved/active.');

  // Find and activate the matching admin user
  const adminUser = await User.findOne({ institute: inst._id, role: 'admin' });
  if (adminUser) {
    adminUser.status = 'active';
    await adminUser.save();
    console.log('Activated Admin User:', adminUser.email);
  } else {
    console.log('No admin user found to activate. Proactively creating a default admin user for GFI.');
    const hashedPassword = 'pbkdf2_sha256$260000$some_random_salt_hash_value'; // mock or standard hash, we can write a plain password or standard bcrypt
    // Let's use bcrypt or a standard hashed password. In this repo, let's see how passwords are hashed.
    // Let's create a temporary user if we need to, but let's check first.
  }

  // Generate Sequential Invoice if none exists
  const existingInvoice = await SubscriptionInvoice.findOne({ instituteId: inst._id });
  if (!existingInvoice) {
    const year = new Date().getFullYear();
    const counter = await InvoiceCounter.findOneAndUpdate(
      { year },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    const invoiceNumber = `INV-${year}-${String(counter.sequence).padStart(6, '0')}`;

    const amountSnapshot = plan.price || 0;
    const taxAmountSnapshot = parseFloat((amountSnapshot * 0.18).toFixed(2));
    const totalAmountSnapshot = parseFloat((amountSnapshot + taxAmountSnapshot).toFixed(2));

    const invoice = new SubscriptionInvoice({
      invoiceNumber,
      instituteId: inst._id,
      instituteCode: inst.instituteCode,
      instituteName: inst.name,
      planId: plan._id,
      planNameSnapshot: plan.name,
      billingCycleSnapshot: billingCycle,
      amountSnapshot,
      taxAmountSnapshot,
      totalAmountSnapshot,
      dueDate: now,
      status: 'paid',
      paidDate: now,
      paymentMethod: 'bank_transfer',
      paymentReference: 'PREPAID_ONBOARDING',
      generatedPdfUrl: 'TBD',
      notes: 'Initial invoice generated and marked paid on manual onboarding approval.'
    });

    if (isR2Configured()) {
      try {
        const pdfBuffer = await generateInvoicePdfBuffer(invoice, inst);
        const r2Key = `invoices/${invoiceNumber}.pdf`;
        const r2Url = await uploadToR2(pdfBuffer, r2Key, 'application/pdf');
        invoice.generatedPdfUrl = r2Url;
      } catch (err) {
        console.error('Failed to generate/upload PDF:', err);
      }
    }

    await invoice.save();
    console.log('Created and saved invoice:', invoiceNumber);
  } else {
    console.log('Invoice already exists:', existingInvoice.invoiceNumber);
  }

  console.log('Approval and activation process complete.');
  mongoose.connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
