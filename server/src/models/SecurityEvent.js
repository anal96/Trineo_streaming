import mongoose from 'mongoose';

const securityEventSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  batchName: {
    type: String,
    default: ''
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null
  },
  subjectName: {
    type: String,
    default: ''
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    default: null
  },
  topicTitle: {
    type: String,
    default: ''
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'screenshot',
      'screen_recording',
      'multiple_device_login',
      'concurrent_session_violation',
      'account_sharing',
      'download_attempt',
      'excessive_device_switching',
      'session_hijack',
      'unauthorized_content_access',
      'SCREENSHOT_ATTEMPT',
      'SCREEN_RECORDING_DETECTED',
      'TAB_HIDDEN',
      'DEVTOOLS_OPENED',
      'COPY_ATTEMPT',
      'PRINT_ATTEMPT',
      'CONCURRENT_LOGIN',
      'MULTIPLE_DEVICE_LOGIN'
    ]
  },
  device: {
    type: String,
    default: 'Unknown Device'
  },
  browser: {
    type: String,
    default: 'Unknown Browser'
  },
  ipAddress: {
    type: String,
    default: ''
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  actionTaken: {
    type: String,
    enum: ['none', 'warning_shown', 'alert_logged', 'session_terminated', 'student_suspended', 'playback_paused'],
    default: 'alert_logged'
  },
  status: {
    type: String,
    enum: ['active_alert', 'ignored', 'resolved'],
    default: 'active_alert'
  },
  details: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  deviceInfo: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

securityEventSchema.pre('save', function (next) {
  if (this.studentId && !this.userId) {
    this.userId = this.studentId;
  } else if (this.userId && !this.studentId) {
    this.studentId = this.userId;
  }
  
  if (this.batchId && !this.courseId) {
    this.courseId = this.batchId;
  } else if (this.courseId && !this.batchId) {
    this.batchId = this.courseId;
  }

  if (this.topicId && !this.lessonId) {
    this.lessonId = this.topicId;
  } else if (this.lessonId && !this.topicId) {
    this.topicId = this.lessonId;
  }

  if (this.timestamp && !this.createdAt) {
    this.createdAt = this.timestamp;
  }

  if (!this.deviceInfo) {
    this.deviceInfo = `${this.device || ''} / ${this.browser || ''}`.trim();
  }

  next();
});

securityEventSchema.index({ institute: 1, studentId: 1, createdAt: -1 });

export const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
