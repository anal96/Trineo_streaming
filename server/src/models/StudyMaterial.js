import mongoose from 'mongoose';

const studyMaterialSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf'],
    default: 'pdf'
  },
  fileSize: {
    type: Number,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

studyMaterialSchema.index({ institute: 1, courseId: 1, fileType: 1, createdAt: -1 });
studyMaterialSchema.virtual('instituteId').get(function instituteIdGetter() {
  return this.institute;
});

export const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);
