import express from 'express';
import {
  getYouTubeAuthUrl,
  youtubeCallback,
  getInstituteYouTubeStatus,
  syncInstituteYouTubeChannel,
  disconnectInstituteYouTubeChannel,
  uploadVideoToYouTube,
  getYouTubeUploadStatus,
  syncYouTubeMetadata,
  getYouTubeJobs,
  getWatchToken,
  syncAllInstituteLessonsMetadata,
  replaceVideoAsset,
  retryVideoAssetUpload,
  cancelVideoAssetUpload
} from '../controllers/youtubeController.js';
import { getStreamFile } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Program } from '../models/Program.js';
import { Lesson } from '../models/Lesson.js';
import { Content } from '../models/Content.js';

const router = express.Router();

// ── Streaming: HLS self-hosted stream files ──
router.get('/stream/:lessonId/:fileName', protect, tenantGuard({ model: Lesson, idParam: 'lessonId' }), getStreamFile);

// ── Admin: YouTube OAuth Setup (one-time, first-time configuration) ──
router.get('/youtube/auth', protect, adminOnly, getYouTubeAuthUrl);
router.get('/youtube/callback', youtubeCallback); // Google redirects here after OAuth consent
router.get('/youtube/integration/status', protect, adminOnly, getInstituteYouTubeStatus);
router.get('/youtube/status', protect, adminOnly, getInstituteYouTubeStatus);
router.post('/youtube/integration/sync', protect, adminOnly, syncInstituteYouTubeChannel);
router.post('/youtube/integration/disconnect', protect, adminOnly, disconnectInstituteYouTubeChannel);

// ── Admin: Upload & Manage ──
router.post('/youtube/upload', protect, adminOnly, tenantGuard({ model: Program, bodyParam: 'courseId' }), upload.single('video'), uploadVideoToYouTube);
router.get('/youtube/status/:lessonId', protect, adminOnly, tenantGuard({ model: Lesson, idParam: 'lessonId' }), getYouTubeUploadStatus);
router.post('/youtube/sync/:lessonId', protect, adminOnly, tenantGuard({ model: Lesson, idParam: 'lessonId' }), syncYouTubeMetadata);
router.post('/youtube/lessons/sync', protect, adminOnly, syncAllInstituteLessonsMetadata);
router.get('/jobs', protect, adminOnly, getYouTubeJobs);

// Video Library Endpoints
router.post('/assets/:id/replace-video', protect, adminOnly, upload.single('video'), replaceVideoAsset);
router.post('/assets/:id/retry-upload', protect, adminOnly, retryVideoAssetUpload);
router.post('/assets/:id/cancel-upload', protect, adminOnly, cancelVideoAssetUpload);

// ── Student: Enrollment-gated watch access ──
router.get('/watch/:lessonId', protect, tenantGuard({
  idParam: 'lessonId',
  resolveResource: async (req, resourceId) => {
    let res = await Lesson.findById(resourceId);
    if (!res) {
      res = await Content.findById(resourceId);
    }
    return res;
  }
}), getWatchToken);

export default router;
// reload nodemon
