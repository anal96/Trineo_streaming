import { WatchHistory } from '../models/WatchHistory.js';
import { Lesson } from '../models/Lesson.js';
import { Notification } from '../models/Notification.js';

export const updateProgress = async (req, res) => {
  const { lessonId, progress } = req.body;
  const studentId = req.user._id;

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

    // Find or create watch history
    let watchHistory = await WatchHistory.findOne({ studentId, lessonId });

    const isNewCompletion = !watchHistory?.completed && progress >= 90;

    if (!watchHistory) {
      watchHistory = new WatchHistory({
        institute: lesson.institute || req.user.institute || null,
        studentId,
        lessonId,
        courseId: lesson.courseId,
        progress,
        completed: progress >= 90
      });
    } else {
      watchHistory.institute = lesson.institute || req.user.institute || watchHistory.institute || null;
      watchHistory.progress = Math.max(watchHistory.progress, progress);
      if (progress >= 90) {
        watchHistory.completed = true;
      }
      watchHistory.watchedAt = Date.now();
    }

    await watchHistory.save();

    // If newly completed, log activity notification
    if (isNewCompletion) {
      await Notification.create({
        userId: studentId,
        institute: lesson.institute || req.user.institute || null,
        message: `Completed lesson: ${lesson.title}`,
        type: 'completion'
      });
    }

    res.json(watchHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWatchHistory = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const history = await WatchHistory.find(
      req.user.role === 'owner'
        ? { studentId: req.user._id }
        : { studentId: req.user._id, institute: req.user.institute }
    )
      .populate('lessonId', 'title duration slug moduleTitle moduleOrder')
      .populate('courseId', 'title thumbnail slug');
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
