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
    enum: ['screenshot', 'devtools_open', 'screen_recording', 'playback_anomaly', 'multiple_login', 'suspicious_ip', 'invalid_token', 'session_takeover', 'video_security_event', 'login', 'logout', 'user_report', 'API_ACCESS', 'STUDENT_SYNC', 'COURSE_ASSIGNED', 'COURSE_UNASSIGNED', 'SSO_LOGIN_SUCCESS', 'SSO_LOGIN_FAILED', 'SSO_TOKEN_REUSED', 'LOGIN_SUCCESS', 'LOGOUT', 'SESSION_REPLACED', 'PROFILE_SYNC_SUCCESS', 'PROFILE_SYNC_FAILED', 'COURSE_SYNC_SUCCESS', 'COURSE_SYNC_FAILED', 'PASSWORD_RESET', 'INSTITUTE_REGISTERED', 'INSTITUTE_APPROVED', 'TRIAL_STARTED', 'INSTITUTE_REJECTED', 'PAYMENT_DUE', 'PAYMENT_RECEIVED', 'SUBSCRIPTION_REACTIVATED', 'TRIAL_EXPIRED', 'SUBSCRIPTION_SUSPENDED']
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
  instituteId: {
    type: String,
    index: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

auditLogSchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in audit log pre-save:', err);
    }
  }
  next();
});

auditLogSchema.index({ institute: 1, userId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
