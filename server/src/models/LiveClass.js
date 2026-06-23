import mongoose from 'mongoose';

const liveClassSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    enum: ['Google Meet', 'Zoom'],
    required: true
  },
  meetingUrl: {
    type: String,
    required: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  startedNotificationSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

liveClassSchema.index({ status: 1 });
liveClassSchema.index({ createdAt: -1 });

export const LiveClass = mongoose.model('LiveClass', liveClassSchema);

