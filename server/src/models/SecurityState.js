import mongoose from 'mongoose';

const securityStateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  violationCount: {
    type: Number,
    default: 0
  },
  penaltyUntil: {
    type: Date,
    default: null
  },
  lastViolationType: {
    type: String,
    default: ''
  },
  lastViolationAt: {
    type: Date,
    default: null
  },
  forceLogout: {
    type: Boolean,
    default: false
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: {
    type: Date,
    default: null
  },
  lockedBy: {
    type: String,
    default: ''
  },
  unlockReason: {
    type: String,
    default: ''
  },
  lastUnlockAt: {
    type: Date,
    default: null
  },
  lastUnlockedBy: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

export const SecurityState = mongoose.model('SecurityState', securityStateSchema);
