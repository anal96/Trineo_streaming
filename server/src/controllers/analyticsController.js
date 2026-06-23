import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { Notification } from '../models/Notification.js';
import { Institute } from '../models/Institute.js';
import { Announcement } from '../models/Announcement.js';
import { Lesson } from '../models/Lesson.js';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { AuditLog } from '../models/AuditLog.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { generateTemporaryPassword } from '../utils/passwordGenerator.js';
import { sendStudentWelcomeEmail } from '../services/emailService.js';

export const getAdminOverview = async (req, res) => {
  const start = Date.now();
  console.log("Overview Start");

  const timedQuery = async (queryName, queryPromise) => {
    const qStart = Date.now();
    const result = await queryPromise;
    console.log(`[PROFILE] Query "${queryName}" took ${Date.now() - qStart} ms`);
    return result;
  };

  try {
    if (req.user.role !== 'owner' && !req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const isOwner = req.user.role === 'owner';
    const instQuery = isOwner ? {} : { institute: req.user.institute };
    const userQuery = isOwner ? { role: 'student' } : { role: 'student', institute: req.user.institute };
    const now = new Date();
    
    // Parse range
    const range = req.query.range || '30d';
    let fromDate = new Date();
    let toDate = new Date();
    
    if (range === 'today') {
      fromDate.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      fromDate.setDate(fromDate.getDate() - 7);
    } else if (range === '30d') {
      fromDate.setDate(fromDate.getDate() - 30);
    } else if (range === '90d') {
      fromDate.setDate(fromDate.getDate() - 90);
    } else if (range === 'custom' && req.query.startDate && req.query.endDate) {
      fromDate = new Date(req.query.startDate);
      toDate = new Date(req.query.endDate);
      toDate.setHours(23, 59, 59, 999);
    } else {
      fromDate.setDate(fromDate.getDate() - 30); // default 30d
    }

    const purchaseMatch = isOwner
      ? { status: 'completed' }
      : { status: 'completed', institute: req.user.institute };

    // --- Execute First Batch of Queries in Parallel ---
    const [
      totalStudents,
      activeLoginUserIds,
      activeWatchUserIds,
      activeDownloadUserIds,
      distinctBatches,
      distinctCourses,
      totalTopics,
      distinctSubjects,
      watchHistoryInRange,
      totalStudyMaterials,
      revenueResult,
      newEnrollments,
      activeCourses,
      totalWatchHistory,
      completedWatchHistory,
      revenueMonthlyAgg,
      topCoursesAgg,
      loginsList,
      viewsList,
      downloadsList,
      allStudents,
      watchHistoriesWithLesson,
      downloadEvents,
      recentWatch,
      recentDown
    ] = await Promise.all([
      timedQuery('totalStudents', User.countDocuments(userQuery)),
      timedQuery('activeLoginUserIds', AuditLog.distinct('userId', {
        ...instQuery,
        eventType: { $in: ['login', 'LOGIN_SUCCESS', 'SSO_LOGIN_SUCCESS'] },
        createdAt: { $gte: fromDate, $lte: toDate }
      })),
      timedQuery('activeWatchUserIds', WatchHistory.distinct('studentId', {
        ...instQuery,
        $or: [
          { lastWatchedAt: { $gte: fromDate, $lte: toDate } },
          { watchedAt: { $gte: fromDate, $lte: toDate } }
        ]
      })),
      timedQuery('activeDownloadUserIds', SecurityEvent.distinct('studentId', {
        ...instQuery,
        eventType: 'download_attempt',
        createdAt: { $gte: fromDate, $lte: toDate }
      })),
      timedQuery('distinctBatches', User.distinct('batchName', {
        ...userQuery,
        batchName: { $ne: '' }
      })),
      timedQuery('distinctCourses', User.distinct('courseName', {
        ...userQuery,
        courseName: { $ne: '' }
      })),
      timedQuery('totalTopics', Lesson.countDocuments({
        ...instQuery,
        publishStatus: 'published',
        isDeleted: { $ne: true }
      })),
      timedQuery('distinctSubjects', Lesson.distinct('subjectTitle', {
        ...instQuery,
        isDeleted: { $ne: true }
      })),
      timedQuery('watchHistoryInRange', WatchHistory.find({
        ...instQuery,
        $or: [
          { lastWatchedAt: { $gte: fromDate, $lte: toDate } },
          { watchedAt: { $gte: fromDate, $lte: toDate } }
        ]
      }).select('watchTime progress').lean()),
      timedQuery('totalStudyMaterials', StudyMaterial.countDocuments(instQuery)),
      timedQuery('revenueResult', Purchase.aggregate([
        { $match: purchaseMatch },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])),
      timedQuery('newEnrollments', Purchase.countDocuments({
        ...purchaseMatch,
        purchasedAt: { $gte: fromDate }
      })),
      timedQuery('activeCourses', Course.countDocuments({ ...instQuery, status: 'active' })),
      timedQuery('totalWatchHistory', WatchHistory.countDocuments(instQuery)),
      timedQuery('completedWatchHistory', WatchHistory.countDocuments({ ...instQuery, completed: true })),
      timedQuery('revenueMonthlyAgg', Purchase.aggregate([
        { $match: { ...purchaseMatch, purchasedAt: { $gte: fromDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$purchasedAt' } },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ])),
      timedQuery('topCoursesAgg', Purchase.aggregate([
        { $match: purchaseMatch },
        { $group: { _id: '$courseId', enrollments: { $sum: 1 } } },
        { $sort: { enrollments: -1 } },
        { $limit: 5 }
      ])),
      timedQuery('loginsList', AuditLog.find({
        ...instQuery,
        eventType: { $in: ['login', 'LOGIN_SUCCESS', 'SSO_LOGIN_SUCCESS'] },
        createdAt: { $gte: fromDate, $lte: toDate }
      }).select('createdAt').lean()),
      timedQuery('viewsList', WatchHistory.find({
        ...instQuery,
        $or: [
          { lastWatchedAt: { $gte: fromDate, $lte: toDate } },
          { watchedAt: { $gte: fromDate, $lte: toDate } }
        ]
      }).select('lastWatchedAt watchedAt watchTime progress studentId').lean()),
      timedQuery('downloadsList', SecurityEvent.find({
        ...instQuery,
        eventType: 'download_attempt',
        createdAt: { $gte: fromDate, $lte: toDate }
      }).select('createdAt').lean()),
      timedQuery('allStudents', User.find(userQuery).select('_id name email batchName createdAt enrollmentDate packageExpiryDate joined phone courseName status branchName').lean()),
      timedQuery('watchHistoriesWithLesson', WatchHistory.find({
        ...instQuery
      }).populate({
        path: 'lessonId',
        select: 'title subjectTitle'
      }).select('lessonId watchTime progress completed').lean()),
      timedQuery('downloadEvents', SecurityEvent.find({
        ...instQuery,
        eventType: 'download_attempt',
        createdAt: { $gte: fromDate, $lte: toDate }
      }).select('details topicTitle').lean()),
      timedQuery('recentWatch', WatchHistory.find(instQuery)
        .populate('studentId', 'name')
        .populate('lessonId', 'title')
        .sort({ lastWatchedAt: -1, watchedAt: -1 })
        .limit(15)
        .lean()),
      timedQuery('recentDown', SecurityEvent.find({
        ...instQuery,
        eventType: 'download_attempt'
      })
        .populate('studentId', 'name')
        .sort({ createdAt: -1 })
        .limit(15)
        .lean())
    ]);

    // Active users size check
    const activeUserIdsSet = new Set([
      ...activeLoginUserIds.filter(Boolean).map(String),
      ...activeWatchUserIds.filter(Boolean).map(String),
      ...activeDownloadUserIds.filter(Boolean).map(String)
    ]);
    const activeStudentsCount = activeUserIdsSet.size;
    const activeRate = totalStudents > 0 ? parseFloat(((activeStudentsCount / totalStudents) * 100).toFixed(1)) : 0;

    // Total Batches
    const totalBatches = new Set([...distinctBatches, ...distinctCourses].filter(Boolean)).size;

    // Total Subjects (distinct subjectTitle)
    const totalSubjects = distinctSubjects.filter(Boolean).length;

    // Total Watch Hours
    const totalWatchSeconds = watchHistoryInRange.reduce((sum, entry) => sum + (entry.watchTime || Math.round((entry.progress || 0) * 0.6)), 0);
    const totalWatchHours = parseFloat((totalWatchSeconds / 3600).toFixed(1));

    // Revenue
    const totalRevenue = revenueResult[0]?.total || 0;

    // Course completion rate
    const completionRate = totalWatchHistory > 0 ? ((completedWatchHistory / totalWatchHistory) * 100).toFixed(1) : '0';

    // Revenue chart data
    const revenueData = revenueMonthlyAgg.map((item) => ({ month: item._id, revenue: item.revenue }));

    // Top courses data
    const populatedTopCourses = await timedQuery('populatedTopCourses', Course.populate(topCoursesAgg, { path: '_id', select: 'title' }));
    const topCoursesData = populatedTopCourses.map(item => ({
      name: item._id?.title || 'Unknown Course',
      enrollments: item.enrollments
    }));

    const metrics = {
      totalStudents,
      activeStudents: activeStudentsCount,
      activeRate,
      totalBatches,
      totalTopics,
      totalWatchHours,
      totalStudyMaterials,
      totalRevenue,
      completionRate,
      newEnrollments,
      activeCourses,
      totalSubjects
    };

    // --- 2. Section 1: Student Engagement Trend ---
    let engagementTrend = [];
    if (range === 'today') {
      const hourMap = {};
      for (let i = 0; i < 24; i++) {
        const hourStr = `${String(i).padStart(2, '0')}:00`;
        hourMap[hourStr] = { date: hourStr, logins: 0, views: 0, downloads: 0 };
      }
      loginsList.forEach(item => {
        const hour = new Date(item.createdAt).getHours();
        const hourStr = `${String(hour).padStart(2, '0')}:00`;
        if (hourMap[hourStr]) hourMap[hourStr].logins++;
      });
      viewsList.forEach(item => {
        const dateObj = item.lastWatchedAt || item.watchedAt;
        if (dateObj) {
          const hour = new Date(dateObj).getHours();
          const hourStr = `${String(hour).padStart(2, '0')}:00`;
          if (hourMap[hourStr]) hourMap[hourStr].views++;
        }
      });
      downloadsList.forEach(item => {
        const hour = new Date(item.createdAt).getHours();
        const hourStr = `${String(hour).padStart(2, '0')}:00`;
        if (hourMap[hourStr]) hourMap[hourStr].downloads++;
      });
      engagementTrend = Object.values(hourMap);
    } else {
      const dateMap = {};
      let current = new Date(fromDate);
      while (current <= toDate) {
        const dateStr = current.toISOString().split('T')[0];
        dateMap[dateStr] = { date: dateStr, logins: 0, views: 0, downloads: 0 };
        current.setDate(current.getDate() + 1);
      }
      loginsList.forEach(item => {
        const dStr = new Date(item.createdAt).toISOString().split('T')[0];
        if (dateMap[dStr]) dateMap[dStr].logins++;
      });
      viewsList.forEach(item => {
        const dateObj = item.lastWatchedAt || item.watchedAt;
        if (dateObj) {
          const dStr = new Date(dateObj).toISOString().split('T')[0];
          if (dateMap[dStr]) dateMap[dStr].views++;
        }
      });
      downloadsList.forEach(item => {
        const dStr = new Date(item.createdAt).toISOString().split('T')[0];
        if (dateMap[dStr]) dateMap[dStr].downloads++;
      });
      engagementTrend = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
    }

    // --- 3. Extract Student IDs and execute Bulk dependent queries ---
    const studentIds = allStudents.map(s => String(s._id));
    const studentObjectIds = studentIds.map(id => new mongoose.Types.ObjectId(id));

    const [
      allHistory,
      batchWatchHistories,
      latestLogins,
      latestWatches,
      purchaseCounts
    ] = await Promise.all([
      timedQuery('allHistory', WatchHistory.find({ studentId: { $in: studentIds } }).select('studentId progress').lean()),
      timedQuery('batchWatchHistories', WatchHistory.find({ studentId: { $in: studentIds } }).select('studentId watchTime progress completed').lean()),
      timedQuery('latestLoginsBulk', AuditLog.aggregate([
        {
          $match: {
            userId: { $in: studentObjectIds },
            eventType: { $in: ['login', 'LOGIN_SUCCESS', 'SSO_LOGIN_SUCCESS'] }
          }
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$userId',
            latestLogin: { $first: '$createdAt' }
          }
        }
      ])),
      timedQuery('latestWatchesBulk', WatchHistory.aggregate([
        {
          $match: {
            studentId: { $in: studentObjectIds }
          }
        },
        { $sort: { lastWatchedAt: -1, watchedAt: -1 } },
        {
          $group: {
            _id: '$studentId',
            lastWatchedAt: { $first: '$lastWatchedAt' },
            watchedAt: { $first: '$watchedAt' }
          }
        }
      ])),
      timedQuery('purchaseCountsBulk', Purchase.aggregate([
        {
          $match: {
            studentId: { $in: studentObjectIds },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: '$studentId',
            count: { $sum: 1 }
          }
        }
      ]))
    ]);

    // Build lookup maps in O(1) JavaScript memory
    const progressMap = {};
    studentIds.forEach(id => { progressMap[id] = []; });
    allHistory.forEach(h => {
      const sId = String(h.studentId);
      if (progressMap[sId]) {
        progressMap[sId].push(h.progress || 0);
      }
    });

    const latestLoginsMap = {};
    latestLogins.forEach(item => {
      latestLoginsMap[item._id.toString()] = item.latestLogin;
    });

    const latestWatchesMap = {};
    latestWatches.forEach(item => {
      latestWatchesMap[item._id.toString()] = {
        lastWatchedAt: item.lastWatchedAt,
        watchedAt: item.watchedAt
      };
    });

    const purchaseCountsMap = {};
    purchaseCounts.forEach(item => {
      purchaseCountsMap[item._id.toString()] = item.count;
    });

    // Student Progress Distribution (Doughnut Chart)
    let g1 = 0, g2 = 0, g3 = 0, g4 = 0;
    Object.values(progressMap).forEach((progressList) => {
      const avg = progressList.length > 0
        ? progressList.reduce((a, b) => a + b, 0) / progressList.length
        : 0;
      if (avg <= 25) g1++;
      else if (avg <= 50) g2++;
      else if (avg <= 75) g3++;
      else g4++;
    });

    const progressDistribution = [
      { name: '0–25%', value: g1 },
      { name: '26–50%', value: g2 },
      { name: '51–75%', value: g3 },
      { name: '76–100%', value: g4 }
    ];

    // --- 4. Section 3: Batch Performance ---
    const batchMap = {};
    allStudents.forEach(s => {
      const bName = s.batchName || s.courseName || 'General Batch';
      if (!batchMap[bName]) {
        batchMap[bName] = { name: bName, studentIds: [], watchTime: 0, completions: 0, totalEntries: 0 };
      }
      batchMap[bName].studentIds.push(String(s._id));
    });

    batchWatchHistories.forEach(h => {
      const sId = String(h.studentId);
      Object.values(batchMap).forEach(b => {
        if (b.studentIds.includes(sId)) {
          b.watchTime += h.watchTime || Math.round((h.progress || 0) * 0.6);
          b.totalEntries++;
          if (h.completed) b.completions++;
        }
      });
    });

    const batchPerformance = Object.values(batchMap).map(b => {
      const completionRate = b.totalEntries > 0
        ? parseFloat(((b.completions / b.totalEntries) * 100).toFixed(1))
        : 0;
      return {
        name: b.name,
        students: b.studentIds.length,
        watchHours: parseFloat((b.watchTime / 3600).toFixed(1)),
        completion: completionRate
      };
    }).sort((a, b) => b.completion - a.completion || b.watchHours - a.watchHours);

    // --- 5. Section 4: Subject Performance ---
    const subjectMap = {};
    watchHistoriesWithLesson.forEach(h => {
      const subjName = h.lessonId?.subjectTitle || 'General';
      if (!subjectMap[subjName]) {
        subjectMap[subjName] = { name: subjName, views: 0, watchTime: 0, completions: 0, totalEntries: 0 };
      }
      subjectMap[subjName].views++;
      subjectMap[subjName].watchTime += h.watchTime || Math.round((h.progress || 0) * 0.6);
      subjectMap[subjName].totalEntries++;
      if (h.completed) subjectMap[subjName].completions++;
    });

    const subjectPerformance = Object.values(subjectMap).map(s => {
      const completionRate = s.totalEntries > 0
        ? parseFloat(((s.completions / s.totalEntries) * 100).toFixed(1))
        : 0;
      return {
        name: s.name,
        views: s.views,
        watchHours: parseFloat((s.watchTime / 3600).toFixed(1)),
        completion: completionRate
      };
    });

    // --- 6. Section 5: Top Topics ---
    const topicViews = {};
    watchHistoriesWithLesson.forEach(h => {
      if (h.lessonId) {
        const title = h.lessonId.title || 'Unknown Topic';
        topicViews[title] = (topicViews[title] || 0) + 1;
      }
    });

    const topTopics = Object.entries(topicViews)
      .map(([name, views]) => ({ name, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // --- 7. Section 6: Watch Time Growth ---
    let watchTimeGrowth = [];
    let accumulatedSeconds = 0;

    if (range === 'today') {
      for (let i = 0; i < 24; i++) {
        const hourStr = `${String(i).padStart(2, '0')}:00`;
        const hourViews = viewsList.filter(item => {
          const dateObj = item.lastWatchedAt || item.watchedAt;
          return dateObj && new Date(dateObj).getHours() === i;
        });
        const hourSeconds = hourViews.reduce((sum, item) => sum + (item.watchTime || Math.round((item.progress || 0) * 0.6)), 0);
        accumulatedSeconds += hourSeconds;
        watchTimeGrowth.push({
          date: hourStr,
          hours: parseFloat((accumulatedSeconds / 3600).toFixed(2))
        });
      }
    } else {
      let currentD = new Date(fromDate);
      while (currentD <= toDate) {
        const dateStr = currentD.toISOString().split('T')[0];
        const dayViews = viewsList.filter(item => {
          const dateObj = item.lastWatchedAt || item.watchedAt;
          return dateObj && new Date(dateObj).toISOString().split('T')[0] === dateStr;
        });
        const daySeconds = dayViews.reduce((sum, item) => sum + (item.watchTime || Math.round((item.progress || 0) * 0.6)), 0);
        accumulatedSeconds += daySeconds;
        watchTimeGrowth.push({
          date: dateStr,
          hours: parseFloat((accumulatedSeconds / 3600).toFixed(2))
        });
        currentD.setDate(currentD.getDate() + 1);
      }
    }

    // --- 8. Section 7: Students Needing Attention ---
    const needyStudents = [];
    const nowTime = new Date().getTime();

    for (const student of allStudents) {
      const studentIdStr = student._id.toString();
      const latestLoginTime = latestLoginsMap[studentIdStr];
      const latestWatchInfo = latestWatchesMap[studentIdStr];

      const lastActiveDate = [
        latestLoginTime,
        latestWatchInfo?.lastWatchedAt,
        latestWatchInfo?.watchedAt
      ].filter(Boolean).sort((a, b) => b - a)[0] || student.createdAt;

      const sProgressList = progressMap[studentIdStr] || [];
      const progress = sProgressList.length > 0
        ? Math.round(sProgressList.reduce((a, b) => a + b, 0) / sProgressList.length)
        : 0;

      const diffDays = Math.floor((nowTime - new Date(lastActiveDate).getTime()) / (1000 * 3600 * 24));

      let severity = '';
      let reason = '';
      if (diffDays > 30) {
        severity = 'Critical';
        reason = `No login for ${diffDays} days`;
      } else if (diffDays > 14) {
        severity = 'Warning';
        reason = `No login for ${diffDays} days`;
      } else if (progress < 20) {
        severity = 'Low';
        reason = `Progress is ${progress}%`;
      }

      if (severity) {
        needyStudents.push({
          name: student.name,
          email: student.email,
          batch: student.batchName || student.courseName || 'General',
          progress,
          lastActive: lastActiveDate,
          severity,
          reason
        });
      }
    }

    const severityOrder = { Critical: 3, Warning: 2, Low: 1 };
    needyStudents.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity] || new Date(b.lastActive) - new Date(a.lastActive));

    // --- 9. Section 8: Top Student Leaderboard & Enriched Students list ---
    const leaderboard = [];
    const enrichedStudents = allStudents.map((student) => {
      const studentIdStr = student._id.toString();
      const courseCount = purchaseCountsMap[studentIdStr] || 0;
      const sProgressList = progressMap[studentIdStr] || [];
      const progress = sProgressList.length > 0
        ? Math.round(sProgressList.reduce((a, b) => a + b, 0) / sProgressList.length)
        : 0;

      const totalWatchSec = viewsList
        .filter(v => String(v.studentId) === studentIdStr)
        .reduce((sum, h) => sum + (h.watchTime || Math.round((h.progress || 0) * 0.6)), 0);
      const watchHours = parseFloat((totalWatchSec / 3600).toFixed(1));

      const latestLoginTime = latestLoginsMap[studentIdStr];
      const latestWatchInfo = latestWatchesMap[studentIdStr];

      const lastActiveDate = [
        latestLoginTime,
        latestWatchInfo?.lastWatchedAt,
        latestWatchInfo?.watchedAt
      ].filter(Boolean).sort((a, b) => b - a)[0] || student.createdAt;

      const dateStr = student.createdAt instanceof Date 
        ? student.createdAt.toISOString().split('T')[0] 
        : new Date(student.createdAt).toISOString().split('T')[0];

      const enriched = {
        id: student._id,
        user_id: student.user_id,
        name: student.name,
        email: student.email,
        phone: student.phone || '',
        courses: courseCount,
        progress,
        joined: dateStr,
        status: student.status,
        branchName: student.branchName || '',
        batchName: student.batchName || '',
        courseName: student.courseName || '',
        enrollmentDate: student.enrollmentDate 
          ? (student.enrollmentDate instanceof Date ? student.enrollmentDate.toISOString().split('T')[0] : new Date(student.enrollmentDate).toISOString().split('T')[0]) 
          : '',
        packageExpiryDate: student.packageExpiryDate 
          ? (student.packageExpiryDate instanceof Date ? student.packageExpiryDate.toISOString().split('T')[0] : new Date(student.packageExpiryDate).toISOString().split('T')[0]) 
          : null,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`
      };

      leaderboard.push({
        name: student.name,
        email: student.email,
        batch: student.batchName || student.courseName || 'General',
        progress,
        watchHours,
        lastActive: lastActiveDate
      });

      return enriched;
    });

    leaderboard.sort((a, b) => b.watchHours - a.watchHours);

    // --- 10. Section 9: Resource Analytics ---
    let pdfCount = 0;
    let notesCount = 0;
    let assignmentCount = 0;

    downloadEvents.forEach(e => {
      const text = `${e.topicTitle || ''} ${e.details || ''}`.toLowerCase();
      if (text.includes('.pdf') || text.includes('pdf')) {
        pdfCount++;
      } else if (text.includes('assignment')) {
        assignmentCount++;
      } else {
        notesCount++;
      }
    });

    const resourceAnalytics = [
      { name: 'PDF Downloads', count: pdfCount },
      { name: 'Notes Views', count: notesCount },
      { name: 'Assignment Opens', count: assignmentCount }
    ];

    // --- 11. Section 10: Recent Activity Feed ---
    const feed = [];
    recentWatch.forEach(h => {
      if (h.studentId && h.lessonId) {
        const studentName = h.studentId.name || 'Student';
        const topicTitle = h.lessonId.title || 'Topic';
        const action = h.completed ? 'completed' : 'watched';
        const timestamp = h.lastWatchedAt || h.watchedAt || new Date();
        feed.push({
          id: `watch-${h._id}`,
          studentName,
          action,
          target: topicTitle,
          timestamp: new Date(timestamp).toISOString()
        });
      }
    });

    recentDown.forEach(d => {
      if (d.studentId) {
        const studentName = d.studentId.name || 'Student';
        const target = d.topicTitle || 'study material';
        const timestamp = d.createdAt || new Date();
        feed.push({
          id: `down-${d._id}`,
          studentName,
          action: 'downloaded',
          target,
          timestamp: new Date(timestamp).toISOString()
        });
      }
    });

    const finalFeed = feed
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    console.log("Overview Duration:", Date.now() - start, "ms");

    res.json({
      metrics,
      revenueData,
      topCourses: topCoursesData,
      students: enrichedStudents,
      engagementTrend,
      progressDistribution,
      batchPerformance,
      subjectPerformance,
      topTopics,
      watchTimeGrowth,
      needyStudents: needyStudents.slice(0, 10),
      leaderboard: leaderboard.slice(0, 10),
      resourceAnalytics,
      recentActivity: finalFeed
    });
  } catch (error) {
    console.error("Overview Error:", error);
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
  const { name, email, phone, status, branchName, batchName, courseName, enrollmentDate } = req.body;
  try {
    if (!req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Student with this email already exists' });
    }

    const tempPassword = generateTemporaryPassword();

    const student = await User.create({
      name,
      email,
      password: tempPassword,
      phone: phone || '',
      status: status || 'active',
      role: 'student',
      institute: req.user.institute || null,
      branchName: branchName || '',
      batchName: batchName || '',
      courseName: courseName || '',
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      mustChangePassword: true
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

    await sendStudentWelcomeEmail(name, email, tempPassword);

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
        packageExpiryDate: student.packageExpiryDate ? student.packageExpiryDate.toISOString().split('T')[0] : null,
        createdAt: student.createdAt,
        mustChangePassword: student.mustChangePassword
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendWelcomeEmail = async (req, res) => {
  try {
    if (!req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const student = await User.findOne({ _id: req.params.id, institute: req.user.institute, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const tempPassword = generateTemporaryPassword();
    student.password = tempPassword;
    student.mustChangePassword = true;
    await student.save();

    await sendStudentWelcomeEmail(student.name, student.email, tempPassword);

    res.json({ message: 'Welcome email resent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetStudentPassword = async (req, res) => {
  try {
    if (!req.user.institute) {
      return res.status(403).json({ message: 'Forbidden: institute access required' });
    }
    const student = await User.findOne({ _id: req.params.id, institute: req.user.institute, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const tempPassword = generateTemporaryPassword();
    student.password = tempPassword;
    student.mustChangePassword = true;
    await student.save();

    // Log password reset action
    await AuditLog.create({
      userId: student._id,
      institute: req.user.institute,
      eventType: 'PASSWORD_RESET',
      details: `Password reset by admin (${req.user.email})`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    await sendStudentWelcomeEmail(student.name, student.email, tempPassword);

    res.json({ message: 'Password reset successfully, email sent' });
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
        packageExpiryDate: student.packageExpiryDate ? student.packageExpiryDate.toISOString().split('T')[0] : null,
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
