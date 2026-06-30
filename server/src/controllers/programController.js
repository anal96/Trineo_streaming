import jwt from 'jsonwebtoken';
import { Program } from '../models/Program.js';
import { Subject } from '../models/Subject.js';
import { Unit } from '../models/Unit.js';
import { Lesson } from '../models/Lesson.js';
import { Content } from '../models/Content.js';
import { ContentProgress } from '../models/ContentProgress.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';
import { StudentContentAccess } from '../models/StudentContentAccess.js';

// Helper to filter by active institute
const instituteFilter = (req) => {
  return req.user.role === 'owner' ? { isDeleted: false } : { institute: req.user.institute, isDeleted: false };
};

// Helper to transform lean Lesson documents
const transformLessonObj = (lesson) => {
  const ret = lesson.toObject ? lesson.toObject() : { ...lesson };
  if (ret.videoAssetId && typeof ret.videoAssetId === 'object') {
    ret.youtubeVideoId = ret.videoAssetId.youtubeVideoId || ret.youtubeVideoId;
    ret.youtubeThumbnail = ret.videoAssetId.youtubeThumbnail || ret.youtubeThumbnail;
    ret.youtubeDuration = ret.videoAssetId.youtubeDuration || ret.youtubeDuration;
    ret.duration = ret.videoAssetId.youtubeDuration || ret.duration;
    ret.durationSeconds = ret.videoAssetId.durationSeconds || ret.durationSeconds;
    ret.uploadStatus = ret.videoAssetId.uploadStatus || ret.uploadStatus;
  }
  return ret;
};

export const getPrograms = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const filter = instituteFilter(req);
    const programs = await Program.find(filter).sort({ displayOrder: 1, createdAt: 1 }).lean();

    const programIds = programs.map(p => p._id);

    // Get subjects under these programs
    const subjects = await Subject.find({ programId: { $in: programIds }, isDeleted: false }).lean();
    const subjectIds = subjects.map(s => s._id);

    // Get units under these subjects
    const units = await Unit.find({ subjectId: { $in: subjectIds }, isDeleted: false }).lean();
    const unitIds = units.map(u => u._id);

    // Get lessons under units
    const lessons = await Lesson.find({ unitId: { $in: unitIds }, isDeleted: false }).lean();
    const lessonIds = lessons.map(l => l._id);

    // Get content under lessons
    const contents = await Content.find({ lessonId: { $in: lessonIds }, isDeleted: false }).lean();

    // Map content counts to lessons, lessons counts to units, etc.
    const programStats = {};
    for (const pId of programIds) {
      const pStr = pId.toString();
      const pSubjects = subjects.filter(s => s.programId && s.programId.toString() === pStr);
      const pSubjectIds = pSubjects.map(s => s._id.toString());
      const pUnits = units.filter(u => u.subjectId && pSubjectIds.includes(u.subjectId.toString()));
      const pUnitIds = pUnits.map(u => u._id.toString());
      const pLessons = lessons.filter(l => l.unitId && pUnitIds.includes(l.unitId.toString()));
      const pLessonIds = pLessons.map(l => l._id.toString());
      const pContents = contents.filter(c => c.lessonId && pLessonIds.includes(c.lessonId.toString()));

      programStats[pStr] = {
        subjectsCount: pSubjects.length,
        lessonsCount: pLessons.length,
        contentsCount: pContents.length,
        contentIds: pContents.map(c => c._id.toString())
      };
    }

    if (req.user.role === 'student') {
      const completedProgress = await ContentProgress.find({
        studentId: req.user._id,
        completed: true
      }).lean();
      const completedContentIds = new Set(completedProgress.map(cp => cp.contentId.toString()));

      const programsWithAccess = await Promise.all(programs.map(async program => {
        const progObj = program.toObject ? program.toObject() : { ...program };
        progObj.title = progObj.name;
        const access = await verifyStudentAccess({
          user: req.user,
          programId: program._id
        });

        progObj.isEnrolled = access.granted;
        progObj.isPurchased = access.granted;
        if (!access.granted) {
          progObj.isLocked = true;
          progObj.lockReason = access.reason;
          progObj.lockStatus = access.status;
        }

        const stats = programStats[program._id.toString()] || { subjectsCount: 0, lessonsCount: 0, contentsCount: 0, contentIds: [] };
        progObj.subjectsCount = stats.subjectsCount;
        progObj.lessonsCount = stats.lessonsCount;
        progObj.contentsCount = stats.contentsCount;

        // Calculate progress percentage
        if (stats.contentIds.length > 0) {
          const completedCount = stats.contentIds.filter(cid => completedContentIds.has(cid)).length;
          progObj.completedCount = completedCount;
          progObj.progressPercentage = Math.round((completedCount / stats.contentIds.length) * 100);
        } else {
          progObj.completedCount = 0;
          progObj.progressPercentage = 0;
        }

        return progObj;
      }));
      const assignedPrograms = programsWithAccess.filter(p => p.isEnrolled);
      return res.json(assignedPrograms);
    }

    const programsWithStats = programs.map(program => {
      const progObj = program.toObject ? program.toObject() : { ...program };
      progObj.title = progObj.name;
      const stats = programStats[program._id.toString()] || { subjectsCount: 0, lessonsCount: 0, contentsCount: 0 };
      progObj.subjectsCount = stats.subjectsCount;
      progObj.lessonsCount = stats.lessonsCount;
      progObj.contentsCount = stats.contentsCount;
      return progObj;
    });

    res.json(programsWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProgramById = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const program = req.user.role === 'owner'
      ? await Program.findOne({ _id: req.params.id, isDeleted: false }).lean()
      : await Program.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false }).lean();

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Assemble nested hierarchy tree in parallel
    const [subjects, access, blocks] = await Promise.all([
      Subject.find({ programId: program._id, isDeleted: false }).sort({ displayOrder: 1 }).lean(),
      verifyStudentAccess({ user: req.user, programId: program._id }),
      req.user.role === 'student'
        ? StudentContentAccess.find({
            studentId: req.user._id,
            batchId: program._id,
            status: 'blocked'
          }).lean()
        : []
    ]);

    const subjectIds = subjects.map(s => s._id);

    const units = await Unit.find({ subjectId: { $in: subjectIds }, isDeleted: false }).sort({ displayOrder: 1 }).lean();
    const unitIds = units.map(u => u._id);

    const lessons = await Lesson.find({ unitId: { $in: unitIds }, isDeleted: false }).populate('videoAssetId').sort({ order: 1 }).lean();
    const lessonIds = lessons.map(l => l._id);

    const contents = await Content.find({ lessonId: { $in: lessonIds }, isDeleted: false }).sort({ order: 1 }).populate('videoAssetId').lean();

    // For students, check progress on each content item
    const studentId = req.user._id;
    const progressRecords = req.user.role === 'student'
      ? await ContentProgress.find({ studentId, contentId: { $in: contents.map(c => c._id) } }).lean()
      : [];

    const progressMap = new Map(progressRecords.map(r => [r.contentId.toString(), r]));

    const isBatchBlocked = blocks.some(b => !b.subjectId && !b.unitId && !b.topicId);
    const isSubjectBlocked = (subId) => blocks.some(b => b.subjectId && b.subjectId.toString() === subId.toString() && !b.unitId && !b.topicId);
    const isUnitBlocked = (unId) => blocks.some(b => b.unitId && b.unitId.toString() === unId.toString() && !b.topicId);
    const isLessonBlocked = (lesId) => blocks.some(b => b.topicId && b.topicId.toString() === lesId.toString());

    const programAccessGranted = access.granted && !isBatchBlocked;

    const playbackToken = jwt.sign(
      { id: req.user._id, sessionToken: req.user.activeSessionToken, isPlaybackToken: true },
      process.env.JWT_SECRET || 'trineo_stream_premium_saas_crm_lms_secret_key_2026_xyz',
      { expiresIn: '15m' }
    );

    // Build the structural tree in memory
    const subjectsList = subjects.map(subject => {
      const subObj = subject.toObject ? subject.toObject() : { ...subject };
      const subjectBlocked = isSubjectBlocked(subject._id);

      const subUnits = units.filter(u => u.subjectId.toString() === subject._id.toString()).map(unit => {
        const unitObj = unit.toObject ? unit.toObject() : { ...unit };
        const unitBlocked = subjectBlocked || isUnitBlocked(unit._id);

        const unitLessons = lessons.filter(l => l.unitId.toString() === unit._id.toString()).map(lesson => {
          const lessonObj = transformLessonObj(lesson);
          const lessonBlocked = unitBlocked || isLessonBlocked(lesson._id);

          const lessonVideos = contents
            .filter(c => c.lessonId.toString() === lesson._id.toString() && c.type === 'video')
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(content => {
              const contentObj = content.toObject ? content.toObject() : { ...content };
              
              // Handle populated videoAssetId details if present
              const asset = content.videoAssetId;
              if (asset && typeof asset === 'object') {
                contentObj.youtubeVideoId = asset.youtubeVideoId || contentObj.youtubeVideoId;
                contentObj.youtubeThumbnail = asset.youtubeThumbnail || contentObj.youtubeThumbnail;
                contentObj.youtubeDuration = asset.youtubeDuration || contentObj.youtubeDuration;
                contentObj.duration = asset.youtubeDuration || contentObj.duration;
                contentObj.durationSeconds = asset.durationSeconds || contentObj.durationSeconds;
                contentObj.uploadStatus = asset.uploadStatus || contentObj.uploadStatus;
              }

              if (req.user.role === 'student') {
                const progRec = progressMap.get(content._id.toString());
                contentObj.completed = progRec ? progRec.completed : false;
                contentObj.completedAt = progRec ? progRec.completedAt : null;

                if (!programAccessGranted || lessonBlocked) {
                  // Blur out media details for locked programs or blocked topics
                  contentObj.youtubeVideoId = null;
                  contentObj.youtubeThumbnail = null;
                  contentObj.attachmentUrl = null;
                  contentObj.attachmentName = null;
                  contentObj.description = '';
                  contentObj.videoAssetId = null;
                  contentObj.isLocked = true;
                  contentObj.lockReason = lessonBlocked 
                    ? '🔒 Access Restricted. Contact your institute administrator.' 
                    : (access.reason || '🔒 Batch Locked. Contact your institute.');
                } else {
                  contentObj.isLocked = false;
                }
              } else {
                contentObj.isLocked = false;
              }
              return contentObj;
            });

          const lessonContents = contents.filter(c => c.lessonId.toString() === lesson._id.toString()).map(content => {
            const contentObj = content.toObject ? content.toObject() : { ...content };
            if (req.user.role === 'student') {
              const progRec = progressMap.get(content._id.toString());
              contentObj.completed = progRec ? progRec.completed : false;
              contentObj.completedAt = progRec ? progRec.completedAt : null;

              if (!programAccessGranted || lessonBlocked) {
                // Blur out media details for locked programs or blocked topics
                contentObj.youtubeVideoId = null;
                contentObj.youtubeThumbnail = null;
                contentObj.attachmentUrl = null;
                contentObj.attachmentName = null;
                contentObj.description = '';
                contentObj.videoAssetId = null;
                contentObj.isLocked = true;
                contentObj.lockReason = lessonBlocked 
                  ? '🔒 Access Restricted. Contact your institute administrator.' 
                  : (access.reason || '🔒 Batch Locked. Contact your institute.');
              } else {
                contentObj.isLocked = false;
              }
            } else {
              contentObj.isLocked = false;
            }
            return contentObj;
          });

          lessonObj.videos = lessonVideos;
          lessonObj.videoCount = lessonVideos.length;
          lessonObj.contents = lessonContents;

          // Backward compatibility: map the first video's properties directly to the lessonObj
          if (lessonVideos.length > 0) {
            lessonObj.videoAssetId = lessonVideos[0].videoAssetId;
            lessonObj.youtubeVideoId = lessonVideos[0].youtubeVideoId || null;
            lessonObj.youtubeThumbnail = lessonVideos[0].youtubeThumbnail || null;
            lessonObj.youtubeDuration = lessonVideos[0].youtubeDuration || null;
            lessonObj.duration = lessonVideos[0].duration || null;
            lessonObj.durationSeconds = lessonVideos[0].durationSeconds || 0;
            lessonObj.uploadStatus = lessonVideos[0].uploadStatus || 'pending';
          } else {
            lessonObj.youtubeVideoId = null;
            lessonObj.uploadStatus = 'pending';
          }

          if (req.user.role === 'student' && lessonBlocked) {
            lessonObj.isLocked = true;
            lessonObj.lockReason = '🔒 Access Restricted. Contact your institute administrator.';
            lessonObj.youtubeVideoId = null;
            lessonObj.youtubeThumbnail = null;
            lessonObj.attachmentUrl = null;
            lessonObj.attachmentName = null;
            lessonObj.description = '';
            lessonObj.videoAssetId = null;
          }
          return lessonObj;
        });

        unitObj.lessons = unitLessons;
        if (req.user.role === 'student' && unitBlocked) {
          unitObj.isLocked = true;
          unitObj.lockReason = '🔒 Access Restricted. Contact your institute administrator.';
        }
        return unitObj;
      });

      subObj.units = subUnits;
      if (req.user.role === 'student' && subjectBlocked) {
        subObj.isLocked = true;
        subObj.lockReason = '🔒 Access Restricted. Contact your institute administrator.';
      }
      return subObj;
    });

    const progObj = program.toObject ? program.toObject() : { ...program };
    progObj.title = progObj.name;
    progObj.subjects = subjectsList;
    progObj.isEnrolled = programAccessGranted;
    progObj.isPurchased = programAccessGranted;
    progObj.playbackToken = playbackToken;

    if (!programAccessGranted) {
      progObj.isLocked = true;
      progObj.lockReason = isBatchBlocked 
        ? '🔒 Access Restricted. Contact your institute administrator.' 
        : (access.reason || '🔒 Batch Locked. Contact your institute.');
      progObj.lockStatus = isBatchBlocked ? 'blocked' : access.status;
    }

    res.json(progObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const createProgram = async (req, res) => {
  const { name, description, thumbnail, bannerImage, displayOrder, status, isLocked } = req.body;
  const programName = name || req.body.title;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const program = new Program({
      name: programName,
      description,
      thumbnail,
      bannerImage,
      displayOrder: Number(displayOrder) || 0,
      status: status || 'active',
      isLocked: isLocked !== undefined ? isLocked : false,
      institute: req.user.institute || null
    });

    const created = await program.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProgram = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const program = req.user.role === 'owner'
      ? await Program.findOne({ _id: req.params.id, isDeleted: false })
      : await Program.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    program.name = req.body.name || req.body.title || program.name;
    program.description = req.body.description || program.description;
    program.thumbnail = req.body.thumbnail !== undefined ? req.body.thumbnail : program.thumbnail;
    program.bannerImage = req.body.bannerImage !== undefined ? req.body.bannerImage : program.bannerImage;
    program.displayOrder = req.body.displayOrder !== undefined ? Number(req.body.displayOrder) : program.displayOrder;
    program.status = req.body.status || program.status;
    program.isLocked = req.body.isLocked !== undefined ? req.body.isLocked : program.isLocked;

    const updated = await program.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProgram = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const program = req.user.role === 'owner'
      ? await Program.findOne({ _id: req.params.id, isDeleted: false })
      : await Program.findOne({ _id: req.params.id, institute: req.user.institute, isDeleted: false });

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    program.isDeleted = true;
    program.deletedAt = new Date();
    await program.save();

    res.json({ message: 'Program soft deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProgramBySlug = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const program = req.user.role === 'owner'
      ? await Program.findOne({ slug: req.params.slug, isDeleted: false })
      : await Program.findOne({ slug: req.params.slug, institute: req.user.institute, isDeleted: false });

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    req.params.id = program._id.toString();
    return getProgramById(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkUpdatePrograms = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const { programIds = [], action } = req.body;
    if (!programIds.length) return res.status(400).json({ message: 'No programs selected' });

    const filter = req.user.role === 'owner' 
      ? { _id: { $in: programIds }, isDeleted: false } 
      : { _id: { $in: programIds }, institute: req.user.institute, isDeleted: false };

    const update = {};
    if (action === 'delete') {
      update.isDeleted = true;
      update.deletedAt = new Date();
    } else if (action === 'lock') {
      update.isLocked = true;
    } else if (action === 'unlock') {
      update.isLocked = false;
    } else if (action === 'publish') {
      update.status = 'active';
    } else if (action === 'unpublish') {
      update.status = 'inactive';
    }

    await Program.updateMany(filter, { $set: update });
    res.json({ message: 'Bulk action completed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
