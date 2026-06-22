import mongoose from 'mongoose';

const scheduledNotificationSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'announcement'
  },
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },
  sent: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const ScheduledNotification = mongoose.model('ScheduledNotification', scheduledNotificationSchema);
