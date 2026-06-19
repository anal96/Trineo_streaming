import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  type: {
    type: String,
    enum: ['video', 'pdf'],
    required: true
  },
  title: {
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
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    default: null
  },
  instituteId: {
    type: String,
    index: true,
    default: ''
  },
  // Video fields
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
    enum: ['youtube', 'vimeo', 'upload'],
    default: 'youtube'
  },
  uploadStatus: {
    type: String,
    enum: ['pending', 'uploading', 'ready', 'failed'],
    default: 'pending'
  },
  videoAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoAsset',
    default: null
  },
  // PDF fields
  attachmentUrl: {
    type: String,
    default: null
  },
  attachmentName: {
    type: String,
    default: null
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
  }
});

contentSchema.pre('save', async function (next) {
  if (this.institute && !this.instituteId) {
    try {
      const InstituteModel = mongoose.model('Institute');
      const inst = await InstituteModel.findById(this.institute);
      if (inst) {
        this.instituteId = inst.instituteId;
      }
    } catch (err) {
      console.error('Error populating instituteId in content pre-save:', err);
    }
  }
  next();
});

export const Content = mongoose.model('Content', contentSchema);
