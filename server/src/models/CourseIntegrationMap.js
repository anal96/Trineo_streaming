import mongoose from 'mongoose';

const courseIntegrationMapSchema = new mongoose.Schema({
  crmCourseId: {
    type: String,
    required: true,
    index: true
  },
  trineoCourseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instituteId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Unique map per institute
courseIntegrationMapSchema.index({ crmCourseId: 1, instituteId: 1 }, { unique: true });

export const CourseIntegrationMap = mongoose.model('CourseIntegrationMap', courseIntegrationMapSchema);
