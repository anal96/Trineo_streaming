import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { Notification } from '../models/Notification.js';
import { Institute } from '../models/Institute.js';
import { Announcement } from '../models/Announcement.js';
import { Lesson } from '../models/Lesson.js';
import { StudyMaterial } from '../models/StudyMaterial.js';

export const getAdminOverview = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const isOwner = req.user.role === 'owner';
    const instQuery = isOwner ? {} : { institute: req.user.institute };
    const userQuery = isOwner ? { role: 'student' } : { role: 'student', institute: req.user.institute };
    const now = new Date();
    const range = req.query.range || '30d';
    const rangeMap = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
    const days = rangeMap[range] || 30;
    const fromDate = new Date(now);
    fromDate.setDate(now.getDate() - days);

    const totalStudents = await User.countDocuments(userQuery);
    const activeStudents = await User.countDocuments({ ...userQuery, status: 'active' });
    const activeCourses = await Course.countDocuments({ ...instQuery, status: 'active' });
    const totalLessons = await Lesson.countDocuments(instQuery);
    const totalStudyMaterials = await StudyMaterial.countDocuments(instQuery);
    
    const studentIds = (await User.find(userQuery).select('_id')).map(u => u._id);
    const purchaseMatch = isOwner
      ? { status: 'completed' }
      : { status: 'completed', institute: req.user.institute };

    const revenueResult = await Purchase.aggregate([
      { $match: purchaseMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    const newEnrollments = await Purchase.countDocuments({
      ...purchaseMatch,
      purchasedAt: { $gte: fromDate }
    });

    const watchHistoryFilter = isOwner
      ? { studentId: { $in: studentIds } }
      : { studentId: { $in: studentIds }, institute: req.user.institute };
    const totalWatchHistory = await WatchHistory.countDocuments(watchHistoryFilter);
    const watchHistoryInRange = await WatchHistory.find({ ...watchHistoryFilter, watchedAt: { $gte: fromDate } }).select('studentId courseId lessonId progress completed watchedAt');
    const completedWatchHistory = await WatchHistory.countDocuments({ ...watchHistoryFilter, completed: true });
    const completionRate = totalWatchHistory > 0 ? ((completedWatchHistory / totalWatchHistory) * 100).toFixed(1) : '0';
    const totalWatchSeconds = watchHistoryInRange.reduce((sum, entry) => sum + Math.round((entry.progress || 0) * 0.6), 0);
    const watchHours = Math.round((totalWatchSeconds / 3600) * 10) / 10;

    const revenueMonthlyAgg = await Purchase.aggregate([
      { $match: { ...purchaseMatch, purchasedAt: { $gte: fromDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$purchasedAt' } },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const revenueData = revenueMonthlyAgg.map((item) => ({ month: item._id, revenue: item.revenue }));

    const topCoursesAgg = await Purchase.aggregate([
      { $match: purchaseMatch },
      { $group: { _id: '$courseId', enrollments: { $sum: 1 } } },
      { $sort: { enrollments: -1 } },
      { $limit: 5 }
    ]);

    const populatedTopCourses = await Course.populate(topCoursesAgg, { path: '_id', select: 'title' });
    const topCoursesData = populatedTopCourses.map(item => ({
      name: item._id?.title || 'Unknown Course',
      enrollments: item.enrollments
    }));

    const studentsList = await User.find(userQuery).select('-password').sort({ createdAt: -1 });
    
    // Enrich students with course count and average progress
    const enrichedStudents = await Promise.all(studentsList.map(async (student) => {
      const courseCount = await Purchase.countDocuments({ studentId: student._id, status: 'completed' });
      
      const progressList = await WatchHistory.find({ studentId: student._id });
      const avgProgress = progressList.length > 0
        ? Math.round(progressList.reduce((acc, curr) => acc + curr.progress, 0) / progressList.length)
        : 0;

      const dateStr = student.createdAt.toISOString().split('T')[0];

      return {
        id: student._id,
        user_id: student.user_id,
        name: student.name,
        email: student.email,
        courses: courseCount,
        progress: avgProgress,
        joined: dateStr,
        status: student.status,
        branchName: student.branchName || '',
        batchName: student.batchName || '',
        courseName: student.courseName || '',
        enrollmentDate: student.enrollmentDate ? student.enrollmentDate.toISOString().split('T')[0] : '',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`
      };
    }));

    const activities = await Notification.find(isOwner ? {} : { institute: req.user.institute })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const formattedActivities = activities.map(act => {
      const timeDiff = Math.abs(new Date() - new Date(act.createdAt));
      const diffMins = Math.floor(timeDiff / (1000 * 60));
      const diffHours = Math.floor(timeDiff / (1000 * 60 * 60));
      
      let timeStr = 'Just now';
      if (diffMins > 0 && diffMins < 60) timeStr = `${diffMins} min ago`;
      else if (diffHours > 0 && diffHours < 24) timeStr = `${diffHours} hours ago`;
      else if (diffHours >= 24) timeStr = `${Math.floor(diffHours / 24)} days ago`;

      return {
        id: act._id,
        type: act.type,
        user: act.userId?.name || 'Admin',
        action: act.message,
        time: timeStr
      };
    });

    const studentProgressMap = {};
    for (const entry of watchHistoryInRange) {
      const key = String(entry.studentId);
      if (!studentProgressMap[key]) studentProgressMap[key] = [];
      studentProgressMap[key].push(entry.progress || 0);
    }
    const studentProgress = Object.entries(studentProgressMap).map(([studentId, values]) => ({
      studentId,
      avgProgress: Math.round(values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1)),
      activityCount: values.length
    }));
    studentProgress.sort((a, b) => b.activityCount - a.activityCount);

    const courseViews = {};
    const lessonViews = {};
    watchHistoryInRange.forEach((entry) => {
      const cKey = String(entry.courseId);
      courseViews[cKey] = (courseViews[cKey] || 0) + 1;
      const lKey = String(entry.lessonId);
      lessonViews[lKey] = (lessonViews[lKey] || 0) + 1;
    });

    const coursesByViews = Object.entries(courseViews).sort((a, b) => b[1] - a[1]);
    const lessonsByViews = Object.entries(lessonViews).sort((a, b) => b[1] - a[1]);
    const mostViewedCourse = coursesByViews[0] || null;
    const leastViewedCourse = coursesByViews[coursesByViews.length - 1] || null;
    const mostWatchedLesson = lessonsByViews[0] || null;
    const leastWatchedLesson = lessonsByViews[lessonsByViews.length - 1] || null;

    res.json({
      metrics: {
        totalStudents,
        activeStudents,
        totalRevenue,
        activeCourses,
        totalLessons,
        totalStudyMaterials,
        completionRate,
        watchHours,
        newEnrollments
      },
      revenueData,
      topCourses: topCoursesData,
      students: enrichedStudents,
      recentActivity: formattedActivities,
      studentAnalytics: {
        mostActiveStudents: studentProgress.slice(0, 5),
        leastActiveStudents: studentProgress.slice(-5),
        studentsWithNoActivity: Math.max(totalStudents - Object.keys(studentProgressMap).length, 0),
        topLearners: studentProgress.slice(0, 5).sort((a, b) => b.avgProgress - a.avgProgress),
      },
      courseAnalytics: {
        mostViewedCourse,
        leastViewedCourse,
        averageProgress: studentProgress.length ? Math.round(studentProgress.reduce((a, b) => a + b.avgProgress, 0) / studentProgress.length) : 0,
        courseCompletionRate: completionRate
      },
      videoAnalytics: {
        mostWatchedLesson,
        leastWatchedLesson,
        totalWatchTimeSeconds: totalWatchSeconds,
        averageWatchDurationSeconds: watchHistoryInRange.length ? Math.round(totalWatchSeconds / watchHistoryInRange.length) : 0,
        lessonCompletionRate: completionRate
      },
      engagement: {
        dailyActiveStudents: new Set(watchHistoryInRange.filter((v) => new Date(v.watchedAt) >= new Date(now.getTime() - 24 * 3600 * 1000)).map((v) => String(v.studentId))).size,
        weeklyActiveStudents: new Set(watchHistoryInRange.filter((v) => new Date(v.watchedAt) >= new Date(now.getTime() - 7 * 24 * 3600 * 1000)).map((v) => String(v.studentId))).size,
        monthlyActiveStudents: new Set(watchHistoryInRange.filter((v) => new Date(v.watchedAt) >= new Date(now.getTime() - 30 * 24 * 3600 * 1000)).map((v) => String(v.studentId))).size
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudentStatus = async (req, res) => {
  const { studentId, status } = req.body;
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const student = req.user.role === 'owner'
      ? await User.findById(studentId)
      : await User.findOne({ _id: studentId, institute: req.user.institute });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.status = status;
    await student.save();

    // Log this action
    await Notification.create({
      userId: null,
      institute: student.institute || req.user.institute || null,
      message: `Student ${student.name} status updated to ${status}`,
      type: 'system'
    });

    res.json({ message: 'Student status updated successfully', studentId, status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStudent = async (req, res) => {
  const { name, email, password, phone, status, branchName, batchName, courseName, enrollmentDate } = req.body;
  try {
    if (!req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const student = await User.create({
      name,
      email,
      password: password || 'ChangeMe123!',
      phone: phone || '',
      status: status || 'active',
      role: 'student',
      institute: req.user.institute || null,
      branchName: branchName || '',
      batchName: batchName || '',
      courseName: courseName || '',
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date()
    });

    // Auto-create Purchase record if courseName was provided
    if (courseName) {
      const matchedCourse = await Course.findOne({
        title: courseName,
        institute: req.user.institute
      });
      if (matchedCourse) {
        await Purchase.findOneAndUpdate(
          { studentId: student._id, courseId: matchedCourse._id, institute: req.user.institute },
          { amount: 0, status: 'completed', purchasedAt: new Date() },
          { upsert: true, new: true }
        );
      }
    }

    await Notification.create({
      userId: null,
      institute: req.user.institute || null,
      message: `Student account created for ${student.name}`,
      type: 'system'
    });

    res.status(201).json({
      message: 'Student created successfully',
      student: {
        id: student._id,
        user_id: student.user_id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        status: student.status,
        role: student.role,
        branchName: student.branchName,
        batchName: student.batchName,
        courseName: student.courseName,
        enrollmentDate: student.enrollmentDate,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudent = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const student = req.user.role === 'owner'
      ? await User.findById(req.params.id)
      : await User.findOne({ _id: req.params.id, institute: req.user.institute });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const oldCourseName = student.courseName;

    student.name = req.body.name || student.name;
    student.email = req.body.email || student.email;
    student.phone = req.body.phone ?? student.phone;
    student.status = req.body.status || student.status;
    student.branchName = req.body.branchName ?? student.branchName;
    student.batchName = req.body.batchName ?? student.batchName;
    student.courseName = req.body.courseName ?? student.courseName;
    if (req.body.enrollmentDate) {
      student.enrollmentDate = new Date(req.body.enrollmentDate);
    }

    if (req.body.password) {
      student.password = req.body.password;
    }

    await student.save();

    // Sync Purchase records if courseName changed
    const instId = student.institute || req.user.institute;
    if (req.body.courseName !== undefined && req.body.courseName !== oldCourseName) {
      // Remove purchase for old course
      if (oldCourseName) {
        const oldCourse = await Course.findOne({ title: oldCourseName, institute: instId });
        if (oldCourse) {
          await Purchase.deleteOne({ studentId: student._id, courseId: oldCourse._id, institute: instId });
        }
      }
      // Create purchase for new course
      if (student.courseName) {
        const newCourse = await Course.findOne({ title: student.courseName, institute: instId });
        if (newCourse) {
          await Purchase.findOneAndUpdate(
            { studentId: student._id, courseId: newCourse._id, institute: instId },
            { amount: 0, status: 'completed', purchasedAt: new Date() },
            { upsert: true, new: true }
          );
        }
      }
    }

    res.json({
      message: 'Student updated successfully',
      student: {
        id: student._id,
        user_id: student.user_id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        status: student.status,
        role: student.role,
        branchName: student.branchName,
        batchName: student.batchName,
        courseName: student.courseName,
        enrollmentDate: student.enrollmentDate,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const student = req.user.role === 'owner'
      ? await User.findById(req.params.id)
      : await User.findOne({ _id: req.params.id, institute: req.user.institute });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const instituteFilter = req.user.role === 'owner' ? {} : { institute: req.user.institute };
    await Purchase.deleteMany({ studentId: student._id, ...instituteFilter });
    await WatchHistory.deleteMany({ studentId: student._id, ...instituteFilter });
    await Notification.deleteMany({ userId: student._id, ...instituteFilter });
    await User.deleteOne({ _id: student._id, ...(req.user.role === 'owner' ? {} : { institute: req.user.institute }) });

    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAnnouncement = async (req, res) => {
  const { title, message } = req.body;
  try {
    if (!req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const announcement = await Announcement.create({
      title,
      message,
      author: req.user.name || 'Institute Admin',
      institute: req.user.institute || null
    });
    const students = await User.find({ institute: req.user.institute, role: 'student', status: 'active' }).select('_id');
    if (students.length) {
      await Notification.insertMany(students.map((student) => ({
        institute: req.user.institute || null,
        userId: student._id,
        message: `New announcement: ${title}`,
        type: 'system',
        read: false
      })));
    }
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const filter = req.user.role === 'owner' ? {} : { institute: req.user.institute };
    const announcements = await Announcement.find(filter).sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInstituteBranding = async (req, res) => {
  try {
    const { name, logo, favicon, theme, supportEmail, supportPhone, branchName } = req.body;
    
    if (!req.user.institute) {
      return res.status(400).json({ message: 'Admin is not linked to any institute' });
    }

    const institute = await Institute.findById(req.user.institute);
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    if (name) institute.name = name;
    if (logo !== undefined) institute.logo = logo;
    if (favicon !== undefined) institute.favicon = favicon;
    if (theme) {
      if (theme.brandColor !== undefined) institute.theme.brandColor = theme.brandColor;
      if (theme.secondaryColor !== undefined) institute.theme.secondaryColor = theme.secondaryColor;
    }
    if (supportEmail !== undefined) institute.supportEmail = supportEmail;
    if (supportPhone !== undefined) institute.supportPhone = supportPhone;
    if (branchName !== undefined) institute.branchName = branchName;

    await institute.save();
    res.json({ message: 'Branding updated successfully', institute });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
