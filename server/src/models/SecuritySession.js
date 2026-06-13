import mongoose from 'mongoose';

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
  tokenSuffix: {
    type: String,
    default: ''
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
  location: {
    type: String,
    default: ''
  },
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

export const SecuritySession = mongoose.model('SecuritySession', securitySessionSchema);
