import { Institute } from '../models/Institute.js';
import { User } from '../models/User.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendOnboardingSubmittedEmail } from '../services/emailService.js';

/**
 * Public register endpoint for new institutes
 * POST /api/onboarding/register
 */
export const registerInstitute = async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    contactPerson,
    studentCount,
    planId,
    adminPassword
  } = req.body;

  try {
    // 1. Validations
    if (!name || !email || !contactPerson || !planId || !adminPassword) {
      return res.status(400).json({ message: 'Missing required onboarding registration fields.' });
    }

    // 2. Check if user email is taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email address is already registered.' });
    }

    // 3. Check if institute name or email is already registered
    const existingInst = await Institute.findOne({ $or: [{ name }, { email }] });
    if (existingInst) {
      return res.status(400).json({ message: 'An institute with this name or email is already registered.' });
    }

    // 4. Verify plan exists
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Selected subscription plan not found.' });
    }

    // 5. Create the pending Institute
    const newInstitute = new Institute({
      name,
      email,
      phone: phone || '',
      address: address || '',
      contactPerson,
      studentCount: studentCount || 0,
      planId: plan._id,
      onboardingStatus: 'pending',
      subscriptionStatus: 'inactive',
      // Quotas based on selected plan
      quotas: {
        maxStudents: plan.studentLimit || 2000,
        maxCourses: 200,
        maxVideos: 5000,
        maxStorageGB: plan.storageLimit || 2000,
        maxStudyMaterials: 5000
      }
    });

    await newInstitute.save();

    // 6. Create the disabled admin user
    const adminUser = new User({
      name: contactPerson,
      email,
      password: adminPassword,
      role: 'admin',
      phone: phone || '',
      institute: newInstitute._id,
      status: 'inactive' // dashboard access disabled
    });

    await adminUser.save();

    // 7. Audit log
    await AuditLog.create({
      userId: adminUser._id,
      institute: newInstitute._id,
      eventType: 'INSTITUTE_REGISTERED',
      details: `Institute "${name}" registered with plan "${plan.name}" (Code: ${newInstitute.instituteCode}). Status set to pending.`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Unknown'
    });

    // 8. Fire-and-forget onboarding confirmation email via Resend
    sendOnboardingSubmittedEmail(email, contactPerson, plan.name).catch(err => {
      console.error('[Onboarding Email Error]', err);
    });

    res.status(201).json({
      message: 'Onboarding application submitted successfully! Your account is pending owner approval.',
      instituteCode: newInstitute.instituteCode
    });
  } catch (error) {
    console.error('Onboarding registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Public plans listing for registration portal
 * GET /api/onboarding/plans
 */
export const getActivePlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
