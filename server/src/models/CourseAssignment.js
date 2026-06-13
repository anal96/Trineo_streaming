import mongoose from 'mongoose';

const courseAssignmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  crmStudentId: {
    type: String,
    default: '',
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
    index: true
  },
  instituteId: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate course assignments per institute
courseAssignmentSchema.index({ student: 1, courseId: 1, instituteId: 1 }, { unique: true });

courseAssignmentSchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in CourseAssignment pre-save:', err);
    }
  }
  next();
});

export const CourseAssignment = mongoose.model('CourseAssignment', courseAssignmentSchema);
