import mongoose from 'mongoose';

const studentContentAccessSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
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
    required: true,
    index: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null,
    index: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    default: null,
    index: true
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    default: null,
    index: true
  },
  status: {
    type: String,
    enum: ['allowed', 'blocked'],
    default: 'allowed',
    required: true
  },
  reason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

studentContentAccessSchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in student content access pre-save:', err);
    }
  }
  next();
});

// Compound unique index for strict uniqueness of rules per node per student
studentContentAccessSchema.index({ studentId: 1, batchId: 1, subjectId: 1, unitId: 1, topicId: 1 }, { unique: true });

export const StudentContentAccess = mongoose.model('StudentContentAccess', studentContentAccessSchema);
