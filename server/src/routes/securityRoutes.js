import express from 'express';
import { protect } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';

const router = express.Router();

// POST /api/security/audit - Log a security exception/anomaly
router.post('/audit', protect, async (req, res) => {
  try {
    const { eventType, details, deviceFingerprint } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ message: 'Missing eventType parameter' });
    }

    const logEntry = new AuditLog({
      userId: req.user._id,
      institute: req.user.institute || null,
      eventType,
      details: details || '',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      deviceFingerprint: deviceFingerprint || ''
    });

    await logEntry.save();
    
    console.warn(`[SECURITY AUDIT] Logged ${eventType} for student ${req.user.name} (${req.user.email})`);
    
    return res.status(201).json({ success: true, message: 'Security audit logged successfully' });
  } catch (error) {
    console.error('[SECURITY AUDIT ERROR]', error);
    return res.status(500).json({ message: 'Failed to process security log' });
  }
});

// GET /api/security/audit - Get logs (Admin only)
router.get('/audit', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }
    if (!req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    const logs = await AuditLog.find({ institute: req.user.institute })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

export default router;
