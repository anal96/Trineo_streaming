import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // global notifications if null
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['enrollment', 'completion', 'upload', 'payment', 'system'],
    default: 'system'
  },
  deletedUsers: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ institute: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
