import mongoose from 'mongoose';

const migrationLogSchema = new mongoose.Schema({
  migrationName: {
    type: String,
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  recordsProcessed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  errors: {
    type: [String],
    default: []
  }
});

export const MigrationLog = mongoose.model('MigrationLog', migrationLogSchema);
