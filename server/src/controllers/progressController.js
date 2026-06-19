import { WatchHistory } from '../models/WatchHistory.js';
import { Content } from '../models/Content.js';
import { ContentProgress } from '../models/ContentProgress.js';
import { Notification } from '../models/Notification.js';

export const updateProgress = async (req, res) => {
  const { contentId, progress, watchTime, duration } = req.body;
  const studentId = req.user._id;

  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    const content = req.user.role === 'owner'
      ? await Content.findById(contentId)
      : await Content.findOne({ _id: contentId, institute: req.user.institute });

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Find or create watch history
    let watchHistory = await WatchHistory.findOne({ studentId, contentId });

    const isVideo = content.type === 'video';
    const isCompleted = !isVideo || progress >= 90;

    if (!watchHistory) {
      watchHistory = new WatchHistory({
        institute: content.institute || req.user.institute || null,
        instituteId: content.instituteId || '',
        studentId,
        contentId,
        watchTime: isVideo ? (Number(watchTime) || 0) : 0,
        duration: isVideo ? (Number(duration) || 0) : 0,
        progress: isVideo ? (Number(progress) || 0) : 100,
        completed: isCompleted,
        lastWatchedAt: Date.now()
      });
    } else {
      if (isVideo) {
        watchHistory.watchTime = Number(watchTime) !== undefined ? Math.max(watchHistory.watchTime, Number(watchTime)) : watchHistory.watchTime;
        watchHistory.duration = Number(duration) || watchHistory.duration;
        watchHistory.progress = Math.max(watchHistory.progress, Number(progress) || 0);
      } else {
        watchHistory.progress = 100;
      }
      if (isCompleted) {
        watchHistory.completed = true;
      }
      watchHistory.lastWatchedAt = Date.now();
    }

    await watchHistory.save();

    // Create ContentProgress record if completed
    let contentProgress = await ContentProgress.findOne({ studentId, contentId });
    const isNewCompletion = !contentProgress && isCompleted;

    if (isNewCompletion) {
      contentProgress = new ContentProgress({
        instituteId: content.instituteId || '',
        studentId,
        contentId,
        completed: true,
        completedAt: Date.now()
      });
      await contentProgress.save();

      // Log notification
      await Notification.create({
        userId: studentId,
        institute: content.institute || req.user.institute || null,
        message: `Completed item: ${content.title}`,
        type: 'completion'
      });
    }

    res.json({
      watchHistory,
      completed: isCompleted || Boolean(contentProgress)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWatchHistory = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    const query = req.user.role === 'owner'
      ? { studentId: req.user._id }
      : { studentId: req.user._id, institute: req.user.institute };

    const history = await WatchHistory.find({ ...query, contentId: { $ne: null } })
      .populate({
        path: 'contentId',
        select: 'title type youtubeVideoId attachmentUrl attachmentName lessonId description',
        populate: {
          path: 'lessonId',
          select: 'title unitId',
          populate: {
            path: 'unitId',
            select: 'name subjectId',
            populate: {
              path: 'subjectId',
              select: 'subjectName programId',
              populate: {
                path: 'programId',
                select: 'name slug'
              }
            }
          }
        }
      })
      .sort({ lastWatchedAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
