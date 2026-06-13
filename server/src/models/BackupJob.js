import mongoose from 'mongoose';

const backupJobSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['database', 'study_materials', 'course_metadata', 'video_metadata', 'audit_logs'],
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed'],
    default: 'queued'
  },
  sizeBytes: {
    type: Number,
    default: 0
  },
  health: {
    type: String,
    enum: ['healthy', 'warning', 'critical'],
    default: 'healthy'
  },
  integrityVerified: {
    type: Boolean,
    default: false
  },
  restorePointLabel: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

backupJobSchema.index({ type: 1, createdAt: -1 });

export const BackupJob = mongoose.model('BackupJob', backupJobSchema);
