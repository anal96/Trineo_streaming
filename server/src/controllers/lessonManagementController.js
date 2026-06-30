import mongoose from 'mongoose';
import { Lesson } from '../models/Lesson.js';
import { Unit } from '../models/Unit.js';
import { Content } from '../models/Content.js';

const requireInstitute = (req, res) => {
  if (req.user.role === 'owner') return true;
  if (!req.user.institute) {
    res.status(403).json({ message: 'Forbidden: institute access required' });
    return false;
  }
  return true;
};

const instituteFilter = (req) => (req.user.role === 'owner' ? { isDeleted: false } : { institute: req.user.institute, isDeleted: false });

export const getUnitLessons = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const { unitId } = req.query;
    if (!unitId) return res.status(400).json({ message: 'unitId parameter required' });

    const unit = await Unit.findOne({ _id: unitId, ...instituteFilter(req) });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    const filter = { unitId: unit._id, ...instituteFilter(req) };
    const { search = '' } = req.query;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const lessons = await Lesson.find(filter).populate('videoAssetId').sort({ order: 1, createdAt: 1 });

    // Fetch corresponding content records (both videos and PDFs) for these lessons
    const lessonIds = lessons.map((l) => l._id);
    const contents = await Content.find({
      lessonId: { $in: lessonIds },
      isDeleted: { $ne: true }
    }).populate('videoAssetId');

    const contentMap = {};
    for (const c of contents) {
      const lessonIdStr = c.lessonId.toString();
      if (!contentMap[lessonIdStr]) {
        contentMap[lessonIdStr] = [];
      }
      contentMap[lessonIdStr].push(c);
    }

    const lessonsWithVideoInfo = lessons.map((lesson) => {
      const lessonObj = lesson.toObject();
      const lessonContents = contentMap[lesson._id.toString()] || [];
      const videoContents = lessonContents
        .filter(c => c.type === 'video')
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(c => {
          const cObj = c.toObject ? c.toObject() : { ...c };
          const asset = c.videoAssetId;
          if (asset && typeof asset === 'object') {
            cObj.youtubeVideoId = asset.youtubeVideoId || cObj.youtubeVideoId;
            cObj.uploadStatus = asset.uploadStatus || cObj.uploadStatus;
            cObj.youtubeDuration = asset.youtubeDuration || cObj.youtubeDuration || cObj.duration;
            cObj.duration = asset.youtubeDuration || cObj.duration;
          }
          return cObj;
        });
      const pdfContents = lessonContents.filter(c => c.type === 'pdf');

      // Diagnostic and Debug information for Admin Panel
      lessonObj.contents = lessonContents;
      lessonObj.contentCount = lessonContents.length;
      lessonObj.videos = videoContents;
      lessonObj.videoCount = videoContents.length;
      lessonObj.pdfCount = pdfContents.length;
      lessonObj.contentIds = lessonContents.map(c => c._id.toString());

      if (videoContents.length > 0) {
        const firstVideo = videoContents[0];
        lessonObj.videoAssetId = firstVideo.videoAssetId || null;
        lessonObj.youtubeVideoId = firstVideo.youtubeVideoId || null;
        lessonObj.uploadStatus = firstVideo.uploadStatus || 'pending';
      } else {
        lessonObj.videoAssetId = lessonObj.videoAssetId ? (lessonObj.videoAssetId._id || lessonObj.videoAssetId) : null;
        lessonObj.youtubeVideoId = lessonObj.youtubeVideoId || null;
        lessonObj.uploadStatus = lessonObj.uploadStatus || 'pending';
      }
      return lessonObj;
    });

    res.json(lessonsWithVideoInfo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLesson = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const { unitId, title, description = '', order = 1, isLocked, publishStatus, status, thumbnail } = req.body;
    const unit = await Unit.findOne({ _id: unitId, ...instituteFilter(req) });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    const lesson = await Lesson.create({
      institute: unit.institute || req.user.institute || null,
      unitId,
      title,
      description,
      order: Number(order) || 1,
      isLocked: isLocked !== undefined ? isLocked : false,
      publishStatus: publishStatus || status || 'draft',
      thumbnail: thumbnail || null
    });

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
    lesson.title = updates.title || lesson.title;
    lesson.description = updates.description !== undefined ? updates.description : lesson.description;
    lesson.order = updates.order !== undefined ? Number(updates.order) : lesson.order;
    lesson.isLocked = updates.isLocked !== undefined ? updates.isLocked : lesson.isLocked;
    lesson.publishStatus = updates.publishStatus || updates.status || lesson.publishStatus;
    lesson.thumbnail = updates.thumbnail !== undefined ? updates.thumbnail : lesson.thumbnail;

    await lesson.save();
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const lesson = await Lesson.findOne({ _id: req.params.id, ...instituteFilter(req) });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    lesson.isDeleted = true;
    lesson.deletedAt = new Date();
    await lesson.save();

    res.json({ message: 'Lesson soft deleted' });
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
      { $set: { order: Number(item.order) || 0 } }
    )));
    res.json({ message: 'Lessons reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkUpdateLessons = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;
    const { lessonIds = [], action } = req.body;
    if (!lessonIds.length) return res.status(400).json({ message: 'No lessons selected' });
    const update = {};
    if (action === 'delete') {
      update.isDeleted = true;
      update.deletedAt = new Date();
    } else if (action === 'lock') {
      update.isLocked = true;
    } else if (action === 'unlock') {
      update.isLocked = false;
    } else if (action === 'publish') {
      update.publishStatus = 'published';
    } else if (action === 'unpublish') {
      update.publishStatus = 'draft';
    }
    await Lesson.updateMany({ _id: { $in: lessonIds }, ...instituteFilter(req) }, { $set: update });
    res.json({ message: 'Bulk action completed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
