import fs from 'fs';
import { Lesson } from '../models/Lesson.js';
import { Course } from '../models/Course.js';
import { VideoUploadJob } from '../models/VideoUploadJob.js';
import { uploadToYouTube, getVideoMetadata } from '../utils/youtubeService.js';
import { getThumbnailUrl } from '../utils/videoProvider.js';
import { Notification } from '../models/Notification.js';
import { Purchase } from '../models/Purchase.js';

const requireInstitute = (req, res) => {
  if (req.user.role === 'owner') return true;
  if (!req.user.institute) {
    res.status(403).json({ message: 'Forbidden: institute access required' });
    return false;
  }
  return true;
};

const instituteFilter = (req) => (req.user.role === 'owner' ? {} : { institute: req.user.institute });

const parseDurationToSeconds = (duration = '0:00') => {
  const parts = String(duration).split(':').map((v) => Number(v || 0));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0] || 0);
};

export const getCourseLessons = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const course = await Course.findOne({ _id: req.params.courseId, ...instituteFilter(req) });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const { search = '', status = 'All', module = '' } = req.query;
    const filter = { courseId: course._id, ...instituteFilter(req) };
    if (status !== 'All') filter.publishStatus = status;
    if (module) filter.moduleTitle = module;
    if (search) filter.title = { $regex: search, $options: 'i' };
    const lessons = await Lesson.find(filter).sort({ moduleOrder: 1, order: 1, createdAt: 1 }).populate('videoAssetId');
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLesson = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const {
      courseId, title, description = '', moduleTitle = 'Module 1', moduleOrder = 1,
      order = 1, isLocked = false, publishStatus = 'draft', releaseAt = null, duration = '0:00', thumbnail = null,
      videoAssetId = null
    } = req.body;
    const course = await Course.findOne({ _id: courseId, ...instituteFilter(req) });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const lesson = await Lesson.create({
      institute: course.institute || req.user.institute || null,
      courseId,
      title,
      description,
      moduleTitle,
      moduleOrder: Number(moduleOrder) || 1,
      order: Number(order) || 1,
      isLocked: isLocked === true || isLocked === 'true',
      publishStatus,
      releaseAt: releaseAt ? new Date(releaseAt) : null,
      duration,
      durationSeconds: parseDurationToSeconds(duration),
      thumbnail,
      videoAssetId: (videoAssetId && videoAssetId !== 'none') ? videoAssetId : null
    });
    const enrolled = await Purchase.find({ institute: lesson.institute, courseId: lesson.courseId, status: 'completed' }).select('studentId');
    if (enrolled.length) {
      await Notification.insertMany(enrolled.map((p) => ({
        institute: lesson.institute,
        userId: p.studentId,
        message: `New lesson uploaded: ${lesson.title}`,
        type: 'upload',
        read: false
      })));
    }
    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLesson = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const lesson = await Lesson.findOne({ _id: req.params.id, ...instituteFilter(req) });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    const updates = req.body || {};
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && key in lesson) lesson[key] = updates[key];
    });
    if (updates.videoAssetId === '' || updates.videoAssetId === 'none' || updates.videoAssetId === null) {
      lesson.videoAssetId = null;
    } else if (updates.videoAssetId !== undefined) {
      lesson.videoAssetId = updates.videoAssetId;
    }
    if (updates.duration !== undefined) {
      lesson.durationSeconds = parseDurationToSeconds(updates.duration);
    }
    if (updates.releaseAt !== undefined) {
      lesson.releaseAt = updates.releaseAt ? new Date(updates.releaseAt) : null;
    }
    await lesson.save();
    const enrolled = await Purchase.find({ institute: lesson.institute, courseId: lesson.courseId, status: 'completed' }).select('studentId');
    if (enrolled.length) {
      await Notification.insertMany(enrolled.map((p) => ({
        institute: lesson.institute,
        userId: p.studentId,
        message: `Course update: ${lesson.title} has been updated`,
        type: 'system',
        read: false
      })));
    }
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const lesson = await Lesson.findOneAndDelete({ _id: req.params.id, ...instituteFilter(req) });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    await VideoUploadJob.deleteMany({ lessonId: lesson._id, ...instituteFilter(req) });
    res.json({ message: 'Lesson deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reorderLessons = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const { items = [] } = req.body;
    await Promise.all(items.map((item) => Lesson.updateOne(
      { _id: item.id, ...instituteFilter(req) },
      { $set: { order: Number(item.order) || 0, moduleOrder: Number(item.moduleOrder) || 1, moduleTitle: item.moduleTitle || 'Module 1' } }
    )));
    res.json({ message: 'Lessons reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkUpdateLessons = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const { lessonIds = [], action, value } = req.body;
    if (!lessonIds.length) return res.status(400).json({ message: 'No lessons selected' });
    const update = {};
    if (action === 'lock') update.isLocked = true;
    if (action === 'unlock') update.isLocked = false;
    if (action === 'publish') update.publishStatus = 'published';
    if (action === 'unpublish') update.publishStatus = 'unpublished';
    if (action === 'setModule') update.moduleTitle = value || 'Module 1';
    await Lesson.updateMany({ _id: { $in: lessonIds }, ...instituteFilter(req) }, { $set: update });
    res.json({ message: 'Bulk action completed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const retryFailedUpload = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const lesson = await Lesson.findOne({ _id: req.params.id, ...instituteFilter(req) });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    lesson.uploadStatus = 'pending';
    lesson.errorMessage = '';
    await lesson.save();
    await VideoUploadJob.create({
      institute: lesson.institute || req.user.institute || null,
      lessonId: lesson._id,
      status: 'pending'
    });
    res.json({ message: 'Retry queued. Upload a replacement video to continue.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLessonUploadHistory = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const jobs = await VideoUploadJob.find({ lessonId: req.params.id, ...instituteFilter(req) }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
