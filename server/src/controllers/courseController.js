import jwt from 'jsonwebtoken';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { Purchase } from '../models/Purchase.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';

const getCourseLessonPayload = async (req, course) => {
  const lessonQuery = req.user.role === 'owner'
    ? { courseId: course._id }
    : { courseId: course._id, institute: req.user.institute };
  const lessons = await Lesson.find(lessonQuery).sort({ order: 1 }).populate('videoAssetId');
  const courseObj = course.toObject();

  // Check course-level access
  const courseAccess = await verifyStudentAccess({
    user: req.user,
    courseId: course._id
  });

  const isPurchased = courseAccess.granted;
  courseObj.isPurchased = isPurchased;

  if (!courseAccess.granted) {
    courseObj.isLocked = true;
    courseObj.lockReason = courseAccess.reason;
    courseObj.lockStatus = courseAccess.status;
  }

  const playbackToken = jwt.sign(
    { id: req.user._id, sessionToken: req.user.activeSessionToken, isPlaybackToken: true },
    process.env.JWT_SECRET || 'trineo_stream_premium_saas_crm_lms_secret_key_2026_xyz',
    { expiresIn: '15m' }
  );
  courseObj.playbackToken = playbackToken;

  // Verify access for each lesson individually
  courseObj.lessons = await Promise.all(lessons.map(async lesson => {
    const lessonObj = lesson.toObject();
    
    const access = await verifyStudentAccess({
      user: req.user,
      courseId: course._id,
      subjectTitle: lesson.subjectTitle || 'General',
      moduleTitle: lesson.moduleTitle || 'Module 1',
      lessonId: lesson._id
    });

    if (!access.granted) {
      lessonObj.youtubeVideoId = null;
      lessonObj.youtubeThumbnail = null;
      lessonObj.description = '';
      lessonObj.attachmentUrl = null;
      lessonObj.attachmentName = null;
      lessonObj.youtubeDuration = null;
      lessonObj.duration = '0:00';
      lessonObj.durationSeconds = 0;
      lessonObj.isLocked = true;
      lessonObj.lockReason = access.reason;
      lessonObj.lockStatus = access.status;
    } else {
      lessonObj.isLocked = false;
    }
    return lessonObj;
  }));

  return courseObj;
};

export const getCourses = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const query = req.user.role === 'owner' ? {} : { institute: req.user.institute };
    const courses = await Course.find(query).lean();

    // Aggregate real lesson counts per course
    const courseIds = courses.map(c => c._id);
    const lessonCounts = await Lesson.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } }
    ]).lean();
    const lessonCountMap = {};
    for (const lc of lessonCounts) {
      lessonCountMap[lc._id.toString()] = lc.count;
    }

    // For students, check their access status
    if (req.user.role === 'student') {
      const coursesWithPurchaseStatus = await Promise.all(courses.map(async course => {
        const courseObj = course.toObject ? course.toObject() : { ...course };
        
        const access = await verifyStudentAccess({
          user: req.user,
          courseId: course._id
        });

        courseObj.isPurchased = access.granted;
        if (!access.granted) {
          courseObj.isLocked = true;
          courseObj.lockReason = access.reason;
          courseObj.lockStatus = access.status;
        }
        courseObj.lessonsCount = lessonCountMap[course._id.toString()] || 0;
        return courseObj;
      }));
      
      const assignedCourses = coursesWithPurchaseStatus.filter(c => c.isPurchased);
      return res.json(assignedCourses);
    }

    const coursesWithCounts = courses.map(course => {
      const courseObj = course.toObject ? course.toObject() : { ...course };
      courseObj.lessonsCount = lessonCountMap[course._id.toString()] || 0;
      return courseObj;
    });
    res.json(coursesWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getCourseById = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const course = req.user.role === 'owner'
      ? await Course.findById(req.params.id)
      : await Course.findOne({ _id: req.params.id, institute: req.user.institute });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (req.user.role !== 'owner' && !course.institute) {
      return res.status(403).json({ message: 'Forbidden: cross-tenant access denied' });
    }
    res.json(await getCourseLessonPayload(req, course));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCourseBySlug = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const course = req.user.role === 'owner'
      ? await Course.findOne({ slug: req.params.slug })
      : await Course.findOne({ slug: req.params.slug, institute: req.user.institute });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (req.user.role !== 'owner' && !course.institute) {
      return res.status(403).json({ message: 'Forbidden: cross-tenant access denied' });
    }
    res.json(await getCourseLessonPayload(req, course));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCourse = async (req, res) => {
  const { title, description, instructor, thumbnail, price, duration, status } = req.body;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const course = new Course({
      title,
      description,
      instructor,
      thumbnail,
      price,
      duration,
      status: status || 'active',
      institute: req.user.institute || null
    });

    const createdCourse = await course.save();
    res.status(201).json(createdCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCourse = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const course = req.user.role === 'owner'
      ? await Course.findById(req.params.id)
      : await Course.findOne({ _id: req.params.id, institute: req.user.institute });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.title = req.body.title || course.title;
    course.description = req.body.description || course.description;
    course.instructor = req.body.instructor || course.instructor;
    course.thumbnail = req.body.thumbnail || course.thumbnail;
    course.price = req.body.price !== undefined ? req.body.price : course.price;
    course.duration = req.body.duration || course.duration;
    course.status = req.body.status || course.status;

    const updatedCourse = await course.save();
    res.json(updatedCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const course = req.user.role === 'owner'
      ? await Course.findById(req.params.id)
      : await Course.findOne({ _id: req.params.id, institute: req.user.institute });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await Course.deleteOne({ _id: course._id, ...(req.user.role === 'owner' ? {} : { institute: req.user.institute }) });
    await Lesson.deleteMany({ courseId: course._id, ...(req.user.role === 'owner' ? {} : { institute: req.user.institute }) });
    res.json({ message: 'Course and lessons removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
