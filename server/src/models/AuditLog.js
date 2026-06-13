import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  eventType: {
    type: String,
    required: true,
    enum: ['screenshot', 'devtools_open', 'screen_recording', 'playback_anomaly', 'multiple_login', 'suspicious_ip', 'invalid_token', 'session_takeover', 'video_security_event', 'login', 'logout', 'user_report']
  },
  details: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  deviceFingerprint: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

auditLogSchema.index({ institute: 1, userId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
