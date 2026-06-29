import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { Course } from '../models/Course.js';
import { Program } from '../models/Program.js';
import { Purchase } from '../models/Purchase.js';
import { Enrollment } from '../models/Enrollment.js';
import { CourseAssignment } from '../models/CourseAssignment.js';
import { Notification } from '../models/Notification.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';
import { isR2Configured, uploadToR2, getSignedR2Url, parseR2Key, deleteFile } from '../utils/r2Service.js';
import { Institute } from '../models/Institute.js';

const requireInstitute = (req, res) => {
  if (req.user.role === 'owner') return true;
  if (!req.user.institute) {
    res.status(403).json({ message: 'Forbidden: institute access required' });
    return false;
  }
  return true;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const populateMaterialCourses = async (materials) => {
  const courseIds = [...new Set(materials.map(m => {
    const rawId = m.courseId?._id || m.courseId;
    return rawId ? rawId.toString() : null;
  }).filter(Boolean))];

  if (courseIds.length === 0) {
    return materials.map(m => m.toObject ? m.toObject() : m);
  }

  // Query Course and Program models
  const [courses, programs] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }),
    Program.find({ _id: { $in: courseIds } })
  ]);

  const courseMap = {};
  courses.forEach(c => { courseMap[c._id.toString()] = { title: c.title }; });
  programs.forEach(p => { courseMap[p._id.toString()] = { title: p.name }; });

  return materials.map(m => {
    const obj = m.toObject ? m.toObject() : JSON.parse(JSON.stringify(m));
    const cId = obj.courseId?._id?.toString() || obj.courseId?.toString();
    if (cId && courseMap[cId]) {
      obj.courseId = {
        _id: cId,
        title: courseMap[cId].title,
        name: courseMap[cId].title
      };
    }
    return obj;
  });
};

const formatMaterial = (material) => {
  const obj = material.toObject ? material.toObject() : material;
  const instituteId = obj.institute?._id || obj.institute || obj.instituteId || null;
  const courseId = obj.courseId?._id || obj.courseId || null;
  return {
    ...obj,
    id: obj._id,
    instituteId,
    courseId,
    courseTitle: obj.courseId?.title || obj.courseId?.name || obj.courseTitle || '',
    uploaderName: obj.uploadedBy?.name || obj.uploaderName || '',
    downloadUrl: `/api/materials/${obj._id}/download`
  };
};

const buildFilter = ({ institute, search, type, courseId, allowedCourseIds = [] }) => {
  const filter = {};
  if (institute) filter.institute = institute;
  if (courseId) filter.courseId = courseId;
  if (type && type !== 'All') filter.fileType = type.toLowerCase();
  if (allowedCourseIds.length) {
    if (courseId) {
      const hasAccess = allowedCourseIds.some((id) => String(id) === String(courseId));
      if (!hasAccess) {
        filter.courseId = { $in: [] };
      } else {
        filter.courseId = courseId;
      }
    } else {
      filter.courseId = { $in: allowedCourseIds };
    }
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { title: regex },
      { description: regex }
    ];
  }
  return filter;
};

export const getStudentMaterials = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;

    const { search = '', type = 'All', courseId = '' } = req.query;
    
    // Find all courses/programs in the student's institute
    const dbCourses = await Course.find({ institute: req.user.institute });
    const dbPrograms = await Program.find({ institute: req.user.institute, isDeleted: false });
    const allCourses = [...dbCourses, ...dbPrograms];
    const allowedCourseIds = [];

    for (const course of allCourses) {
      const access = await verifyStudentAccess({
        user: req.user,
        courseId: course._id.toString()
      });
      if (access.granted) {
        allowedCourseIds.push(course._id);
      }
    }
    if (allowedCourseIds.length === 0) {
      return res.json([]);
    }

    const filter = buildFilter({
      institute: req.user.institute,
      search,
      type,
      courseId,
      allowedCourseIds
    });

    const materials = await StudyMaterial.find(filter)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    const populatedMaterials = await populateMaterialCourses(materials);
    res.json(populatedMaterials.map(formatMaterial));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminMaterials = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin authorization required' });
    }
    if (!requireInstitute(req, res)) return;

    const { search = '', type = 'All', courseId = '' } = req.query;
    const filter = buildFilter({
      institute: req.user.institute,
      search,
      type,
      courseId
    });

    const materials = await StudyMaterial.find(filter)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    const populatedMaterials = await populateMaterialCourses(materials);
    res.json(populatedMaterials.map(formatMaterial));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStudyMaterial = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin authorization required' });
    }
    if (!requireInstitute(req, res)) return;

    const { title, description = '', courseId } = req.body;
    if (!title || !courseId) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'title and courseId are required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    let course = await Course.findOne({ _id: courseId, institute: req.user.institute });
    if (!course) {
      course = await Program.findOne({ _id: courseId, institute: req.user.institute, isDeleted: false });
    }
    if (!course) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Course not found' });
    }

    const fileType = 'pdf';
    let filePath = req.file.path;
    const inst = await Institute.findById(req.user.institute);

    if (isR2Configured()) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const r2Key = `study-materials/${inst?.instituteCode || 'default'}/${req.file.filename}`;
        const r2Url = await uploadToR2(fileBuffer, r2Key, 'application/pdf');
        filePath = r2Url;
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (r2Err) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ message: `R2 Upload Failed: ${r2Err.message}` });
      }
    }

    if (inst) {
      inst.storageUsed = (inst.storageUsed || 0) + req.file.size;
      await inst.save();
    }

    const material = await StudyMaterial.create({
      institute: req.user.institute,
      courseId,
      title,
      description,
      uploadedBy: req.user._id,
      fileType,
      fileSize: req.file.size,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath
    });

    const populated = await StudyMaterial.findById(material._id)
      .populate('uploadedBy', 'name email');

    const [populatedWithCourse] = await populateMaterialCourses([populated]);

    // Query Enrollment, CourseAssignment, and Purchase in parallel to cover all access/enrollment types
    const [enrollments, assignments, purchases] = await Promise.all([
      Enrollment.find({
        institute: req.user.institute,
        programId: courseId,
        status: 'active'
      }).select('studentId'),
      CourseAssignment.find({
        institute: req.user.institute,
        courseId: courseId
      }).select('student'),
      Purchase.find({
        institute: req.user.institute,
        courseId: courseId,
        status: 'completed'
      }).select('studentId')
    ]);

    const studentIds = new Set();
    enrollments.forEach(e => { if (e.studentId) studentIds.add(e.studentId.toString()); });
    assignments.forEach(a => { if (a.student) studentIds.add(a.student.toString()); });
    purchases.forEach(p => { if (p.studentId) studentIds.add(p.studentId.toString()); });

    const studentIdList = Array.from(studentIds);
    console.log(`[createStudyMaterial] Found ${studentIdList.length} students to notify for courseId ${courseId}`);

    if (studentIdList.length) {
      await Notification.insertMany(studentIdList.map((sId) => ({
        institute: req.user.institute,
        userId: sId,
        targetType: 'user',
        title: '📖 New Study Material Available',
        message: `"${title}" is now available. Tap to view.`,
        url: '/student?tab=materials',
        type: 'upload',
        read: false
      })));
    }

    res.status(201).json(formatMaterial(populatedWithCourse));
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
};

export const updateStudyMaterial = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin authorization required' });
    }
    if (!requireInstitute(req, res)) return;

    const material = await StudyMaterial.findOne({ _id: req.params.id, institute: req.user.institute });
    if (!material) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Study material not found' });
    }

    const { title, description, courseId } = req.body;
    if (courseId) {
      let course = await Course.findOne({ _id: courseId, institute: req.user.institute });
      if (!course) {
        course = await Program.findOne({ _id: courseId, institute: req.user.institute, isDeleted: false });
      }
      if (!course) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Course not found' });
      }
      material.courseId = courseId;
    }

    if (title !== undefined) material.title = title;
    if (description !== undefined) material.description = description;

    if (req.file) {
      if (material.filePath && !material.filePath.startsWith('http') && fs.existsSync(material.filePath)) {
        try { fs.unlinkSync(material.filePath); } catch (_e) {}
      } else if (material.filePath && material.filePath.startsWith('http') && isR2Configured()) {
        try {
          const key = parseR2Key(material.filePath);
          await deleteFile(key);
        } catch (err) {
          console.error('Failed to delete old file from R2:', err);
        }
      }
      
      let filePath = req.file.path;
      const inst = await Institute.findById(req.user.institute);
      if (isR2Configured()) {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const r2Key = `study-materials/${inst?.instituteCode || 'default'}/${req.file.filename}`;
          const r2Url = await uploadToR2(fileBuffer, r2Key, 'application/pdf');
          filePath = r2Url;
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        } catch (r2Err) {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(500).json({ message: `R2 Upload Failed: ${r2Err.message}` });
        }
      }

      if (inst) {
        inst.storageUsed = Math.max(0, (inst.storageUsed || 0) - (material.fileSize || 0) + req.file.size);
        await inst.save();
      }

      material.fileType = 'pdf';
      material.fileSize = req.file.size;
      material.originalName = req.file.originalname;
      material.fileName = req.file.filename;
      material.filePath = filePath;
    }

    await material.save();
    const populated = await StudyMaterial.findById(material._id)
      .populate('uploadedBy', 'name email');

    const [populatedWithCourse] = await populateMaterialCourses([populated]);
    res.json(formatMaterial(populatedWithCourse));
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
};

export const deleteStudyMaterial = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin authorization required' });
    }
    if (!requireInstitute(req, res)) return;

    const material = await StudyMaterial.findOneAndDelete({ _id: req.params.id, institute: req.user.institute });
    if (!material) {
      return res.status(404).json({ message: 'Study material not found' });
    }

    const inst = await Institute.findById(req.user.institute);
    if (inst) {
      inst.storageUsed = Math.max(0, (inst.storageUsed || 0) - (material.fileSize || 0));
      await inst.save();
    }

    if (material.filePath && !material.filePath.startsWith('http') && fs.existsSync(material.filePath)) {
      try { fs.unlinkSync(material.filePath); } catch (_e) {}
    } else if (material.filePath && material.filePath.startsWith('http') && isR2Configured()) {
      try {
        const key = parseR2Key(material.filePath);
        await deleteFile(key);
      } catch (err) {
        console.error('Failed to delete file from R2:', err);
      }
    }

    res.json({ message: 'Study material deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadStudyMaterial = async (req, res) => {
  try {
    if (!requireInstitute(req, res)) return;

    const material = req.user.role === 'owner'
      ? await StudyMaterial.findById(req.params.id).populate('uploadedBy', 'name email')
      : await StudyMaterial.findOne({ _id: req.params.id, institute: req.user.institute })
        .populate('uploadedBy', 'name email');

    if (!material) {
      return res.status(404).json({ message: 'Study material not found' });
    }

    const [populated] = await populateMaterialCourses([material]);

    if (req.user.role === 'student') {
      const access = await verifyStudentAccess({
        user: req.user,
        courseId: populated.courseId?._id || populated.courseId
      });

      if (!access.granted) {
        return res.status(403).json({
          message: access.reason || 'Access denied: Locked by your institute.',
          status: access.status || 'locked'
        });
      }
    }

    if (populated.filePath && populated.filePath.startsWith('http')) {
      if (!isR2Configured()) {
        return res.status(500).json({ message: 'Cloudflare R2 is not configured.' });
      }
      const key = parseR2Key(populated.filePath);
      const signedUrl = await getSignedR2Url(key, 300); // 5 minutes
      return res.redirect(signedUrl);
    }

    if (!populated.filePath || !fs.existsSync(populated.filePath)) {
      return res.status(404).json({ message: 'Material file not found on server' });
    }

    const downloadName = populated.originalName || path.basename(populated.filePath);
    return res.download(populated.filePath, downloadName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateDownloadToken = async (req, res) => {
  try {
    const downloadToken = jwt.sign(
      { id: req.user._id, sessionToken: req.user.activeSessionToken, isPlaybackToken: true },
      process.env.JWT_SECRET || 'trineo_stream_premium_saas_crm_lms_secret_key_2026_xyz',
      { expiresIn: '5m' }
    );
    res.json({ token: downloadToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
