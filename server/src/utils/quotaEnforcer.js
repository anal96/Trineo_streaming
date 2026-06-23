import { Institute } from '../models/Institute.js';
import { User } from '../models/User.js';

/**
 * Checks if the institute has reached its student plan limit.
 * Throws an error if limit exceeded.
 */
export const checkStudentQuota = async (instituteId, additionalCount = 1) => {
  const inst = await Institute.findById(instituteId).populate('planId');
  if (!inst) return true;

  // Enterprise plan has no limit
  if (inst.planId?.name === 'Enterprise') {
    return true;
  }

  const currentCount = await User.countDocuments({ institute: instituteId, role: 'student' });
  const limit = inst.quotas?.maxStudents || inst.planId?.studentLimit || 100;

  if (currentCount + additionalCount > limit) {
    throw new Error('Your plan limit has been reached. Please contact Trineo Support.');
  }
  return true;
};

/**
 * Checks if the institute has reached its storage plan limit (GB).
 * Throws an error if limit exceeded.
 */
export const checkStorageQuota = async (instituteId, additionalBytes = 0) => {
  const inst = await Institute.findById(instituteId).populate('planId');
  if (!inst) return true;

  // Enterprise plan has no limit
  if (inst.planId?.name === 'Enterprise') {
    return true;
  }

  const limitGB = inst.quotas?.maxStorageGB || inst.planId?.storageLimit || 100;
  const currentStorageGB = inst.storageUsedGB || 0;
  const additionalGB = additionalBytes / (1024 ** 3);

  if (currentStorageGB + additionalGB > limitGB) {
    throw new Error('Your plan limit has been reached. Please contact Trineo Support.');
  }
  return true;
};
