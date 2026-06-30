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

    if (req.user && req.user.continueLearningRemindersSent && req.user.continueLearningRemindersSent.length > 0) {
      req.user.continueLearningRemindersSent = [];
      await req.user.save().catch(() => {});
    }

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
        targetType: 'user',
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

    if (req.user.role === 'owner' || req.user.role === 'admin') {
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
      return res.json(history);
    }

    // For students, filter history by the active program's contents
    const EnrollmentModel = mongoose.model('Enrollment');
    const SubjectModel = mongoose.model('Subject');
    const UnitModel = mongoose.model('Unit');
    const LessonModel = mongoose.model('Lesson');
    const ContentModel = mongoose.model('Content');

    const activeEnrollment = await EnrollmentModel.findOne({
      studentId: req.user._id,
      institute: req.user.institute,
      isActive: { $ne: false }
    });

    if (!activeEnrollment) {
      return res.json([]);
    }

    const activeProgramId = activeEnrollment.programId;

    const subjects = await SubjectModel.find({ programId: activeProgramId, isDeleted: false });
    const subjectIds = subjects.map(s => s._id);

    const units = await UnitModel.find({ subjectId: { $in: subjectIds }, isDeleted: false });
    const unitIds = units.map(u => u._id);

    const lessons = await LessonModel.find({ unitId: { $in: unitIds }, isDeleted: false });
    const lessonIds = lessons.map(l => l._id);

    const contents = await ContentModel.find({ lessonId: { $in: lessonIds }, isDeleted: false });
    const contentIds = contents.map(c => c._id);

    const history = await WatchHistory.find({
      studentId: req.user._id,
      institute: req.user.institute,
      contentId: { $in: contentIds }
    })
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
