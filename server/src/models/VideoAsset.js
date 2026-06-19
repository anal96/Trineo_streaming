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
    enum: ['pending', 'uploading', 'processing', 'youtube_processing', 'ready', 'failed'],
    default: 'pending'
  },
  uploadProgress: {
    type: Number,
    default: 0
  },
  youtubeProcessingStatus: {
    type: String,
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

videoAssetSchema.post('save', async function (doc) {
  try {
    const ContentModel = mongoose.model('Content');
    const contents = await ContentModel.find({ videoAssetId: doc._id });
    for (const c of contents) {
      const oldStatus = c.uploadStatus;
      let changed = false;

      if (c.uploadStatus !== doc.uploadStatus) {
        c.uploadStatus = doc.uploadStatus;
        changed = true;
      }
      if (doc.youtubeVideoId && c.youtubeVideoId !== doc.youtubeVideoId) {
        c.youtubeVideoId = doc.youtubeVideoId;
        changed = true;
      }
      const expectedThumbnail = doc.youtubeThumbnail || (doc.youtubeVideoId ? `https://i.ytimg.com/vi/${doc.youtubeVideoId}/hqdefault.jpg` : null);
      if (expectedThumbnail && c.youtubeThumbnail !== expectedThumbnail) {
        c.youtubeThumbnail = expectedThumbnail;
        changed = true;
      }
      const expectedDuration = doc.youtubeDuration;
      if (expectedDuration && c.youtubeDuration !== expectedDuration) {
        c.youtubeDuration = expectedDuration;
        changed = true;
      }

      if (changed) {
        await c.save();
        if (doc.uploadStatus === 'ready') {
          console.log(`[VIDEO-SYNC]\ncontentId: ${c._id}\nvideoAssetId: ${doc._id}\noldStatus: ${oldStatus}\nnewStatus: ready`);
        }
      }
    }
  } catch (err) {
    console.error('Error in VideoAsset post-save content sync:', err);
  }
});

export const VideoAsset = mongoose.model('VideoAsset', videoAssetSchema);
