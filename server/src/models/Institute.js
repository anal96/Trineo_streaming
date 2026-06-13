import mongoose from 'mongoose';

const instituteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  contactPerson: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: ''
  },
  favicon: {
    type: String,
    default: ''
  },
  theme: {
    brandColor: {
      type: String,
      default: '#7c3aed'
    },
    secondaryColor: {
      type: String,
      default: '#4f46e5'
    }
  },
  supportEmail: {
    type: String,
    default: ''
  },
  supportPhone: {
    type: String,
    default: ''
  },
  branchName: {
    type: String,
    default: 'Main Campus'
  },
  domain: {
    type: String,
    default: ''
  },
  subscription: {
    type: String,
    enum: ['free_trial', 'starter', 'growth', 'enterprise'],
    default: 'free_trial'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  studentCount: { type: Number, default: 0 },
  adminCount: { type: Number, default: 0 },
  courseCount: { type: Number, default: 0 },
  videoCount: { type: Number, default: 0 },
  storageUsedGB: { type: Number, default: 0 },
  monthlyRevenue: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  },
  quotas: {
    maxStudents: { type: Number, default: 500 },
    maxCourses: { type: Number, default: 50 },
    maxVideos: { type: Number, default: 2000 },
    maxStorageGB: { type: Number, default: 1000 },
    maxStudyMaterials: { type: Number, default: 5000 }
  },
  usageWarningResetAt: {
    type: Date,
    default: null
  },
  emergencyLock: {
    type: Boolean,
    default: false
  },
  lastActivityAt: {
    type: Date,
    default: null
  },
  youtubeConnected: {
    type: Boolean,
    default: false
  },
  youtubeChannelId: {
    type: String,
    default: ''
  },
  youtubeChannelName: {
    type: String,
    default: ''
  },
  youtubeRefreshToken: {
    type: String,
    default: '',
    select: false
  },
  youtubeAccessToken: {
    type: String,
    default: ''
  },
  youtubeTokenExpiry: {
    type: Date,
    default: null
  },
  youtubeConnectedAt: {
    type: Date,
    default: null
  },
  youtubeLastSync: {
    type: Date,
    default: null
  },
  accessToken: {
    type: String,
    default: ''
  },
  refreshToken: {
    type: String,
    default: ''
  },
  channelId: {
    type: String,
    default: ''
  },
  channelTitle: {
    type: String,
    default: ''
  },
  tokenExpiry: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Institute = mongoose.model('Institute', instituteSchema);
