import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
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
  // New relationship
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    default: null
  },
  watchTime: {
    type: Number,
    default: 0 // seconds watched
  },
  duration: {
    type: Number,
    default: 0 // total duration in seconds
  },
  progress: {
    type: Number,
    default: 0 // percentage 0-100
  },
  completed: {
    type: Boolean,
    default: false
  },
  lastWatchedAt: {
    type: Date,
    default: Date.now
  },

  // --- Legacy Fields (optional during migration) ---
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    default: null
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  watchedAt: {
    type: Date,
    default: Date.now
  }
});

// Dual indexes to prevent duplicates in new schema and optimize old schema lookup
watchHistorySchema.index({ studentId: 1, contentId: 1 }, { unique: true, partialFilterExpression: { contentId: { $exists: true } } });
watchHistorySchema.index({ studentId: 1, lessonId: 1 }, { partialFilterExpression: { lessonId: { $exists: true } } });
watchHistorySchema.index({ studentId: 1 });
watchHistorySchema.index({ lastWatchedAt: -1 });
watchHistorySchema.index({ watchedAt: -1 });


watchHistorySchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in watch history pre-save:', err);
    }
  }
  next();
});

export const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);
