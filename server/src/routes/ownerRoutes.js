import express from 'express';
import { protect, ownerOnly } from '../middleware/auth.js';
import {
  getPlatformStats,
  getInstitutes,
  createInstitute,
  toggleSuspendInstitute,
  deleteInstitute,
  updateInstituteSubscription,
  updateInstituteQuotas,
  resetInstituteUsageWarnings,
  lockInstituteAccess,
  getAllUsers,
  disableUser,
  enableUser,
  forceLogoutUser,
  terminateSession,
  resetUserSessions,
  getUserSecurityLogs,
  getRevenue,
  getStreamingStatus,
  getSecurityLogs,
  getOwnerActionLogs,
  getBackupStatus,
  runBackupNow,
  verifyBackupIntegrity,
  downloadBackupReport,
  getPlatformHealth,
  getInstituteDetails,
  updateInstitute,
  generateApiKey,
  disableApiKey,
  updateCrmIntegration,
  testCrmConnection,
  getOnboardingRequests,
  approveOnboardingRequest,
  rejectOnboardingRequest,
  requestOnboardingInfo,
  getBillingDashboard,
  getBillingInvoices,
  createBillingInvoice,
  recordBillingInvoicePaid,
  extendGracePeriod,
  getBillingInvoiceMetrics,
  getInvoiceAudits
} from '../controllers/ownerController.js';

const router = express.Router();

// All owner routes require authentication and owner-only privileges
router.use(protect);
router.use(ownerOnly);

// ─── Platform Stats ───────────────────────────────────────────────────────────
router.get('/stats', getPlatformStats);

// ─── Institute Management ─────────────────────────────────────────────────────
router.get('/institutes', getInstitutes);
router.post('/institutes', createInstitute);
router.put('/institutes/:id', updateInstitute);
router.put('/institutes/:id/suspend', toggleSuspendInstitute);
router.delete('/institutes/:id', deleteInstitute);
router.put('/institutes/:id/subscription', updateInstituteSubscription);
router.put('/institutes/:id/quotas', updateInstituteQuotas);
router.post('/institutes/:id/reset-usage-warnings', resetInstituteUsageWarnings);
router.post('/institutes/:id/lock-access', lockInstituteAccess);
router.get('/institutes/:id/details', getInstituteDetails);

// ─── SaaS Onboarding & Subscriptions ─────────────────────────────────────────
router.get('/onboarding/requests', getOnboardingRequests);
router.post('/onboarding/:id/approve', approveOnboardingRequest);
router.post('/onboarding/:id/reject', rejectOnboardingRequest);
router.post('/onboarding/:id/info', requestOnboardingInfo);
router.get('/billing/dashboard', getBillingDashboard);
router.get('/billing/invoices', getBillingInvoices);
router.post('/billing/invoices', createBillingInvoice);
router.post('/billing/invoices/:id/pay', recordBillingInvoicePaid);
router.post('/billing/invoices/:id/extend-grace', extendGracePeriod);
router.get('/billing/metrics', getBillingInvoiceMetrics);
router.get('/billing/invoices/:id/audits', getInvoiceAudits);


// ─── CRM Key Management ───────────────────────────────────────────────────────
router.post('/institutes/:id/api-key', generateApiKey);
router.post('/institutes/:id/api-key/regenerate', generateApiKey);
router.delete('/institutes/:id/api-key', disableApiKey);
router.put('/institutes/:id/crm-integration', updateCrmIntegration);
router.post('/institutes/:id/test-crm', testCrmConnection);

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.post('/users/:userId/disable', disableUser);
router.post('/users/:userId/enable', enableUser);
router.post('/users/:userId/force-logout', forceLogoutUser);
router.post('/users/:userId/reset-sessions', resetUserSessions);
router.get('/users/:userId/security-logs', getUserSecurityLogs);
router.post('/sessions/:sessionId/terminate', terminateSession);

// ─── Revenue ──────────────────────────────────────────────────────────────────
router.get('/revenue', getRevenue);

// ─── Streaming Infrastructure ─────────────────────────────────────────────────
router.get('/streaming', getStreamingStatus);

// ─── Security Center ──────────────────────────────────────────────────────────
router.get('/security', getSecurityLogs);
router.get('/owner-actions', getOwnerActionLogs);

// ─── Backup & Recovery ────────────────────────────────────────────────────────
router.get('/backups', getBackupStatus);
router.post('/backups/run', runBackupNow);
router.post('/backups/:id/verify', verifyBackupIntegrity);
router.get('/backups/report', downloadBackupReport);

// ─── Platform Health ──────────────────────────────────────────────────────────
router.get('/health', getPlatformHealth);

export default router;
