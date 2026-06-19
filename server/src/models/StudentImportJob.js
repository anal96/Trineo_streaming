import mongoose from 'mongoose';

const importRowSchema = new mongoose.Schema({
  rowNumber: Number,
  name: String,
  email: String,
  phone: String,
  studentId: String,
  batch: String,
  course: String,
  branch: String,
  admissionDate: String,
  status: {
    type: String,
    enum: ['pending', 'imported', 'failed', 'skipped', 'duplicate'],
    default: 'pending'
  },
  error: {
    type: String,
    default: ''
  },
  duplicateDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { _id: false });

const studentImportJobSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['uploaded', 'validated', 'completed', 'failed'],
    default: 'uploaded'
  },
  importedCount: {
    type: Number,
    default: 0
  },
  skippedCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  rows: {
    type: [importRowSchema],
    default: []
  }
}, {
  timestamps: true
});

studentImportJobSchema.index({ institute: 1, createdAt: -1 });

export const StudentImportJob = mongoose.model('StudentImportJob', studentImportJobSchema);
