import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  sessionId: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  device: {
    type: String,
    default: ''
  },
  browser: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  success: {
    type: Boolean,
    default: true
  },
  reason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

loginHistorySchema.index({ userId: 1, createdAt: -1 });

export const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);
