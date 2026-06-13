/**
 * youtubeService.js — YouTube Data API v3 Integration
 *
 * Handles:
 *  - OAuth2 token management (refresh token flow)
 *  - Resumable video uploads to YouTube (Unlisted)
 *  - Metadata fetching (title, duration, thumbnail)
 *  - Video privacy management
 */

import { google } from 'googleapis';
import fs from 'fs';
import crypto from 'crypto';

const YOUTUBE_TOKEN_ENCRYPTION_KEY = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'trineo_youtube_token_secret';

const toHex = (buf) => Buffer.from(buf).toString('hex');
const fromHex = (value) => Buffer.from(value, 'hex');

export const encryptRefreshToken = (plain) => {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(YOUTUBE_TOKEN_ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${toHex(iv)}:${toHex(tag)}:${toHex(encrypted)}`;
};

export const decryptRefreshToken = (payload) => {
  if (!payload) return '';
  const [ivHex, tagHex, encryptedHex] = String(payload).split(':');
  if (!ivHex || !tagHex || !encryptedHex) return '';
  
  const attemptDecryption = (keyStr) => {
    const key = crypto.createHash('sha256').update(keyStr).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, fromHex(ivHex));
    decipher.setAuthTag(fromHex(tagHex));
    const decrypted = Buffer.concat([decipher.update(fromHex(encryptedHex)), decipher.final()]);
    return decrypted.toString('utf8');
  };

  try {
    return attemptDecryption(YOUTUBE_TOKEN_ENCRYPTION_KEY);
  } catch (err) {
    if (YOUTUBE_TOKEN_ENCRYPTION_KEY !== 'trineo_youtube_token_secret') {
      try {
        return attemptDecryption('trineo_youtube_token_secret');
      } catch (_fallbackErr) {
        // Both failed
      }
    }
    throw err;
  }
};

export const YOUTUBE_REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube'
];

const getOAuth2Client = (authSource = null) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5000/api/videos/youtube/callback'
  );

  let refreshToken = null;
  let accessToken = null;
  let tokenExpiry = null;
  let isInstituteModel = false;

  if (authSource) {
    if (typeof authSource === 'string') {
      refreshToken = authSource;
    } else if (typeof authSource === 'object') {
      isInstituteModel = true;
      
      const rawRefreshToken = authSource.refreshToken || authSource.youtubeRefreshToken || '';
      refreshToken = rawRefreshToken && rawRefreshToken.includes(':') ? decryptRefreshToken(rawRefreshToken) : rawRefreshToken;
      
      const rawAccessToken = authSource.accessToken || authSource.youtubeAccessToken || '';
      accessToken = rawAccessToken && rawAccessToken.includes(':') ? decryptRefreshToken(rawAccessToken) : rawAccessToken;
      
      const expiry = authSource.tokenExpiry || authSource.youtubeTokenExpiry;
      tokenExpiry = expiry ? new Date(expiry).getTime() : null;
    }
  }

  if (!refreshToken && process.env.YOUTUBE_REFRESH_TOKEN) {
    const legacyToken = process.env.YOUTUBE_REFRESH_TOKEN;
    refreshToken = legacyToken && legacyToken.includes(':') ? decryptRefreshToken(legacyToken) : legacyToken;
  }

  const credentials = {};
  if (refreshToken) credentials.refresh_token = refreshToken;
  if (accessToken) credentials.access_token = accessToken;
  if (tokenExpiry) credentials.expiry_date = tokenExpiry;

  if (Object.keys(credentials).length > 0) {
    oauth2Client.setCredentials(credentials);
  }

  if (isInstituteModel && authSource) {
    oauth2Client.on('tokens', async (newTokens) => {
      let needsSave = false;
      if (newTokens.access_token) {
        const encryptedAccess = encryptRefreshToken(newTokens.access_token);
        authSource.accessToken = encryptedAccess;
        authSource.youtubeAccessToken = encryptedAccess;
        if (newTokens.expiry_date) {
          authSource.tokenExpiry = new Date(newTokens.expiry_date);
          authSource.youtubeTokenExpiry = new Date(newTokens.expiry_date);
        }
        needsSave = true;
      }
      if (newTokens.refresh_token) {
        const encryptedRefresh = encryptRefreshToken(newTokens.refresh_token);
        authSource.refreshToken = encryptedRefresh;
        authSource.youtubeRefreshToken = encryptedRefresh;
        needsSave = true;
      }
      if (needsSave) {
        try {
          await authSource.save();
          console.log(`[YouTube Service] Automatically refreshed and saved tokens for institute ${authSource._id}`);
        } catch (err) {
          console.error('[YouTube Service] Failed to save automatically refreshed tokens:', err.message);
        }
      }
    });
  }

  return oauth2Client;
};

/**
 * Generate the OAuth2 consent URL for first-time admin setup.
 * Admin visits this URL once, approves, and we store the refresh token.
 */
export const getAuthUrl = (state = '') => {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: YOUTUBE_REQUIRED_SCOPES,
    include_granted_scopes: true,
    prompt: 'consent' // Force consent screen to always get a refresh_token
    ,
    state
  });
};

/**
 * Exchange an authorization code for access + refresh tokens.
 * Call once during admin OAuth setup.
 */
export const exchangeCodeForTokens = async (code) => {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date }
};

export const getChannelIdentity = async ({ refreshToken = null, accessToken = null, authSource = null }) => {
  const source = authSource || { refreshToken, accessToken };
  const oauth2Client = getOAuth2Client(source);
  try {
    if (source && typeof source === 'object') {
      await oauth2Client.getAccessToken();
    }
  } catch (err) {
    console.error('[YouTube Channel Identity Auth Check Failed]', err.message);
  }
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const channelRes = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true
  });
  const channel = channelRes.data.items?.[0];
  if (!channel?.id) throw new Error('Unable to fetch YouTube channel details');
  return {
    channelId: channel.id,
    channelName: channel.snippet?.title || 'Unknown Channel',
    videoCount: Number(channel.statistics?.videoCount || 0)
  };
};

export const revokeOAuthToken = async ({ refreshToken }) => {
  if (!refreshToken) return;
  const oauth2Client = getOAuth2Client(refreshToken);
  try {
    await oauth2Client.revokeToken(refreshToken);
  } catch (_e) {
    // Swallow revocation errors; disconnect should remain resilient.
  }
};

/**
 * Upload a video file to YouTube as Unlisted.
 * Uses resumable upload for large files.
 *
 * @param {string} filePath   - Absolute path to the temp video file
 * @param {string} title      - Video title
 * @param {string} description - Video description
 * @param {Function} onProgress - Called with (uploadedBytes, totalBytes)
 * @returns {Promise<string>} - YouTube Video ID
 */
export const uploadToYouTube = async (filePath, title, description = '', onProgress = null, authSource = null) => {
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    throw new Error('YouTube OAuth app is not configured on server.');
  }
  let isConnected = false;
  if (authSource) {
    if (typeof authSource === 'string') isConnected = true;
    else if (typeof authSource === 'object') {
      isConnected = Boolean(authSource.refreshToken || authSource.youtubeRefreshToken || authSource.accessToken || authSource.youtubeAccessToken);
    }
  }
  if (!isConnected && !process.env.YOUTUBE_REFRESH_TOKEN) {
    throw new Error('YouTube channel is not connected.');
  }

  const oauth2Client = getOAuth2Client(authSource);
  try {
    if (authSource && typeof authSource === 'object') {
      await oauth2Client.getAccessToken();
    }
  } catch (err) {
    console.error('[YouTube Upload Auth Check Failed]', err.message);
  }
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const fileSize = fs.statSync(filePath).size;
  const fileStream = fs.createReadStream(filePath);

  const response = await youtube.videos.insert(
    {
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description: description || `Trineo Stream class recording: ${title}`,
          categoryId: '27', // Education
          tags: ['trineo', 'lecture', 'class']
        },
        status: {
          privacyStatus: 'unlisted', // NEVER public — keeps student content gated
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fileStream
      }
    },
    {
      onUploadProgress: (evt) => {
        if (onProgress) {
          onProgress(evt.bytesRead, fileSize);
        }
      }
    }
  );

  const videoId = response.data.id;
  if (!videoId) throw new Error('YouTube upload succeeded but no video ID was returned.');
  return videoId;
};

/**
 * Fetch video metadata from YouTube by video ID.
 * Returns { title, duration (ISO 8601), thumbnail }
 */
export const getVideoMetadata = async (videoId, authSource = null) => {
  const oauth2Client = getOAuth2Client(authSource);
  try {
    if (authSource && typeof authSource === 'object') {
      await oauth2Client.getAccessToken();
    }
  } catch (err) {
    console.error('[YouTube Metadata Auth Check Failed]', err.message);
  }
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const res = await youtube.videos.list({
    part: ['snippet', 'contentDetails', 'status'],
    id: [videoId]
  });

  const video = res.data.items?.[0];
  if (!video) throw new Error(`YouTube video not found: ${videoId}`);

  const iso8601Duration = video.contentDetails?.duration || 'PT0S';
  const thumbnail =
    video.snippet?.thumbnails?.maxres?.url ||
    video.snippet?.thumbnails?.high?.url ||
    video.snippet?.thumbnails?.default?.url ||
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return {
    title: video.snippet?.title || '',
    rawDuration: iso8601Duration,
    duration: parseISO8601Duration(iso8601Duration),
    durationSeconds: parseISO8601DurationToSeconds(iso8601Duration),
    thumbnail,
    processingStatus: video.status?.uploadStatus || 'unknown',
    privacyStatus: video.status?.privacyStatus || 'unknown'
  };
};

/**
 * Check whether YouTube has finished processing a video.
 * Returns: 'processed' | 'processing' | 'failed' | 'rejected' | 'deleted'
 */
export const checkYouTubeProcessingStatus = async (videoId, authSource = null) => {
  const oauth2Client = getOAuth2Client(authSource);
  try {
    if (authSource && typeof authSource === 'object') {
      await oauth2Client.getAccessToken();
    }
  } catch (err) {
    console.error('[YouTube Status Auth Check Failed]', err.message);
  }
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const res = await youtube.videos.list({
    part: ['status'],
    id: [videoId]
  });

  const video = res.data.items?.[0];
  if (!video) return 'not_found';
  return video.status?.uploadStatus || 'unknown';
};

/**
 * Ensure a video remains Unlisted (in case it was accidentally changed).
 */
export const ensureUnlisted = async (videoId, authSource = null) => {
  const oauth2Client = getOAuth2Client(authSource);
  try {
    if (authSource && typeof authSource === 'object') {
      await oauth2Client.getAccessToken();
    }
  } catch (err) {
    console.error('[YouTube Unlist Auth Check Failed]', err.message);
  }
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  await youtube.videos.update({
    part: ['status'],
    requestBody: {
      id: videoId,
      status: { privacyStatus: 'unlisted' }
    }
  });
};

/**
 * Convert ISO 8601 duration (PT1H23M45S) to human-readable mm:ss or h:mm:ss
 */
export const parseISO8601Duration = (iso) => {
  if (!iso) return '0:00';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Convert ISO 8601 duration (PT1H23M45S) to total number of seconds
 */
export const parseISO8601DurationToSeconds = (iso) => {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
};
