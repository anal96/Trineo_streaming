import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { Lesson } from '../models/Lesson.js';
import { Course } from '../models/Course.js';
import { Program } from '../models/Program.js';
import { Purchase } from '../models/Purchase.js';
import { Notification } from '../models/Notification.js';
import { TranscodingJob } from '../models/TranscodingJob.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';
import { checkStorageQuota } from '../utils/quotaEnforcer.js';
import { isR2Configured, uploadToR2 } from '../utils/r2Service.js';
import { Institute } from '../models/Institute.js';

const STREAMS_DIR = path.resolve('streams');
const UPLOADS_DIR = path.resolve('uploads');

if (!fs.existsSync(STREAMS_DIR)) fs.mkdirSync(STREAMS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const getFFmpegCmd = () => {
  const localAppData = process.env.LOCALAPPDATA || path.join('C:', 'Users', 'analj', 'AppData', 'Local');
  const wingetLinks = path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe');
  if (fs.existsSync(wingetLinks)) {
    return `"${wingetLinks}"`;
  }
  
  const packagesDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(packagesDir)) {
    const findFFmpeg = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            const found = findFFmpeg(fullPath);
            if (found) return found;
          } else if (file.toLowerCase() === 'ffmpeg.exe') {
            return fullPath;
          }
        } catch (e) {
          // ignore permission errors
        }
      }
      return null;
    };
    try {
      const foundPath = findFFmpeg(packagesDir);
      if (foundPath) return `"${foundPath}"`;
    } catch (e) {
      console.error('Error finding ffmpeg binary:', e);
    }
  }
  return 'ffmpeg';
};

export const uploadVideo = async (req, res) => {
  const { title, courseId, duration, isLocked, order, attachmentName } = req.body;
  
  const videoFile = req.files && req.files.video ? req.files.video[0] : null;
  const attachmentFile = req.files && req.files.attachment ? req.files.attachment[0] : null;

  if (!videoFile) {
    if (attachmentFile && fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);
    return res.status(400).json({ message: 'No video file uploaded' });
  }

  const tempFilePath = videoFile.path;

  // Enforce storage plan quota limit checks
  try {
    if (req.user.institute) {
      await checkStorageQuota(req.user.institute, videoFile.size);
    }
  } catch (quotaErr) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    if (attachmentFile && fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);
    return res.status(403).json({ message: quotaErr.message });
  }

  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (attachmentFile && fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    let course = req.user.role === 'owner'
      ? await Course.findById(courseId)
      : await Course.findOne({ _id: courseId, institute: req.user.institute });

    if (!course) {
      course = req.user.role === 'owner'
        ? await Program.findById(courseId)
        : await Program.findOne({ _id: courseId, institute: req.user.institute, isDeleted: false });
    }

    if (!course) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (attachmentFile && fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);
      return res.status(404).json({ message: 'Course not found' });
    }

    const inst = await Institute.findById(req.user.institute);

    let attachmentUrl = null;
    let attachmentNameVal = attachmentName || '';
    if (attachmentFile) {
      if (isR2Configured()) {
        try {
          const fileBuffer = fs.readFileSync(attachmentFile.path);
          const r2Key = `lesson-attachments/${inst?.instituteCode || 'default'}/${attachmentFile.filename}`;
          attachmentUrl = await uploadToR2(fileBuffer, r2Key, 'application/pdf');
          attachmentNameVal = attachmentNameVal || attachmentFile.originalname;
          if (fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);
          
          if (inst) {
            inst.storageUsed = (inst.storageUsed || 0) + attachmentFile.size;
            await inst.save();
          }
        } catch (r2Err) {
          if (fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);
          if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          return res.status(500).json({ message: `R2 Attachment Upload Failed: ${r2Err.message}` });
        }
      } else {
        if (fs.existsSync(attachmentFile.path)) fs.unlinkSync(attachmentFile.path);
      }
    }

    const lesson = new Lesson({
      institute: course.institute || req.user.institute || null,
      courseId,
      title,
      duration: duration || '10:00',
      isLocked: isLocked === 'true' || isLocked === true,
      videoUrl: 'queued', // Set state to queued
      order: Number(order) || 0,
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentUrl ? attachmentNameVal : undefined
    });

    const savedLesson = await lesson.save();

    // Create Transcoding Job inside Queue
    await TranscodingJob.create({
      institute: savedLesson.institute || req.user.institute || null,
      lessonId: savedLesson._id,
      tempFilePath: tempFilePath,
      status: 'pending'
    });

    res.status(202).json({
      message: 'Video upload completed. Transcoding is added to the background processing queue.',
      lesson: {
        _id: savedLesson._id,
        title: savedLesson.title,
        courseId: savedLesson.courseId,
        status: 'queued'
      }
    });
  } catch (error) {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    res.status(500).json({ message: error.message });
  }
};

export const getStreamFile = async (req, res) => {
  const { lessonId, fileName } = req.params;

  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const lesson = req.user.role === 'owner'
      ? await Lesson.findById(lessonId)
      : await Lesson.findOne({ _id: lessonId, institute: req.user.institute });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Verify student purchase access
    if (req.user.role === 'student') {
      const access = await verifyStudentAccess({
        user: req.user,
        courseId: lesson.courseId,
        subjectTitle: lesson.subjectTitle || 'General',
        moduleTitle: lesson.moduleTitle || 'Module 1',
        lessonId: lesson._id
      });
      
      if (!access.granted) {
        return res.status(403).json({
          message: access.reason || 'Access denied: Locked by your institute.',
          status: access.status || 'locked'
        });
      }
    }

    const sanitizedFileName = path.basename(fileName);
    const filePath = path.join(STREAMS_DIR, lessonId, sanitizedFileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Stream file not found' });
    }

    if (sanitizedFileName.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (sanitizedFileName.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/MP2T');
    }
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUploadJobs = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const lessons = req.user.role === 'owner'
      ? await Lesson.find().sort({ createdAt: -1 }).populate('courseId', 'title')
      : await Lesson.find({ institute: req.user.institute }).sort({ createdAt: -1 }).populate('courseId', 'title');
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
