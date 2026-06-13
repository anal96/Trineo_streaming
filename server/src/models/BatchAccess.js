import mongoose from 'mongoose';

const batchAccessSchema = new mongoose.Schema({
  batchName: {
    type: String,
    required: true,
    index: true
  },
  courseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  subjectIds: [{
    type: String
  }],
  moduleIds: [{
    type: String
  }],
  lessonIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  status: {
    type: String,
    enum: ['active', 'locked', 'expired', 'suspended'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce unique batch configuration per institute
batchAccessSchema.index({ batchName: 1, institute: 1 }, { unique: true });

export const BatchAccess = mongoose.model('BatchAccess', batchAccessSchema);
