import mongoose from 'mongoose';

const studentAccessSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  subjectId: {
    type: String, // Represents subjectTitle
    default: ''
  },
  moduleId: {
    type: String, // Represents moduleTitle
    default: ''
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    default: null
  },
  accessType: {
    type: String,
    enum: ['course', 'subject', 'module', 'lesson'],
    required: true
  },
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
  },
  instituteId: {
    type: String,
    index: true,
    default: ''
  }
});

studentAccessSchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in student access pre-save:', err);
    }
  }
  next();
});

// Compound index to ensure uniqueness for individual Student access rules
studentAccessSchema.index({ studentId: 1, courseId: 1, subjectId: 1, moduleId: 1, lessonId: 1 }, { unique: true });

export const StudentAccess = mongoose.model('StudentAccess', studentAccessSchema);
