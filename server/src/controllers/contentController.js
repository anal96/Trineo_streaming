import { Content } from '../models/Content.js';
import { Lesson } from '../models/Lesson.js';
import { isR2Configured, generateSignedUrl, parseR2Key } from '../utils/r2Service.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';

const instituteFilter = (req) => {
  return req.user.role === 'owner' ? { isDeleted: false } : { institute: req.user.institute, isDeleted: false };
};

export const getContent = async (req, res) => {
  const { lessonId } = req.query;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const filter = { ...instituteFilter(req) };
    if (lessonId) filter.lessonId = lessonId;

    const content = await Content.find(filter).sort({ order: 1, createdAt: 1 }).populate('videoAssetId');
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getContentById = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const content = req.user.role === 'owner'
      ? await Content.findOne({ _id: req.params.id, isDeleted: false }).populate('videoAssetId')
      : await Content.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false }).populate('videoAssetId');

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createContent = async (req, res) => {
  const { lessonId, type, title, description = '', order = 0, youtubeVideoId, youtubeThumbnail, youtubeDuration, videoProvider, uploadStatus, videoAssetId, attachmentUrl, attachmentName } = req.body;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const lesson = await Lesson.findOne({ _id: lessonId, ...instituteFilter(req) });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const content = new Content({
      lessonId,
      type,
      title,
      description,
      order: Number(order) || 0,
      institute: lesson.institute || req.user.institute || null,
      youtubeVideoId,
      youtubeThumbnail,
      youtubeDuration,
      videoProvider: videoProvider || 'youtube',
      uploadStatus: uploadStatus || 'pending',
      videoAssetId,
      attachmentUrl,
      attachmentName
    });

    const created = await content.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateContent = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const content = req.user.role === 'owner'
      ? await Content.findOne({ _id: req.params.id, isDeleted: false })
      : await Content.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const updates = req.body || {};
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && key in content) {
        content[key] = updates[key];
      }
    });

    const updated = await content.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteContent = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const content = req.user.role === 'owner'
      ? await Content.findOne({ _id: req.params.id, isDeleted: false })
      : await Content.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    content.isDeleted = true;
    content.deletedAt = new Date();
    await content.save();

    res.json({ message: 'Content soft deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reorderContent = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const { items = [] } = req.body;
    await Promise.all(items.map((item) => Content.updateOne(
      { _id: item.id, ...instituteFilter(req) },
      { $set: { order: Number(item.order) || 0 } }
    )));
    res.json({ message: 'Content reordered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/content/:id/download
 * Secure download endpoint for lesson content attachments.
 * Verifies user identity, tenant isolation, and enrollment before generating
 * a 5-minute signed R2 URL and redirecting the user.
 */
export const downloadContentAttachment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Find content with tenant guard
    const content = req.user.role === 'owner'
      ? await Content.findOne({ _id: req.params.id, isDeleted: false })
      : await Content.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    if (!content.attachmentUrl) {
      return res.status(404).json({ message: 'No attachment available for this content' });
    }

    // Students must have enrollment-based access
    if (req.user.role === 'student') {
      const lesson = await Lesson.findById(content.lessonId);
      if (!lesson) {
        return res.status(404).json({ message: 'Associated lesson not found' });
      }

      const access = await verifyStudentAccess({
        user: req.user,
        courseId: lesson.courseId,
        subjectTitle: lesson.subjectTitle || 'General',
        moduleTitle: lesson.moduleTitle || 'Module 1',
        lessonId: lesson._id
      });

      if (!access.granted) {
        return res.status(403).json({
          message: access.reason || 'Access denied: You must be enrolled to download this attachment.',
          status: access.status || 'locked'
        });
      }
    }

    // Generate signed R2 URL and redirect
    if (!isR2Configured()) {
      return res.status(500).json({ message: 'Storage service is not configured.' });
    }

    const r2Key = parseR2Key(content.attachmentUrl);
    if (!r2Key) {
      return res.status(404).json({ message: 'Attachment file reference is invalid.' });
    }

    const signedUrl = await generateSignedUrl(r2Key, 300); // 5 minutes
    return res.redirect(signedUrl);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
