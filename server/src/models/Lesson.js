import mongoose from 'mongoose';
import { slugify, uniqueSlug } from '../utils/slugify.js';

/**
 * Lesson Schema — YouTube Provider Edition
 *
 * Removed: videoUrl (HLS), transcodingProgress, processingStage
 * Added:   youtubeVideoId, youtubeThumbnail, youtubeDuration, videoProvider
 *
 * videoProvider abstraction layer allows future migration to
 * Cloudflare Stream, Bunny Stream, or self-hosted HLS without
 * changing any frontend pages.
 */
const lessonSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  thumbnail: {
    type: String,
    default: null
  },
  duration: {
    type: String,
    default: '0:00'
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  subjectTitle: {
    type: String,
    default: 'General'
  },
  subjectOrder: {
    type: Number,
    default: 1
  },
  moduleTitle: {
    type: String,
    default: 'Module 1'
  },
  moduleOrder: {
    type: Number,
    default: 1
  },
  publishStatus: {
    type: String,
    enum: ['draft', 'published', 'unpublished', 'scheduled'],
    default: 'draft'
  },
  releaseAt: {
    type: Date,
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

  // --- YouTube / Video Provider Fields ---
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
  videoProvider: {
    type: String,
    enum: ['youtube', 'cloudflare', 'bunny', 'hls'],
    default: 'youtube'
  },

  // --- Upload Lifecycle ---
  uploadStatus: {
    type: String,
    enum: ['pending', 'uploading', 'processing', 'youtube_processing', 'ready', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: ''
  },
  attachmentUrl: {
    type: String,
    default: null
  },
  attachmentName: {
    type: String,
    default: null
  },
  videoAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoAsset',
    default: null
  }
});

lessonSchema.set('toObject', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret.videoAssetId && typeof ret.videoAssetId === 'object') {
      ret.youtubeVideoId = ret.videoAssetId.youtubeVideoId || ret.youtubeVideoId;
      ret.youtubeThumbnail = ret.videoAssetId.youtubeThumbnail || ret.youtubeThumbnail;
      ret.youtubeDuration = ret.videoAssetId.youtubeDuration || ret.youtubeDuration;
      ret.duration = ret.videoAssetId.youtubeDuration || ret.duration;
      ret.durationSeconds = ret.videoAssetId.durationSeconds || ret.durationSeconds;
      ret.uploadStatus = ret.videoAssetId.uploadStatus || ret.uploadStatus;
    }
    return ret;
  }
});

lessonSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    if (ret.videoAssetId && typeof ret.videoAssetId === 'object') {
      ret.youtubeVideoId = ret.videoAssetId.youtubeVideoId || ret.youtubeVideoId;
      ret.youtubeThumbnail = ret.videoAssetId.youtubeThumbnail || ret.youtubeThumbnail;
      ret.youtubeDuration = ret.videoAssetId.youtubeDuration || ret.youtubeDuration;
      ret.duration = ret.videoAssetId.youtubeDuration || ret.duration;
      ret.durationSeconds = ret.videoAssetId.durationSeconds || ret.durationSeconds;
      ret.uploadStatus = ret.videoAssetId.uploadStatus || ret.uploadStatus;
    }
    return ret;
  }
});

lessonSchema.index({ institute: 1, courseId: 1 });
lessonSchema.index({ institute: 1, courseId: 1, moduleOrder: 1, order: 1 });
lessonSchema.index({ courseId: 1, slug: 1 }, { unique: true });

lessonSchema.pre('validate', async function nextSlug() {
  if (!this.isModified('title') && this.slug) return;
  const baseSlug = slugify(this.title);
  this.slug = await uniqueSlug(mongoose.models.Lesson, baseSlug, { courseId: this.courseId }, this._id);
});

export const Lesson = mongoose.model('Lesson', lessonSchema);
