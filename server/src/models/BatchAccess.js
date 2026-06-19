import mongoose from 'mongoose';

const batchAccessSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
    index: true
  },
  instituteId: {
    type: String,
    index: true,
    default: ''
  },
  batchName: {
    type: String,
    required: true,
    index: true
  },
  programIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program'
  }],
  subjectIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  }],
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  expiryDate: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce unique batch configuration per institute
batchAccessSchema.index({ batchName: 1, institute: 1 }, { unique: true });

export const BatchAccess = mongoose.model('BatchAccess', batchAccessSchema);
