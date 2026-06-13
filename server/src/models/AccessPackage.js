import mongoose from 'mongoose';

const accessPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  courseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  subjectIds: [{
    type: String // Represents subjectTitles in packages
  }],
  moduleIds: [{
    type: String // Represents moduleTitles in packages
  }],
  lessonIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
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

export const AccessPackage = mongoose.model('AccessPackage', accessPackageSchema);
