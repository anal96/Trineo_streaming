import mongoose from 'mongoose';

/**
 * VideoUploadJob — Replaces TranscodingJob
 *
 * Tracks the lifecycle of a video upload to YouTube:
 *   pending → uploading → youtube_processing → ready / failed
 *
 * No FFmpeg. No HLS. No local storage.
 */
const videoUploadJobSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: false
  },
  videoAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoAsset',
    default: null
  },
  youtubeVideoId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'uploading', 'youtube_processing', 'ready', 'failed'],
    default: 'pending'
  },
  uploadedBytes: {
    type: Number,
    default: 0
  },
  totalBytes: {
    type: Number,
    default: 0
  },
  uploadProgressPercent: {
    type: Number,
    default: 0
  },
  youtubeProcessingStatus: {
    type: String,
    default: null // 'processed' | 'processing' | 'failed' | 'rejected'
  },
  error: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

videoUploadJobSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

videoUploadJobSchema.index({ institute: 1, lessonId: 1 });

export const VideoUploadJob = mongoose.model('VideoUploadJob', videoUploadJobSchema);
