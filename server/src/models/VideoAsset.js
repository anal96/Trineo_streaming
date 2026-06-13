import mongoose from 'mongoose';

const videoAssetSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  title: {
    type: String,
    required: true
  },
  youtubeVideoId: {
    type: String,
    default: null
  },
  youtubeThumbnail: {
    type: String,
    default: null
  },
  youtubeDuration: {
    type: String,
    default: null
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  videoProvider: {
    type: String,
    enum: ['youtube', 'cloudflare', 'bunny', 'hls'],
    default: 'youtube'
  },
  uploadStatus: {
    type: String,
    enum: ['pending', 'uploading', 'youtube_processing', 'ready', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

videoAssetSchema.index({ institute: 1 });

export const VideoAsset = mongoose.model('VideoAsset', videoAssetSchema);
