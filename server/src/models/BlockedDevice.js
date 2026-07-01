import mongoose from 'mongoose';

const blockedDeviceSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
    index: true
  },
  deviceFingerprint: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deviceName: {
    type: String,
    default: ''
  },
  nickname: {
    type: String,
    default: ''
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  blockType: {
    type: String,
    enum: ['temporary', 'permanent'],
    default: 'permanent'
  },
  blockedUntil: {
    type: Date,
    default: null
  },
  blockedBy: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

blockedDeviceSchema.index({ institute: 1, deviceFingerprint: 1 }, { unique: true });

export const BlockedDevice = mongoose.model('BlockedDevice', blockedDeviceSchema);
