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
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'video') {
    const allowedVideoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];
    const allowedVideoMimes = [
      'video/mp4',
      'video/x-matroska',
      'video/x-msvideo',
      'video/quicktime',
      'video/webm'
    ];
    if (allowedVideoExtensions.includes(ext) && allowedVideoMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only valid video files are allowed (mp4, mkv, avi, mov, webm)'), false);
    }
  } else if (file.fieldname === 'attachment' || file.fieldname === 'pdf') {
    const allowedAttachmentExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.png', '.jpg', '.jpeg'];
    const allowedAttachmentMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];
    if (allowedAttachmentExtensions.includes(ext) && allowedAttachmentMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only valid attachment files are allowed (pdf, doc, docx, ppt, pptx, xls, xlsx, txt, png, jpg, jpeg)'), false);
    }
  } else {
    cb(null, true);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 * 1024 // 3GB max (YouTube limit is 256GB)
  }
});
