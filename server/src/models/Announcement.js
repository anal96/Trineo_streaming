import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  author: {
    type: String,
    default: 'Institute Admin'
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Announcement = mongoose.model('Announcement', announcementSchema);
