import mongoose from 'mongoose';
import { slugify, uniqueSlug } from '../utils/slugify.js';

const lessonSchema = new mongoose.Schema({
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null,
    index: true
  },
  instituteId: {
    type: String,
    index: true,
    default: ''
  },
  // New relationship
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    default: null
  },
  // Legacy relationship (optional during migration)
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
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
  order: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

  // --- Legacy Video/Attachment Fields (retained for migration lookup) ---
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
    enum: ['youtube', 'vimeo', 'upload', 'cloudflare', 'bunny', 'hls'],
    default: 'youtube'
  },
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

lessonSchema.index({ unitId: 1, slug: 1 }, { unique: true, partialFilterExpression: { isDeleted: false, unitId: { $exists: true } } });
lessonSchema.index({ courseId: 1, slug: 1 }, { partialFilterExpression: { isDeleted: false, courseId: { $exists: true } } });

lessonSchema.pre('validate', async function nextSlug() {
  if (!this.isModified('title') && this.slug) return;
  const baseSlug = slugify(this.title);
  if (this.unitId) {
    this.slug = await uniqueSlug(mongoose.models.Lesson, baseSlug, { unitId: this.unitId }, this._id);
  } else if (this.courseId) {
    this.slug = await uniqueSlug(mongoose.models.Lesson, baseSlug, { courseId: this.courseId }, this._id);
  }
});

lessonSchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in lesson pre-save:', err);
    }
  }
  next();
});

export const Lesson = mongoose.model('Lesson', lessonSchema);
