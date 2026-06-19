import mongoose from 'mongoose';

const studentAccessSchema = new mongoose.Schema({
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
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null
  },
  accessLevel: {
    type: String,
    enum: ['program', 'subject'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'expired'],
    default: 'active'
  },
  expiryDate: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
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
studentAccessSchema.index({ studentId: 1, programId: 1, accessLevel: 1, subjectId: 1 }, { unique: true });

export const StudentAccess = mongoose.model('StudentAccess', studentAccessSchema);
