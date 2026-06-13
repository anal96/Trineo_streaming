import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  progress: {
    type: Number,
    default: 0 // percentage 0-100
  },
  completed: {
    type: Boolean,
    default: false
  },
  watchedAt: {
    type: Date,
    default: Date.now
  }
});

watchHistorySchema.index({ institute: 1, studentId: 1, lessonId: 1 }, { unique: true });

export const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);
