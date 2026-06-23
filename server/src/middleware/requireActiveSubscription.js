import { Institute } from '../models/Institute.js';

export const requireActiveSubscription = async (req, res, next) => {
  try {
    // Platform owner bypass
    if (req.user?.role === 'owner') {
      return next();
    }

    if (!req.user?.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required.' });
    }

    const inst = await Institute.findById(req.user.institute);
    if (!inst) {
      return res.status(404).json({ message: 'Institute not found.' });
    }

    // Active subscription status includes active, payment_due, and grace_period.
    // Inactive status includes inactive, payment_due_expired, and suspended.
    const allowedStatuses = ['active', 'payment_due', 'grace_period'];
    if (!allowedStatuses.includes(inst.subscriptionStatus)) {
      return res.status(403).json({ message: 'Institute subscription inactive.' });
    }

    // Attach institute object to request context
    req.institute = inst;
    next();
  } catch (error) {
    console.error('requireActiveSubscription error:', error);
    res.status(500).json({ message: error.message });
  }
};
