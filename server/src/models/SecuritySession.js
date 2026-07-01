import mongoose from 'mongoose';
import crypto from 'crypto';

const securitySessionSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => crypto.randomUUID()
  },
  tokenSuffix: {
    type: String,
    default: ''
  },
  device: {
    type: String,
    default: 'Unknown Device'
  },
  deviceName: {
    type: String,
    default: ''
  },
  deviceModel: {
    type: String,
    default: ''
  },
  manufacturer: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    default: ''
  },
  os: {
    type: String,
    default: ''
  },
  osVersion: {
    type: String,
    default: ''
  },
  browser: {
    type: String,
    default: 'Unknown Browser'
  },
  appType: {
    type: String,
    default: 'Web',
    enum: ['Web', 'Android App', 'iOS App']
  },
  appVersion: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  previousIpAddress: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  timezone: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: ''
  },
  networkType: {
    type: String,
    default: 'unknown',
    enum: ['wifi', 'mobile', 'ethernet', 'unknown']
  },
  userAgent: {
    type: String,
    default: ''
  },
  deviceFingerprint: {
    type: String,
    default: '',
    index: true
  },
  loginMethod: {
    type: String,
    default: 'Password',
    enum: ['Password', 'Google', 'SSO']
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  currentPage: {
    type: String,
    default: ''
  },
  currentAction: {
    type: String,
    default: ''
  },
  isOnline: {
    type: Boolean,
    default: false,
    index: true
  },
  terminated: {
    type: Boolean,
    default: false,
    index: true
  },
  terminatedAt: {
    type: Date,
    default: null
  },
  terminatedBy: {
    type: String,
    default: ''
  },
  logoutReason: {
    type: String,
    default: ''
  },
  sessionDuration: {
    type: Number,
    default: 0
  },
  heartbeatAt: {
    type: Date,
    default: null
  },
  nickname: {
    type: String,
    default: ''
  },
  isTrusted: {
    type: Boolean,
    default: false
  },
  trustedAt: {
    type: Date,
    default: null
  },
  trustedByUser: {
    type: String,
    default: ''
  },
  lastVerified: {
    type: Date,
    default: null
  },
  currentContentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    default: null
  },
  watchingSince: {
    type: Date,
    default: null
  },
  
  // Keep compatibility with legacy fields
  status: {
    type: String,
    enum: ['active', 'terminated'],
    default: 'active'
  },
  loginAt: {
    type: Date,
    default: Date.now
  },
  lastSeenAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

securitySessionSchema.index({ institute: 1, status: 1, lastSeenAt: -1 });
securitySessionSchema.index({ isOnline: 1, lastSeen: -1 });
securitySessionSchema.index({ terminated: 1 });

export const SecuritySession = mongoose.model('SecuritySession', securitySessionSchema);

