import fs from 'fs';
import path from 'path';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { Course } from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';
import { Notification } from '../models/Notification.js';
import { verifyStudentAccess } from '../utils/accessHelper.js';

const requireInstitute = (req, res) => {
  if (req.user.role === 'owner') return true;
  if (!req.user.institute) {
    res.status(403).json({ message: 'Forbidden: institute access required' });
    return false;
  }
  return true;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatMaterial = (material) => {
  const obj = material.toObject ? material.toObject() : material;
  const instituteId = obj.institute?._id || obj.institute || obj.instituteId || null;
  const courseId = obj.courseId?._id || obj.courseId || null;
  return {
    ...obj,
    id: obj._id,
    instituteId,
    courseId,
    courseTitle: obj.courseId?.title || obj.courseTitle || '',
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
    
    // Find all courses in the student's institute
    const courses = await Course.find({ institute: req.user.institute });
    const allowedCourseIds = [];

    for (const course of courses) {
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
      .populate('courseId', 'title')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(materials.map(formatMaterial));
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
      .populate('courseId', 'title')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(materials.map(formatMaterial));
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

    const course = await Course.findOne({ _id: courseId, institute: req.user.institute });
    if (!course) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Course not found' });
    }

    const fileType = 'pdf';
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
      filePath: req.file.path
    });

    const populated = await StudyMaterial.findById(material._id)
      .populate('courseId', 'title')
      .populate('uploadedBy', 'name email');

    const enrolled = await Purchase.find({ institute: req.user.institute, courseId, status: 'completed' }).select('studentId');
    if (enrolled.length) {
      await Notification.insertMany(enrolled.map((p) => ({
        institute: req.user.institute,
        userId: p.studentId,
        message: `New study material uploaded: ${title}`,
        type: 'upload',
        read: false
      })));
    }

    res.status(201).json(formatMaterial(populated));
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
      const course = await Course.findOne({ _id: courseId, institute: req.user.institute });
      if (!course) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Course not found' });
      }
      material.courseId = courseId;
    }

    if (title !== undefined) material.title = title;
    if (description !== undefined) material.description = description;

    if (req.file) {
      if (material.filePath && fs.existsSync(material.filePath)) {
        try { fs.unlinkSync(material.filePath); } catch (_e) {}
      }
      material.fileType = 'pdf';
      material.fileSize = req.file.size;
      material.originalName = req.file.originalname;
      material.fileName = req.file.filename;
      material.filePath = req.file.path;
    }

    await material.save();
    const populated = await StudyMaterial.findById(material._id)
      .populate('courseId', 'title')
      .populate('uploadedBy', 'name email');
    res.json(formatMaterial(populated));
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

    if (material.filePath && fs.existsSync(material.filePath)) {
      try { fs.unlinkSync(material.filePath); } catch (_e) {}
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
      ? await StudyMaterial.findById(req.params.id).populate('courseId', 'title').populate('uploadedBy', 'name email')
      : await StudyMaterial.findOne({ _id: req.params.id, institute: req.user.institute })
        .populate('courseId', 'title')
        .populate('uploadedBy', 'name email');

    if (!material) {
      return res.status(404).json({ message: 'Study material not found' });
    }

    if (req.user.role === 'student') {
      const access = await verifyStudentAccess({
        user: req.user,
        courseId: material.courseId._id || material.courseId
      });

      if (!access.granted) {
        return res.status(403).json({
          message: access.reason || 'Access denied: Locked by your institute.',
          status: access.status || 'locked'
        });
      }
    }

    if (!material.filePath || !fs.existsSync(material.filePath)) {
      return res.status(404).json({ message: 'Material file not found on server' });
    }

    const downloadName = material.originalName || path.basename(material.filePath);
    return res.download(material.filePath, downloadName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
