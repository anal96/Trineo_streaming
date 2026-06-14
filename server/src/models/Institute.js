import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const instituteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  instituteId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  crmInstituteId: {
    type: String,
    sparse: true,
    index: true
  },
  apiKeyHash: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  apiKey: {
    type: String,
    select: false
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
  integration: {
    crmApiUrl: {
      type: String,
      default: ''
    },
    crmInstituteId: {
      type: String,
      default: ''
    },
    apiKeyHash: {
      type: String,
      default: ''
    },
    apiVersion: {
      type: String,
      default: 'v1'
    },
    syncEnabled: {
      type: Boolean,
      default: false
    },
    onboardingStatus: {
      type: String,
      enum: ['pending', 'configured', 'verified'],
      default: 'pending'
    },
    lastConnectionTestAt: {
      type: Date,
      default: null
    },
    lastConnectionTestResult: {
      type: String,
      default: ''
    },
    successfulSyncCount: {
      type: Number,
      default: 0
    },
    failedSyncCount: {
      type: Number,
      default: 0
    },
    lastSuccessfulSyncAt: {
      type: Date,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

instituteSchema.index({ 'integration.crmInstituteId': 1 }, { sparse: true });

instituteSchema.pre('save', async function (next) {
  if (!this.instituteId) {
    const prefix = (this.name || 'inst').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 3).padEnd(3, 'x');
    const randomHex = crypto.randomBytes(4).toString('hex');
    this.instituteId = `inst_${prefix}_${randomHex}`;
  }
  
  if (this.isModified('apiKey') && this.apiKey) {
    const salt = await bcrypt.genSalt(10);
    this.apiKeyHash = await bcrypt.hash(this.apiKey, salt);
    this.plainApiKey = this.apiKey;
    this.apiKey = undefined;
  } else if (!this.apiKeyHash) {
    const prefix = (this.name || 'inst').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 3).padEnd(3, 'x');
    const randomHex = crypto.randomBytes(12).toString('hex');
    const plainKey = `trn_${prefix}_${randomHex}`;
    
    const salt = await bcrypt.genSalt(10);
    this.apiKeyHash = await bcrypt.hash(plainKey, salt);
    this.plainApiKey = plainKey;
    this.apiKey = undefined;
  }
  next();
});

export const Institute = mongoose.model('Institute', instituteSchema);
