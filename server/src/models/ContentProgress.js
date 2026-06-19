import mongoose from 'mongoose';

const contentProgressSchema = new mongoose.Schema({
  instituteId: {
    type: String,
    index: true,
    default: ''
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  }
});

contentProgressSchema.index({ studentId: 1, contentId: 1 }, { unique: true });

export const ContentProgress = mongoose.model('ContentProgress', contentProgressSchema);
