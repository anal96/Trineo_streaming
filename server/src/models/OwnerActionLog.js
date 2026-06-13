import mongoose from 'mongoose';

const ownerActionLogSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  targetInstitute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ownerActionLogSchema.index({ createdAt: -1 });
ownerActionLogSchema.index({ ownerId: 1, createdAt: -1 });

export const OwnerActionLog = mongoose.model('OwnerActionLog', ownerActionLogSchema);
