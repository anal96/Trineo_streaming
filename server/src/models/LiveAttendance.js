import mongoose from 'mongoose';

const liveAttendanceSchema = new mongoose.Schema({
  liveClassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveClass',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a student can only have one attendance log per live class
liveAttendanceSchema.index({ liveClassId: 1, studentId: 1 }, { unique: true });

export const LiveAttendance = mongoose.model('LiveAttendance', liveAttendanceSchema);
