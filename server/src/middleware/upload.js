/**
 * upload.js — Multer Middleware (YouTube Provider Edition)
 *
 * Files are stored in the OS temp directory and streamed directly
 * to YouTube. They are ALWAYS deleted after upload completes,
 * whether successful or failed. No permanent video storage on server.
 */

import multer from 'multer';
import path from 'path';
import os from 'os';

// Use system temp directory — files deleted after YouTube upload finishes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'yt-upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];
  const allowedMimes = [
    'video/mp4',
    'video/x-matroska',
    'video/x-msvideo',
    'video/quicktime',
    'video/webm'
  ];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext) && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only valid video files are allowed (mp4, mkv, avi, mov, webm)'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 * 1024 // 3GB max (YouTube limit is 256GB)
  }
});
