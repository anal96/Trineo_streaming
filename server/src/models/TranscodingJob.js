import mongoose from 'mongoose';

const transcodingJobSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  tempFilePath: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  error: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

transcodingJobSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

transcodingJobSchema.index({ institute: 1, lessonId: 1 });

export const TranscodingJob = mongoose.model('TranscodingJob', transcodingJobSchema);
