import fs from 'fs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Lesson } from '../models/Lesson.js';
import { Program } from '../models/Program.js';
import { Content } from '../models/Content.js';
import { VideoUploadJob } from '../models/VideoUploadJob.js';
import { Notification } from '../models/Notification.js';
import { Purchase } from '../models/Purchase.js';
import { Institute } from '../models/Institute.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';
import { VideoAsset } from '../models/VideoAsset.js';
import {
  uploadToYouTube,
  getVideoMetadata,
  checkYouTubeProcessingStatus,
  getAuthUrl,
  exchangeCodeForTokens,
  ensureUnlisted,
  getChannelIdentity,
  revokeOAuthToken,
  encryptRefreshToken,
  decryptRefreshToken,
  verifyYouTubeTokenHealth
} from '../utils/youtubeService.js';
import { getVideoProvider, getThumbnailUrl } from '../utils/videoProvider.js';
import { isR2Configured, uploadToR2 } from '../utils/r2Service.js';

const parseDurationToSeconds = (duration = '0:00') => {
  const parts = String(duration).split(':').map((v) => Number(v || 0));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0] || 0);
};

const markLessonAndJobReady = async (lesson, job, meta = {}) => {
  lesson.uploadStatus = 'ready';
  lesson.youtubeDuration = meta.duration || lesson.youtubeDuration || lesson.duration;
  lesson.duration = meta.duration || lesson.duration || lesson.youtubeDuration;
  lesson.durationSeconds = meta.durationSeconds || lesson.durationSeconds || 0;
  lesson.youtubeThumbnail =
    meta.thumbnail ||
    lesson.youtubeThumbnail ||
    (lesson.youtubeVideoId ? getThumbnailUrl(lesson.youtubeVideoId, 'youtube') : lesson.youtubeThumbnail);
  await lesson.save();

  if (job) {
    job.status = 'ready';
    job.uploadProgressPercent = 100;
    job.youtubeProcessingStatus = 'processed';
    job.error = null;
    await job.save();
  }
};

const markVideoAssetAndJobReady = async (videoAsset, job, meta = {}) => {
  videoAsset.uploadStatus = 'ready';
  videoAsset.uploadProgress = 100;
  videoAsset.youtubeProcessingStatus = 'succeeded';
  videoAsset.youtubeDuration = meta.duration || videoAsset.youtubeDuration;
  videoAsset.durationSeconds = meta.durationSeconds || videoAsset.durationSeconds || 0;
  videoAsset.youtubeThumbnail =
    meta.thumbnail ||
    videoAsset.youtubeThumbnail ||
    (videoAsset.youtubeVideoId ? getThumbnailUrl(videoAsset.youtubeVideoId, 'youtube') : videoAsset.youtubeThumbnail);
  await videoAsset.save();

  if (job) {
    job.status = 'ready';
    job.uploadProgressPercent = 100;
    job.youtubeProcessingStatus = 'succeeded';
    job.error = null;
    await job.save();
  }
};

const isYouTubeReady = (meta) =>
  meta.processingStatus === 'succeeded' ||
  meta.processingStatus === 'processed';

const YOUTUBE_OAUTH_STATE_SECRET = process.env.YOUTUBE_OAUTH_STATE_SECRET || process.env.JWT_SECRET || 'trineo_youtube_state_secret';

const buildOAuthState = ({ instituteId, adminId }) => {
  const payload = {
    instituteId: String(instituteId),
    adminId: String(adminId),
    ts: Date.now()
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', YOUTUBE_OAUTH_STATE_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
};

const verifyOAuthState = (state) => {
  if (!state || !state.includes('.')) throw new Error('Invalid OAuth state');
  const [encoded, sig] = state.split('.');
  const expected = crypto.createHmac('sha256', YOUTUBE_OAUTH_STATE_SECRET).update(encoded).digest('base64url');
  if (sig !== expected) throw new Error('Invalid OAuth state signature');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (Date.now() - Number(payload.ts || 0) > 10 * 60 * 1000) throw new Error('OAuth state expired');
  return payload;
};

const buildUserSafeGoogleError = (error) => {
  const msg = String(error?.message || '').toLowerCase();
  if (msg.includes('access_denied') || msg.includes('permission')) return 'Permission denied on Google consent screen.';
  if (msg.includes('invalid_grant') || msg.includes('revoked')) return 'Google authorization expired or revoked. Reconnect your channel.';
  if (msg.includes('quota')) return 'YouTube quota limit reached. Please retry later.';
  if (msg.includes('oauth')) return 'YouTube OAuth failed. Please try connecting again.';
  return 'YouTube request failed. Please try again.';
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderOAuthResultPage = ({
  success,
  title,
  message,
  channelName = '',
  connectedAt = '',
  dashboardUrl = '',
  actionLabel = 'Return to Dashboard',
  actionUrl = '',
  postMessagePayload = null,
  closeOnLoad = false
}) => {
  const statusText = success ? 'Connected' : 'Not Connected';
  const icon = success ? '✅' : '❌';
  const buttonLabel = escapeHtml(actionLabel);
  const buttonTarget = escapeHtml(actionUrl || dashboardUrl || '#');
  const payloadScript = postMessagePayload
    ? `if (window.opener) { window.opener.postMessage(${JSON.stringify(postMessagePayload)}, '*'); }`
    : '';
  const closeScript = closeOnLoad ? 'if (window.opener) { setTimeout(() => window.close(), 700); }' : '';
  const detailsHtml = success
    ? `
      <div class="row"><span>Channel Name</span><strong>${escapeHtml(channelName || 'N/A')}</strong></div>
      <div class="row"><span>Connection Status</span><strong>${escapeHtml(statusText)}</strong></div>
      <div class="row"><span>Connected Date</span><strong>${escapeHtml(connectedAt || 'N/A')}</strong></div>
    `
    : '';
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f7f8fc; color: #111827; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { width: 100%; max-width: 520px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; box-shadow: 0 8px 30px rgba(17,24,39,.08); }
      .icon { font-size: 30px; margin-bottom: 8px; }
      h1 { margin: 0 0 6px; font-size: 22px; }
      p { margin: 0 0 18px; color: #4b5563; line-height: 1.45; }
      .details { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 18px; background: #fafafa; }
      .row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; font-size: 14px; border-bottom: 1px dashed #e5e7eb; }
      .row:last-child { border-bottom: 0; }
      .row span { color: #6b7280; }
      .row strong { color: #111827; }
      .actions { display: flex; gap: 10px; }
      .btn { appearance: none; border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 600; font-size: 14px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
      .btn-primary { background: #4f46e5; color: #fff; }
      .btn-secondary { background: #eef2ff; color: #3730a3; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="icon">${icon}</div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
        ${detailsHtml ? `<div class="details">${detailsHtml}</div>` : ''}
        <div class="actions">
          <a class="btn btn-primary" href="${buttonTarget}">${buttonLabel}</a>
          ${success ? '' : `<a class="btn btn-secondary" href="${escapeHtml(dashboardUrl || actionUrl || '#')}">Try Again</a>`}
        </div>
      </div>
    </div>
    <script>
      ${payloadScript}
      ${closeScript}
    </script>
  </body>
</html>`;
};

const getInstituteYoutubeContext = async (instituteId) => {
  const institute = await Institute.findById(instituteId)
    .select('+youtubeRefreshToken')
    .select('+refreshToken')
    .select('+accessToken')
    .select('+youtubeAccessToken')
    .select('+youtubeTokenExpiry')
    .select('+tokenExpiry');
  if (!institute) throw new Error('Institute not found');
  if (!institute.youtubeConnected) throw new Error('YouTube channel not connected for institute');
  
  const rawRefreshToken = institute.refreshToken || institute.youtubeRefreshToken || '';
  const refreshToken = rawRefreshToken && rawRefreshToken.includes(':') ? decryptRefreshToken(rawRefreshToken) : rawRefreshToken;
  
  return {
    institute,
    refreshToken
  };
};

/**
 * GET /api/videos/youtube/auth
 * Returns the Google OAuth2 consent URL for one-time admin setup.
 */
export const getYouTubeAuthUrl = (req, res) => {
  try {
    if (!req.user?.institute) return res.status(403).json({ message: 'Institute access required' });
    const state = buildOAuthState({ instituteId: req.user.institute, adminId: req.user._id });
    const url = getAuthUrl(state);
    res.json({ authUrl: url });
  } catch (err) {
    res.status(500).json({ message: 'Unable to start YouTube connection flow.' });
  }
};

/**
 * GET /api/videos/youtube/callback?code=xxx
 * Completes institute-scoped YouTube OAuth connection.
 */
export const youtubeCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    console.log("OAuth Callback Hit");
    console.log("OAuth Callback Reached");
    console.log("Authorization Code:", code);
    const dashboardUrl = `${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/admin`;
    if (error) {
      const safeMsg = buildUserSafeGoogleError({ message: String(error) });
      return res.status(400).send(renderOAuthResultPage({
        success: false,
        title: 'Connection Failed',
        message: safeMsg,
        dashboardUrl,
        actionLabel: 'Return to Dashboard',
        actionUrl: dashboardUrl,
        postMessagePayload: { type: 'YOUTUBE_OAUTH_RESULT', status: 'error', message: safeMsg },
        closeOnLoad: false
      }));
    }
    if (!code) {
      return res.status(400).send(renderOAuthResultPage({
        success: false,
        title: 'Connection Failed',
        message: 'Unable to connect your YouTube channel.',
        dashboardUrl,
        actionLabel: 'Return to Dashboard',
        actionUrl: dashboardUrl,
        postMessagePayload: { type: 'YOUTUBE_OAUTH_RESULT', status: 'error', message: 'Missing authorization code.' },
        closeOnLoad: false
      }));
    }
    const parsedState = verifyOAuthState(String(state || ''));
    const institute = await Institute.findById(parsedState.instituteId)
      .select('+youtubeRefreshToken')
      .select('+refreshToken')
      .select('+accessToken')
      .select('+youtubeAccessToken')
      .select('+youtubeTokenExpiry')
      .select('+tokenExpiry');
    if (!institute) {
      return res.status(404).send(renderOAuthResultPage({
        success: false,
        title: 'Connection Failed',
        message: 'Unable to connect your YouTube channel.',
        dashboardUrl,
        actionLabel: 'Return to Dashboard',
        actionUrl: dashboardUrl,
        postMessagePayload: { type: 'YOUTUBE_OAUTH_RESULT', status: 'error', message: 'Institute not found.' },
        closeOnLoad: false
      }));
    }
    const tokens = await exchangeCodeForTokens(code);
    console.log("Token Exchange Success");
    console.log("Tokens Received:", tokens);
    const rawOldRefreshToken = institute.refreshToken || institute.youtubeRefreshToken || '';
    const oldRefreshToken = rawOldRefreshToken && rawOldRefreshToken.includes(':') ? decryptRefreshToken(rawOldRefreshToken) : rawOldRefreshToken;
    const refreshToken = tokens.refresh_token || oldRefreshToken;
    if (!refreshToken) {
      return res.status(400).send(renderOAuthResultPage({
        success: false,
        title: 'Connection Failed',
        message: 'Unable to connect your YouTube channel.',
        dashboardUrl,
        actionLabel: 'Return to Dashboard',
        actionUrl: dashboardUrl,
        postMessagePayload: { type: 'YOUTUBE_OAUTH_RESULT', status: 'error', message: 'Unable to obtain secure token.' },
        closeOnLoad: false
      }));
    }
    const identity = await getChannelIdentity({
      refreshToken,
      accessToken: tokens.access_token
    });
    console.log("Channel Fetch Success");
    console.log("Channel Data:", identity);

    institute.youtubeConnected = true;
    institute.youtubeChannelId = identity.channelId;
    institute.youtubeChannelName = identity.channelName;
    
    // Save verification database fields
    const encryptedRefreshToken = encryptRefreshToken(refreshToken);
    institute.youtubeRefreshToken = encryptedRefreshToken;
    institute.refreshToken = encryptedRefreshToken;
    
    if (tokens.access_token) {
      const encryptedAccessToken = encryptRefreshToken(tokens.access_token);
      institute.youtubeAccessToken = encryptedAccessToken;
      institute.accessToken = encryptedAccessToken;
    }
    
    if (tokens.expiry_date) {
      const tokenExpiryDate = new Date(tokens.expiry_date);
      institute.youtubeTokenExpiry = tokenExpiryDate;
      institute.tokenExpiry = tokenExpiryDate;
    }
    
    institute.channelId = identity.channelId;
    institute.channelTitle = identity.channelName;

    institute.youtubeConnectedAt = new Date();
    institute.youtubeLastSync = new Date();
    await institute.save();
    console.log("Database Save Success");
    console.log("Saving YouTube Integration...");
    console.log({
      accessToken: tokens.access_token,
      refreshToken,
      channelId: identity.channelId,
      channelTitle: identity.channelName,
      connected: true,
      connectedAt: institute.youtubeConnectedAt
    });

    return res.status(200).send(renderOAuthResultPage({
      success: true,
      title: 'YouTube Channel Connected',
      message: 'Your channel is now connected to Trineo Stream.',
      channelName: institute.youtubeChannelName,
      connectedAt: institute.youtubeConnectedAt ? new Date(institute.youtubeConnectedAt).toLocaleString() : '',
      dashboardUrl,
      actionLabel: 'Return to Dashboard',
      actionUrl: dashboardUrl,
      postMessagePayload: {
        type: 'YOUTUBE_CONNECT_RESULT',
        success: true,
        message: 'YouTube channel connected successfully.',
        channelName: institute.youtubeChannelName,
        connectionStatus: 'Connected',
        connectedAt: institute.youtubeConnectedAt
      },
      closeOnLoad: true
    }));
  } catch (err) {
    const safeMsg = buildUserSafeGoogleError(err);
    const dashboardUrl = `${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/admin`;
    res.status(500).send(renderOAuthResultPage({
      success: false,
      title: 'Connection Failed',
      message: 'Unable to connect your YouTube channel.',
      dashboardUrl,
      actionLabel: 'Return to Dashboard',
      actionUrl: dashboardUrl,
      postMessagePayload: { type: 'YOUTUBE_CONNECT_RESULT', success: false, message: safeMsg },
      closeOnLoad: false
    }));
  }
};

export const getInstituteYouTubeStatus = async (req, res) => {
  try {
    if (!req.user?.institute) return res.status(403).json({ message: 'Institute access required' });
    const institute = await Institute.findById(req.user.institute)
      .select('+youtubeRefreshToken')
      .select('+refreshToken')
      .select('+accessToken')
      .select('+youtubeAccessToken');
    if (!institute) return res.status(404).json({ message: 'Institute not found' });
    
    // Verify token health dynamically (will automatically disconnect if invalid_grant detected)
    const isHealthy = await verifyYouTubeTokenHealth(institute);
    const wasConnectedButExpired = !isHealthy || (!institute.youtubeConnected && !!institute.youtubeChannelName);

    const videosUploaded = await Lesson.countDocuments({ institute: institute._id, youtubeVideoId: { $exists: true, $ne: '' } });
    
    const responsePayload = {
      youtubeConnected: Boolean(institute.youtubeConnected),
      youtubeChannelName: institute.youtubeChannelName || '',
      youtubeChannelId: institute.youtubeChannelId || '',
      youtubeConnectedAt: institute.youtubeConnectedAt || null,
      youtubeLastSync: institute.youtubeLastSync || null,
      videosUploaded,
      youtubeAuthExpired: wasConnectedButExpired,
      // Spec compliance for the investigation checklist
      connected: Boolean(institute.youtubeConnected),
      channelId: institute.youtubeChannelId || '',
      channelTitle: institute.youtubeChannelName || ''
    };

    console.log("Status Endpoint Response");
    console.log(responsePayload);
    
    res.json(responsePayload);
  } catch (_err) {
    res.status(500).json({ message: 'Unable to load YouTube integration status.' });
  }
};

export const syncInstituteYouTubeChannel = async (req, res) => {
  try {
    if (!req.user?.institute) return res.status(403).json({ message: 'Institute access required' });
    const { institute, refreshToken } = await getInstituteYoutubeContext(req.user.institute);
    const identity = await getChannelIdentity({ refreshToken });
    institute.youtubeChannelId = identity.channelId;
    institute.youtubeChannelName = identity.channelName;
    institute.youtubeLastSync = new Date();
    await institute.save();

    // Auto-sync durations for any lessons missing duration
    await syncLessonsWithMissingDurations({ institute: institute._id });

    const videosUploaded = await Lesson.countDocuments({ institute: institute._id, youtubeVideoId: { $exists: true, $ne: '' } });
    res.json({
      message: 'YouTube channel synced successfully.',
      youtubeConnected: true,
      youtubeChannelName: institute.youtubeChannelName,
      youtubeChannelId: institute.youtubeChannelId,
      youtubeConnectedAt: institute.youtubeConnectedAt,
      youtubeLastSync: institute.youtubeLastSync,
      videosUploaded
    });
  } catch (err) {
    res.status(400).json({ message: buildUserSafeGoogleError(err) });
  }
};

export const disconnectInstituteYouTubeChannel = async (req, res) => {
  try {
    if (!req.user?.institute) return res.status(403).json({ message: 'Institute access required' });
    const institute = await Institute.findById(req.user.institute)
      .select('+youtubeRefreshToken')
      .select('+refreshToken');
    if (!institute) return res.status(404).json({ message: 'Institute not found' });
    const rawRefreshToken = institute.refreshToken || institute.youtubeRefreshToken || '';
    const refreshToken = rawRefreshToken && rawRefreshToken.includes(':') ? decryptRefreshToken(rawRefreshToken) : rawRefreshToken;
    await revokeOAuthToken({ refreshToken });
    institute.youtubeConnected = false;
    institute.youtubeChannelId = '';
    institute.youtubeChannelName = '';
    institute.youtubeRefreshToken = '';
    institute.youtubeLastSync = new Date();
    
    // Clear verification database fields
    institute.accessToken = '';
    institute.refreshToken = '';
    institute.channelId = '';
    institute.channelTitle = '';
    institute.tokenExpiry = null;
    institute.youtubeAccessToken = '';
    institute.youtubeTokenExpiry = null;

    await institute.save();
    res.json({ message: 'YouTube channel disconnected. Existing lesson metadata remains intact.' });
  } catch (err) {
    res.status(400).json({ message: buildUserSafeGoogleError(err) });
  }
};

/**
 * POST /api/videos/youtube/upload
 * Receives video file from admin, streams it to YouTube as Unlisted,
 * saves youtubeVideoId to the Lesson document.
 * No video file is ever stored permanently on the server.
 */
export const uploadVideoToYouTube = async (req, res) => {
  const { title, courseId, lessonId, duration, attachmentName } = req.body;

  const videoFile = req.files && req.files.video ? req.files.video[0] : null;
  const attachmentFile = req.files && req.files.attachment ? req.files.attachment[0] : null;

  const cleanupFiles = () => {
    if (videoFile && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
    if (attachmentFile && fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);
  };

  if (!courseId) {
    cleanupFiles();
    return res.status(400).json({ message: 'Please select a course.' });
  }
  if (!lessonId) {
    cleanupFiles();
    return res.status(400).json({ message: 'Please select a lesson.' });
  }
  if (!videoFile) {
    cleanupFiles();
    return res.status(400).json({ message: 'Please select a video file.' });
  }
  if (!title) {
    cleanupFiles();
    return res.status(400).json({ message: 'Please select a video title.' });
  }

  const tempFilePath = videoFile.path;

  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      cleanupFiles();
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    // Validate program exists
    const course = req.user.role === 'owner'
      ? await Program.findById(courseId).populate('institute')
      : await Program.findOne({ _id: courseId, institute: req.user.institute }).populate('institute');
    if (!course) {
      cleanupFiles();
      return res.status(404).json({ message: 'Program not found' });
    }

    // Validate lesson exists and belongs to institute
    const lesson = req.user.role === 'owner'
      ? await Lesson.findById(lessonId)
      : await Lesson.findOne({ _id: lessonId, institute: req.user.institute });
    if (!lesson) {
      cleanupFiles();
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const targetInstituteId = req.user.role === 'owner' ? (course.institute?._id || course.institute) : req.user.institute;
    const { institute } = await getInstituteYoutubeContext(targetInstituteId);

    // Handle attachment upload to R2
    let attachmentUrl = null;
    let attachmentNameVal = attachmentName || '';
    if (attachmentFile) {
      if (isR2Configured()) {
        try {
          const fileBuffer = fs.readFileSync(attachmentFile.path);
          const r2Key = `lesson-attachments/${institute?.instituteCode || 'default'}/${attachmentFile.filename}`;
          attachmentUrl = await uploadToR2(fileBuffer, r2Key, attachmentFile.mimetype || 'application/pdf');
          attachmentNameVal = attachmentNameVal || attachmentFile.originalname;
          if (fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);

          // Track storage usage
          const inst = await Institute.findById(targetInstituteId);
          if (inst) {
            inst.storageUsed = (inst.storageUsed || 0) + attachmentFile.size;
            await inst.save();
          }
        } catch (r2Err) {
          cleanupFiles();
          return res.status(500).json({ message: `R2 Attachment Upload Failed: ${r2Err.message}` });
        }
      } else {
        // R2 not configured — discard attachment silently
        if (fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);
      }
    }

    // Create the VideoAsset record immediately so admin gets instant feedback
    const videoAsset = new VideoAsset({
      institute: course.institute?._id || course.institute || req.user.institute || null,
      courseId,
      title,
      uploadStatus: 'uploading',
      videoProvider: getVideoProvider()
    });
    const savedAsset = await videoAsset.save();

    // Link VideoAsset to selected lesson content and save other content video metadata
    let videoContent = null;
    const contentIdVal = req.body.contentId || req.body.replaceContentId;
    if (contentIdVal) {
      videoContent = await Content.findOne({ _id: contentIdVal, isDeleted: false });
    }

    if (!videoContent) {
      const videoCount = await Content.countDocuments({ lessonId: lesson._id, type: 'video', isDeleted: false });
      videoContent = new Content({
        lessonId: lesson._id,
        type: 'video',
        title: title || (lesson.title + ' Video'),
        institute: lesson.institute,
        instituteId: lesson.instituteId,
        order: videoCount + 1
      });
    } else {
      if (title) videoContent.title = title;
    }

    videoContent.videoAssetId = savedAsset._id;
    videoContent.youtubeVideoId = null;
    videoContent.uploadStatus = 'uploading';
    if (duration) {
      videoContent.youtubeDuration = duration;
    }
    if (attachmentUrl) {
      videoContent.attachmentUrl = attachmentUrl;
      videoContent.attachmentName = attachmentNameVal;
    }
    
    // ROOT CAUSE AUDIT - STEP 1
    console.log('[DEBUG] STEP 1 - Before Saving Content:', {
      lessonId: lesson._id,
      topicId: lesson._id,
      contentId: videoContent._id,
      youtubeVideoId: videoContent.youtubeVideoId,
      uploadStatus: videoContent.uploadStatus
    });

    await videoContent.save();

    // Link VideoAsset to selected lesson for backward compatibility with frontend checks
    lesson.videoAssetId = savedAsset._id;
    lesson.uploadStatus = 'uploading';
    if (attachmentUrl) {
      lesson.attachmentUrl = attachmentUrl;
      lesson.attachmentName = attachmentNameVal;
    }
    await lesson.save();

    // Create upload job record for tracking
    const job = await VideoUploadJob.create({
      institute: savedAsset.institute || req.user.institute || null,
      videoAssetId: savedAsset._id,
      lessonId: lesson._id,
      status: 'uploading',
      totalBytes: fs.statSync(tempFilePath).size
    });

    // Respond immediately — YouTube upload happens async
    res.status(202).json({
      message: 'Video upload started. Streaming to YouTube in background.',
      videoAsset: {
        _id: savedAsset._id,
        title: savedAsset.title,
        courseId: savedAsset.courseId,
        status: 'uploading'
      }
    });

    // ─── Background YouTube Upload (fire-and-forget) ───
    (async () => {
      try {
        // Stream file to YouTube with progress tracking
        const youtubeVideoId = await uploadToYouTube(
          tempFilePath,
          title,
          `${course.institute?.name || 'Learning Portal'} — ${course.title}: ${title}`,
          async (uploaded, total) => {
            const pct = Math.round((uploaded / total) * 100);
            if (pct > (job.uploadProgressPercent || 0) + 9) {
              job.uploadedBytes = uploaded;
              job.totalBytes = total;
              job.uploadProgressPercent = pct;
              await job.save().catch(() => {});

              savedAsset.uploadProgress = pct;
              await savedAsset.save().catch(() => {});
            }
          },
          institute
        );

        // YouTube upload complete — update records
        job.youtubeVideoId = youtubeVideoId;
        job.status = 'processing';
        job.uploadProgressPercent = 100;
        job.youtubeProcessingStatus = 'processing';
        await job.save();

        savedAsset.youtubeVideoId = youtubeVideoId;
        savedAsset.uploadStatus = 'processing';
        savedAsset.uploadProgress = 100;
        savedAsset.youtubeProcessingStatus = 'processing';
        savedAsset.youtubeThumbnail = getThumbnailUrl(youtubeVideoId, 'youtube');
        await savedAsset.save();

        const cUpload = await Content.findOne({ videoAssetId: savedAsset._id, isDeleted: false });
        if (cUpload) {
          cUpload.youtubeVideoId = youtubeVideoId;
          cUpload.uploadStatus = 'processing';
          cUpload.youtubeThumbnail = getThumbnailUrl(youtubeVideoId, 'youtube');
          await cUpload.save().catch(() => {});
        }

        // Poll YouTube until processing is done (max 30 mins)
        let attempts = 0;
        const maxAttempts = 90; // 90 × 20s = 30 min max
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            // Fetch metadata which includes both processing status and privacy status
            const meta = await getVideoMetadata(youtubeVideoId, institute);
            if (isYouTubeReady(meta)) {
              clearInterval(pollInterval);
              await markVideoAssetAndJobReady(savedAsset, job, meta);

              await Notification.create({
                userId: null,
                targetType: 'role',
                targetRole: 'student',
                institute: savedAsset.institute || req.user.institute || null,
                programId: courseId,
                title: '🎥 New Video Added',
                message: `Topic: ${lesson.title}\nVideo: ${title || 'New Video'}`,
                url: `/student/video/${courseId}`,
                type: 'upload'
              });
              
              const cReady = await Content.findOne({ videoAssetId: savedAsset._id, isDeleted: false });
              if (cReady) {
                cReady.uploadStatus = 'ready';
                cReady.youtubeDuration = meta.duration || cReady.youtubeDuration;
                cReady.youtubeThumbnail = meta.thumbnail || cReady.youtubeThumbnail || getThumbnailUrl(youtubeVideoId, 'youtube');
                await cReady.save().catch(() => {});
              }

            } else if (meta.processingStatus === 'failed' || meta.processingStatus === 'rejected' || attempts >= maxAttempts) {
              clearInterval(pollInterval);
              savedAsset.uploadStatus = 'failed';
              savedAsset.youtubeProcessingStatus = meta.processingStatus || 'failed';
              savedAsset.errorMessage = `YouTube processing status: ${meta.processingStatus}`;
              await savedAsset.save();
              job.status = 'failed';
              job.youtubeProcessingStatus = meta.processingStatus || 'failed';
              await job.save();

              const cFailed = await Content.findOne({ videoAssetId: savedAsset._id, isDeleted: false });
              if (cFailed) {
                cFailed.uploadStatus = 'failed';
                await cFailed.save().catch(() => {});
              }
            } else {
              savedAsset.uploadStatus = 'processing';
              savedAsset.youtubeProcessingStatus = meta.processingStatus || 'processing';
              await savedAsset.save().catch(() => {});

              job.status = 'processing';
              job.youtubeProcessingStatus = meta.processingStatus || 'processing';
              await job.save().catch(() => {});

              const cProcessing = await Content.findOne({ videoAssetId: savedAsset._id, isDeleted: false });
              if (cProcessing) {
                cProcessing.uploadStatus = 'processing';
                await cProcessing.save().catch(() => {});
              }
            }
          } catch (pollErr) {
            console.error('[YouTube Poll Error]', pollErr.message);
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              savedAsset.uploadStatus = 'failed';
              savedAsset.errorMessage = pollErr.message;
              await savedAsset.save().catch(() => {});
              job.status = 'failed';
              job.error = pollErr.message;
              await job.save().catch(() => {});

              const cPollFail = await Content.findOne({ videoAssetId: savedAsset._id, isDeleted: false });
              if (cPollFail) {
                cPollFail.uploadStatus = 'failed';
                await cPollFail.save().catch(() => {});
              }
            }
          }
        }, 20000); // Poll every 20 seconds

      } catch (uploadErr) {
        console.error('[YouTube Upload Error]', uploadErr.message);
        savedAsset.uploadStatus = 'failed';
        savedAsset.errorMessage = uploadErr.message;
        await savedAsset.save().catch(() => {});
        job.status = 'failed';
        job.error = uploadErr.message;
        await job.save().catch(() => {});

        const cUploadFail = await Content.findOne({ videoAssetId: savedAsset._id, isDeleted: false });
        if (cUploadFail) {
          cUploadFail.uploadStatus = 'failed';
          await cUploadFail.save().catch(() => {});
        }
      } finally {
        // Always delete temp file from server
        if (fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
      }
    })();

  } catch (error) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    res.status(500).json({ message: error.message });
  }
};



/**
 * GET /api/videos/youtube/status/:lessonId
 * Returns current upload/processing status for admin polling.
 */
export const getYouTubeUploadStatus = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const lesson = req.user.role === 'owner'
      ? await Lesson.findById(req.params.lessonId)
      : await Lesson.findOne({ _id: req.params.lessonId, institute: req.user.institute });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const content = await Content.findOne({ lessonId: lesson._id, type: 'video' }).populate('videoAssetId');

    const jobFilter = { lessonId: lesson._id };
    if (req.user.role !== 'owner') jobFilter.institute = req.user.institute;
    const job = await VideoUploadJob.findOne(jobFilter).sort({ createdAt: -1 });

    const uploadStatus = (content?.videoAssetId && typeof content.videoAssetId === 'object' ? content.videoAssetId.uploadStatus : null) || content?.uploadStatus || 'pending';
    const youtubeVideoId = (content?.videoAssetId && typeof content.videoAssetId === 'object' ? content.videoAssetId.youtubeVideoId : null) || content?.youtubeVideoId || null;
    const youtubeThumbnail = (content?.videoAssetId && typeof content.videoAssetId === 'object' ? content.videoAssetId.youtubeThumbnail : null) || content?.youtubeThumbnail || null;
    const youtubeDuration = (content?.videoAssetId && typeof content.videoAssetId === 'object' ? content.videoAssetId.youtubeDuration : null) || content?.youtubeDuration || null;
    const errorMessage = (content?.videoAssetId && typeof content.videoAssetId === 'object' ? content.videoAssetId.errorMessage : null) || '';

    const assetProgress = (content?.videoAssetId && typeof content.videoAssetId === 'object') ? content.videoAssetId.uploadProgress : null;
    const assetProcessingStatus = (content?.videoAssetId && typeof content.videoAssetId === 'object') ? content.videoAssetId.youtubeProcessingStatus : null;

    res.json({
      lessonId: lesson._id,
      title: lesson.title,
      uploadStatus,
      youtubeVideoId,
      youtubeThumbnail,
      youtubeDuration,
      uploadProgressPercent: assetProgress ?? job?.uploadProgressPercent ?? 0,
      youtubeProcessingStatus: assetProcessingStatus || job?.youtubeProcessingStatus || null,
      error: errorMessage || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/videos/youtube/sync/:lessonId
 * Re-fetches metadata from YouTube (title, duration, thumbnail).
 * Useful if YouTube processing finished after our polling window.
 */
export const syncYouTubeMetadata = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const lesson = req.user.role === 'owner'
      ? await Lesson.findById(req.params.lessonId)
      : await Lesson.findOne({ _id: req.params.lessonId, institute: req.user.institute });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    
    const content = await Content.findOne({ lessonId: lesson._id, type: 'video' }).populate('videoAssetId');
    if (!content) return res.status(404).json({ message: 'Video content not found for this lesson' });

    const youtubeVideoId = content.videoAssetId?.youtubeVideoId || content.youtubeVideoId;
    if (!youtubeVideoId) return res.status(400).json({ message: 'No YouTube video ID on this content' });

    let authSource = null;
    if (lesson.institute) {
      try {
        const ctx = await getInstituteYoutubeContext(lesson.institute);
        authSource = ctx.institute;
      } catch (_e) {}
    }
    const meta = await getVideoMetadata(youtubeVideoId, authSource);

    const jobFilter = { lessonId: lesson._id };
    if (req.user.role !== 'owner') jobFilter.institute = req.user.institute;
    const job = await VideoUploadJob.findOne(jobFilter).sort({ createdAt: -1 });
    
    if (isYouTubeReady(meta)) {
      const oldStatus = content.uploadStatus;
      if (content.videoAssetId && typeof content.videoAssetId === 'object') {
        await markVideoAssetAndJobReady(content.videoAssetId, job, meta);
      }
      content.uploadStatus = 'ready';
      content.youtubeVideoId = youtubeVideoId;
      content.youtubeDuration = meta.duration || content.youtubeDuration;
      content.youtubeThumbnail = meta.thumbnail || content.youtubeThumbnail;
      await content.save();
      console.log(`[VIDEO-SYNC]\ncontentId: ${content._id}\nvideoAssetId: ${content.videoAssetId?._id || content.videoAssetId}\noldStatus: ${oldStatus}\nnewStatus: ready`);
    } else {
      if (content.videoAssetId && typeof content.videoAssetId === 'object') {
        content.videoAssetId.youtubeDuration = meta.duration;
        content.videoAssetId.durationSeconds = meta.durationSeconds || 0;
        content.videoAssetId.youtubeThumbnail = meta.thumbnail;
        await content.videoAssetId.save();
      }
      content.youtubeVideoId = youtubeVideoId;
      content.youtubeDuration = meta.duration;
      content.youtubeThumbnail = meta.thumbnail;
      await content.save();

      if (job) {
        job.youtubeProcessingStatus = meta.processingStatus;
        await job.save();
      }
    }

    // Re-confirm it's still Unlisted
    await ensureUnlisted(youtubeVideoId, authSource);
    res.json({ message: 'Metadata synced successfully', lesson });
  } catch (error) {
    res.status(500).json({ message: buildUserSafeGoogleError(error) });
  }
};

/**
 * GET /api/videos/jobs
 * Returns all lessons with their YouTube upload status (admin panel).
 */
export const getYouTubeJobs = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const filter = req.user.role === 'owner' ? {} : { institute: req.user.institute };
    const assets = await VideoAsset.find(filter).sort({ createdAt: -1 }).populate('courseId', 'title');
    const jobs = await VideoUploadJob.find(filter).sort({ createdAt: -1 });

    const jobMap = {};
    jobs.forEach(j => {
      if (j.videoAssetId) jobMap[j.videoAssetId.toString()] = j;
    });

    const now = Date.now();
    await Promise.all(
      assets.map(async (asset) => {
        const job = jobMap[asset._id.toString()];
        const shouldRefresh =
          (asset.uploadStatus === 'youtube_processing' || asset.uploadStatus === 'processing') &&
          asset.youtubeVideoId &&
          (asset.uploadProgress >= 100 || (job?.uploadProgressPercent || 0) >= 100) &&
          (!job?.updatedAt || now - new Date(job.updatedAt).getTime() > 60000);

        if (!shouldRefresh) return;

        try {
          let authSource = null;
          if (asset.institute) {
            try {
              const ctx = await getInstituteYoutubeContext(asset.institute);
              authSource = ctx.institute;
            } catch (_e) {}
          }
          const meta = await getVideoMetadata(asset.youtubeVideoId, authSource);
          if (isYouTubeReady(meta)) {
            await markVideoAssetAndJobReady(asset, job, meta);
          } else if (job) {
            job.youtubeProcessingStatus = meta.processingStatus;
            await job.save();
            asset.youtubeProcessingStatus = meta.processingStatus;
            await asset.save();
          }
        } catch (syncErr) {
          if (job) {
            job.error = syncErr.message;
            await job.save().catch(() => {});
          }
        }
      })
    );

    const result = assets.map(asset => {
      const obj = asset.toObject();
      const job = jobMap[asset._id.toString()];
      obj.uploadProgressPercent = asset.uploadProgress ?? job?.uploadProgressPercent ?? 0;
      obj.youtubeProcessingStatus = asset.youtubeProcessingStatus || job?.youtubeProcessingStatus || null;
      return obj;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const replaceVideoAsset = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Video file required' });
  const tempFilePath = req.file.path;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const videoAsset = req.user.role === 'owner'
      ? await VideoAsset.findById(req.params.id)
      : await VideoAsset.findOne({ _id: req.params.id, institute: req.user.institute });
    if (!videoAsset) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      return res.status(404).json({ message: 'Video asset not found' });
    }

    videoAsset.uploadStatus = 'uploading';
    videoAsset.errorMessage = '';
    await videoAsset.save();

    const job = await VideoUploadJob.create({
      institute: videoAsset.institute || req.user.institute || null,
      videoAssetId: videoAsset._id,
      status: 'uploading',
      totalBytes: fs.statSync(tempFilePath).size
    });

    const targetInstituteId = req.user.role === 'owner' ? videoAsset.institute : req.user.institute;
    const { institute } = await getInstituteYoutubeContext(targetInstituteId);

    res.status(202).json({
      message: 'Video replacement started. Streaming to YouTube in background.',
      videoAsset: {
        _id: videoAsset._id,
        title: videoAsset.title,
        status: 'uploading'
      }
    });

    (async () => {
      try {
        const youtubeVideoId = await uploadToYouTube(
          tempFilePath,
          videoAsset.title,
          `Video Asset: ${videoAsset.title}`,
          async (uploaded, total) => {
            const pct = Math.round((uploaded / total) * 100);
            if (pct > (job.uploadProgressPercent || 0) + 9) {
              job.uploadedBytes = uploaded;
              job.totalBytes = total;
              job.uploadProgressPercent = pct;
              await job.save().catch(() => {});

              videoAsset.uploadProgress = pct;
              await videoAsset.save().catch(() => {});
            }
          },
          institute
        );

        job.youtubeVideoId = youtubeVideoId;
        job.status = 'processing';
        job.uploadProgressPercent = 100;
        job.youtubeProcessingStatus = 'processing';
        await job.save();

        videoAsset.youtubeVideoId = youtubeVideoId;
        videoAsset.uploadStatus = 'processing';
        videoAsset.uploadProgress = 100;
        videoAsset.youtubeProcessingStatus = 'processing';
        videoAsset.youtubeThumbnail = getThumbnailUrl(youtubeVideoId, 'youtube');
        await videoAsset.save();

        let attempts = 0;
        const maxAttempts = 90;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const meta = await getVideoMetadata(youtubeVideoId, institute);
            if (isYouTubeReady(meta)) {
              clearInterval(pollInterval);
              await markVideoAssetAndJobReady(videoAsset, job, meta);

              await Notification.create({
                userId: null,
                targetType: 'role',
                targetRole: 'student',
                institute: videoAsset.institute || req.user.institute || null,
                programId: videoAsset.courseId,
                title: '📚 New Lesson Available',
                message: `"${videoAsset.title}" has been replaced and is now ready. Tap to continue learning.`,
                url: `/student/video/${videoAsset.courseId}`,
                type: 'upload'
              });
            } else if (meta.processingStatus === 'failed' || meta.processingStatus === 'rejected' || attempts >= maxAttempts) {
              clearInterval(pollInterval);
              videoAsset.uploadStatus = 'failed';
              videoAsset.youtubeProcessingStatus = meta.processingStatus || 'failed';
              videoAsset.errorMessage = `YouTube processing status: ${meta.processingStatus}`;
              await videoAsset.save();
              job.status = 'failed';
              job.youtubeProcessingStatus = meta.processingStatus || 'failed';
              await job.save();
            } else {
              videoAsset.uploadStatus = 'processing';
              videoAsset.youtubeProcessingStatus = meta.processingStatus || 'processing';
              await videoAsset.save().catch(() => {});

              job.status = 'processing';
              job.youtubeProcessingStatus = meta.processingStatus || 'processing';
              await job.save().catch(() => {});
            }
          } catch (pollErr) {
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              videoAsset.uploadStatus = 'failed';
              videoAsset.errorMessage = pollErr.message;
              await videoAsset.save().catch(() => {});
              job.status = 'failed';
              job.error = pollErr.message;
              await job.save().catch(() => {});
            }
          }
        }, 20000);

      } catch (uploadErr) {
        videoAsset.uploadStatus = 'failed';
        videoAsset.errorMessage = uploadErr.message;
        await videoAsset.save().catch(() => {});
        job.status = 'failed';
        job.error = uploadErr.message;
        await job.save().catch(() => {});
      } finally {
        if (fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
      }
    })();

  } catch (error) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    res.status(500).json({ message: error.message });
  }
};

export const retryVideoAssetUpload = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const videoAsset = req.user.role === 'owner'
      ? await VideoAsset.findById(req.params.id)
      : await VideoAsset.findOne({ _id: req.params.id, institute: req.user.institute });
    if (!videoAsset) return res.status(404).json({ message: 'Video asset not found' });

    if (videoAsset.youtubeVideoId) {
      videoAsset.uploadStatus = 'youtube_processing';
      await videoAsset.save();

      const targetInstituteId = req.user.role === 'owner' ? videoAsset.institute : req.user.institute;
      const { institute } = await getInstituteYoutubeContext(targetInstituteId);
      const meta = await getVideoMetadata(videoAsset.youtubeVideoId, institute);

      if (isYouTubeReady(meta)) {
        videoAsset.uploadStatus = 'ready';
        videoAsset.youtubeDuration = meta.duration || videoAsset.youtubeDuration;
        videoAsset.durationSeconds = meta.durationSeconds || 0;
        await videoAsset.save();
        return res.json({ message: 'Video asset synced and ready.', videoAsset });
      } else {
        return res.json({ message: 'Video asset is still processing on YouTube.', videoAsset });
      }
    }
    res.status(400).json({ message: 'No video ID associated to retry. Please delete and upload again.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const xorEncryptDecrypt = (str, key) => {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
};

const encryptVideoId = (videoId, userId, lessonId) => {
  if (!videoId) return '';
  const key = `${userId}_${lessonId}`;
  const xored = xorEncryptDecrypt(videoId, key);
  return Buffer.from(xored, 'binary').toString('base64');
};

/**
 * GET /api/videos/watch/:lessonId
 * Access-gated YouTube video ID delivery.
 * Students must be authenticated AND enrolled.
 * Returns ONLY the youtubeVideoId — encrypted so raw IDs are never exposed.
 * The frontend decrypts this ID in memory.
 */
export const getWatchToken = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    let lesson = req.user.role === 'owner'
      ? await Lesson.findById(req.params.lessonId).populate('videoAssetId')
      : await Lesson.findOne({ _id: req.params.lessonId, institute: req.user.institute }).populate('videoAssetId');

    let resolvedLessonId = req.params.lessonId;

    if (!lesson) {
      const content = req.user.role === 'owner'
        ? await Content.findById(req.params.lessonId).populate('videoAssetId')
        : await Content.findOne({ _id: req.params.lessonId, institute: req.user.institute }).populate('videoAssetId');
      
      if (content) {
        resolvedLessonId = content.lessonId.toString();
        lesson = {
          _id: content._id,
          title: content.title,
          youtubeVideoId: content.youtubeVideoId,
          youtubeThumbnail: content.youtubeThumbnail,
          youtubeDuration: content.youtubeDuration,
          videoProvider: content.videoProvider,
          videoAssetId: content.videoAssetId,
          attachmentUrl: content.attachmentUrl,
          attachmentName: content.attachmentName,
          unitId: null,
          courseId: null
        };
      }
    }

    if (!lesson) return res.status(404).json({ message: 'Lesson or Content not found' });

    let targetProgramId = lesson.courseId;
    if (lesson.unitId) {
      const UnitModel = mongoose.model('Unit');
      const SubjectModel = mongoose.model('Subject');
      const unit = await UnitModel.findById(lesson.unitId);
      if (unit) {
        const subject = await SubjectModel.findById(unit.subjectId);
        if (subject) {
          targetProgramId = subject.programId;
        }
      }
    } else if (!lesson.courseId && resolvedLessonId) {
      // Find parent lesson and resolve its programId
      const LessonModel = mongoose.model('Lesson');
      const parentLesson = await LessonModel.findById(resolvedLessonId);
      if (parentLesson && parentLesson.unitId) {
        const UnitModel = mongoose.model('Unit');
        const SubjectModel = mongoose.model('Subject');
        const unit = await UnitModel.findById(parentLesson.unitId);
        if (unit) {
          const subject = await SubjectModel.findById(unit.subjectId);
          if (subject) {
            targetProgramId = subject.programId;
          }
        }
      }
    }

    // Enforce hierarchical content access management
    const access = await verifyStudentAccess({
      user: req.user,
      programId: targetProgramId,
      courseId: targetProgramId,
      lessonId: resolvedLessonId
    });

    if (!access.granted) {
      return res.status(403).json({
        message: access.reason || 'Access denied: Locked by your institute.',
        status: access.status || 'locked'
      });
    }

    const userId = req.user._id.toString();
    const lessonId = lesson._id.toString();
    const targetVideoId = (lesson.videoAssetId && typeof lesson.videoAssetId === 'object' ? lesson.videoAssetId.youtubeVideoId : null) || lesson.youtubeVideoId || '';
    const encryptedVideoId = encryptVideoId(targetVideoId, userId, lessonId);

    // Return only the ID — frontend builds the embed URL
    console.log('[WATCH-ENDPOINT-DIAGNOSTIC]', {
      contentId: req.params.lessonId,
      lessonId: resolvedLessonId,
      youtubeVideoId: targetVideoId,
      uploadStatus: (lesson.videoAssetId && typeof lesson.videoAssetId === 'object' ? lesson.videoAssetId.uploadStatus : null) || lesson.uploadStatus
    });

    res.json({
      youtubeVideoId: encryptedVideoId,
      isEncrypted: true,
      title: lesson.title,
      duration: (lesson.videoAssetId && typeof lesson.videoAssetId === 'object' ? lesson.videoAssetId.youtubeDuration : null) || lesson.youtubeDuration || lesson.duration,
      youtubeThumbnail: (lesson.videoAssetId && typeof lesson.videoAssetId === 'object' ? lesson.videoAssetId.youtubeThumbnail : null) || lesson.youtubeThumbnail,
      videoProvider: (lesson.videoAssetId && typeof lesson.videoAssetId === 'object' ? lesson.videoAssetId.videoProvider : null) || lesson.videoProvider || 'youtube',
      attachmentUrl: lesson.attachmentUrl,
      attachmentName: lesson.attachmentName
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Synchronize durations for all lessons under the institute with missing durations.
 */
const syncLessonsWithMissingDurations = async (queryFilter) => {
  const lessonsToSync = await Lesson.find({
    ...queryFilter,
    youtubeVideoId: { $exists: true, $ne: null, $ne: '' },
    $or: [
      { durationSeconds: 0 },
      { durationSeconds: { $exists: false } },
      { duration: '0:00' },
      { duration: { $exists: false } }
    ]
  });

  if (lessonsToSync.length === 0) return 0;

  const instituteContexts = {};
  const getCachedContext = async (instId) => {
    if (!instId) return null;
    const key = instId.toString();
    if (instituteContexts[key] !== undefined) return instituteContexts[key];
    try {
      const ctx = await getInstituteYoutubeContext(instId);
      instituteContexts[key] = ctx.institute;
    } catch (_err) {
      instituteContexts[key] = null;
    }
    return instituteContexts[key];
  };

  let successCount = 0;
  for (const lesson of lessonsToSync) {
    try {
      const authSource = await getCachedContext(lesson.institute);
      const meta = await getVideoMetadata(lesson.youtubeVideoId, authSource);
      
      lesson.youtubeDuration = meta.duration || lesson.youtubeDuration || lesson.duration;
      lesson.duration = meta.duration || lesson.duration || lesson.youtubeDuration;
      lesson.durationSeconds = meta.durationSeconds || lesson.durationSeconds || 0;
      if (meta.thumbnail && (!lesson.youtubeThumbnail || lesson.youtubeThumbnail.includes('placeholder'))) {
        lesson.youtubeThumbnail = meta.thumbnail;
      }
      await lesson.save();
      successCount++;
    } catch (err) {
      console.error(`[Auto-Sync] Failed for lesson ${lesson._id} (${lesson.title}):`, err.message);
    }
  }
  return successCount;
};

/**
 * POST /api/videos/youtube/lessons/sync
 * Bulk syncs all lessons missing duration for the current institute.
 */
export const syncAllInstituteLessonsMetadata = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const filter = req.user.role === 'owner' ? {} : { institute: req.user.institute };
    const syncedCount = await syncLessonsWithMissingDurations(filter);
    res.json({
      message: `Durations synchronized successfully. Synced ${syncedCount} lessons.`,
      syncedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const replaceLessonVideo = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Video file required' });
  const tempFilePath = req.file.path;
  try {
    const lessonFilter = req.user.role === 'owner' ? {} : { institute: req.user.institute };
    const lesson = await Lesson.findOne({ _id: req.params.id, ...lessonFilter }).populate('courseId', 'title');
    if (!lesson) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Get or create VideoAsset
    let videoAsset = null;
    if (lesson.videoAssetId) {
      videoAsset = await VideoAsset.findById(lesson.videoAssetId);
    }

    if (!videoAsset) {
      videoAsset = new VideoAsset({
        institute: lesson.institute || req.user.institute || null,
        courseId: lesson.courseId?._id || lesson.courseId || null,
        title: lesson.title,
        uploadStatus: 'uploading',
        videoProvider: 'youtube'
      });
      const savedAsset = await videoAsset.save();
      lesson.videoAssetId = savedAsset._id;
      await lesson.save();
    } else {
      videoAsset.uploadStatus = 'uploading';
      videoAsset.errorMessage = '';
      await videoAsset.save();
    }

    const job = await VideoUploadJob.create({
      institute: videoAsset.institute || req.user.institute || null,
      videoAssetId: videoAsset._id,
      lessonId: lesson._id,
      status: 'uploading',
      totalBytes: fs.statSync(tempFilePath).size
    });

    const targetInstituteId = req.user.role === 'owner' ? videoAsset.institute : req.user.institute;
    const { institute } = await getInstituteYoutubeContext(targetInstituteId);

    // Respond immediately — YouTube upload happens async
    res.status(202).json({
      message: 'Video replacement started. Streaming to YouTube in background.',
      lesson
    });

    // Background upload
    (async () => {
      try {
        const youtubeVideoId = await uploadToYouTube(
          tempFilePath,
          videoAsset.title,
          `Lesson Video: ${videoAsset.title}`,
          async (uploaded, total) => {
            const pct = Math.round((uploaded / total) * 100);
            if (pct > (job.uploadProgressPercent || 0) + 9) {
              job.uploadedBytes = uploaded;
              job.totalBytes = total;
              job.uploadProgressPercent = pct;
              await job.save().catch(() => {});

              videoAsset.uploadProgress = pct;
              await videoAsset.save().catch(() => {});
            }
          },
          institute
        );

        job.youtubeVideoId = youtubeVideoId;
        job.status = 'processing';
        job.uploadProgressPercent = 100;
        job.youtubeProcessingStatus = 'processing';
        await job.save();

        videoAsset.youtubeVideoId = youtubeVideoId;
        videoAsset.uploadStatus = 'processing';
        videoAsset.uploadProgress = 100;
        videoAsset.youtubeProcessingStatus = 'processing';
        videoAsset.youtubeThumbnail = getThumbnailUrl(youtubeVideoId, 'youtube');
        await videoAsset.save();

        let attempts = 0;
        const maxAttempts = 90;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const meta = await getVideoMetadata(youtubeVideoId, institute);
            if (isYouTubeReady(meta)) {
              clearInterval(pollInterval);
              await markVideoAssetAndJobReady(videoAsset, job, meta);

              await Notification.create({
                userId: null,
                targetType: 'role',
                targetRole: 'student',
                institute: videoAsset.institute || req.user.institute || null,
                programId: videoAsset.courseId || (lesson && lesson.courseId) || null,
                title: '📚 New Lesson Available',
                message: `"${lesson.title}" is now ready. Tap to continue learning.`,
                url: `/student/video/${videoAsset.courseId || (lesson && lesson.courseId) || ''}`,
                type: 'upload'
              });
            } else if (meta.processingStatus === 'failed' || meta.processingStatus === 'rejected' || attempts >= maxAttempts) {
              clearInterval(pollInterval);
              videoAsset.uploadStatus = 'failed';
              videoAsset.youtubeProcessingStatus = meta.processingStatus || 'failed';
              videoAsset.errorMessage = `YouTube processing status: ${meta.processingStatus}`;
              await videoAsset.save();
              job.status = 'failed';
              job.youtubeProcessingStatus = meta.processingStatus || 'failed';
              await job.save();
            } else {
              videoAsset.uploadStatus = 'processing';
              videoAsset.youtubeProcessingStatus = meta.processingStatus || 'processing';
              await videoAsset.save().catch(() => {});

              job.status = 'processing';
              job.youtubeProcessingStatus = meta.processingStatus || 'processing';
              await job.save().catch(() => {});
            }
          } catch (pollErr) {
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              videoAsset.uploadStatus = 'failed';
              videoAsset.errorMessage = pollErr.message;
              await videoAsset.save().catch(() => {});
              job.status = 'failed';
              job.error = pollErr.message;
              await job.save().catch(() => {});
            }
          }
        }, 20000);

      } catch (uploadErr) {
        videoAsset.uploadStatus = 'failed';
        videoAsset.errorMessage = uploadErr.message;
        await videoAsset.save().catch(() => {});
        job.status = 'failed';
        job.error = uploadErr.message;
        await job.save().catch(() => {});
      } finally {
        if (fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
      }
    })();

  } catch (error) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    res.status(500).json({ message: error.message });
  }
};

export const cancelVideoAssetUpload = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const filter = req.user.role === 'owner' ? {} : { institute: req.user.institute };
    const videoAsset = await VideoAsset.findOne({ _id: req.params.id, ...filter });
    if (!videoAsset) return res.status(404).json({ message: 'Video asset not found' });

    videoAsset.uploadStatus = 'failed';
    videoAsset.errorMessage = 'Upload cancelled by administrator.';
    await videoAsset.save();

    // Update active job to failed
    const job = await VideoUploadJob.findOne({ videoAssetId: videoAsset._id, status: { $in: ['pending', 'uploading', 'youtube_processing'] } });
    if (job) {
      job.status = 'failed';
      job.error = 'Cancelled by administrator.';
      await job.save();
    }

    res.json({ message: 'Upload cancelled successfully.', videoAsset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
