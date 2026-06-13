import XLSX from 'xlsx';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';
import { AuditLog } from '../models/AuditLog.js';
import { StudentImportJob } from '../models/StudentImportJob.js';

const normalize = (value = '') => String(value || '').trim();

const getRowsFromBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
};

const mapRow = (row) => ({
  name: normalize(row['Student Name'] ?? row.name),
  email: normalize(row['Email'] ?? row.email).toLowerCase(),
  phone: normalize(row['Phone'] ?? row.phone),
  studentId: normalize(row['Student ID'] ?? row.studentId),
  batch: normalize(row['Batch'] ?? row.batch),
  course: normalize(row['Course'] ?? row.course)
});

const validateMappedRows = async (rows, instituteId) => {
  const errors = [];
  const validRows = [];
  const emailSet = new Set();
  const studentIdSet = new Set();
  for (let i = 0; i < rows.length; i++) {
    const row = mapRow(rows[i]);
    const rowNumber = i + 2;
    if (!row.name || !row.email || !row.phone || !row.studentId || !row.batch || !row.course) {
      errors.push({ rowNumber, row, error: 'Missing required fields' });
      continue;
    }
    if (emailSet.has(row.email)) {
      errors.push({ rowNumber, row, error: 'Duplicate Email in file' });
      continue;
    }
    if (studentIdSet.has(row.studentId)) {
      errors.push({ rowNumber, row, error: 'Duplicate Student ID in file' });
      continue;
    }
    emailSet.add(row.email);
    studentIdSet.add(row.studentId);
    const existing = await User.findOne({ email: row.email, institute: instituteId });
    if (existing) {
      errors.push({ rowNumber, row, error: 'Duplicate Email in institute' });
      continue;
    }
    const course = await Course.findOne({ title: row.course, institute: instituteId });
    if (!course) {
      errors.push({ rowNumber, row, error: 'Invalid Course' });
      continue;
    }
    validRows.push({ rowNumber, row, courseId: course._id });
  }
  return { validRows, errors };
};

export const previewStudentImport = async (req, res) => {
  try {
    if (req.user.role !== 'admin' || !req.user.institute) return res.status(403).json({ message: 'Forbidden: admin institute required' });
    if (!req.file) return res.status(400).json({ message: 'Import file required' });
    const rows = getRowsFromBuffer(req.file.buffer);
    const { validRows, errors } = await validateMappedRows(rows, req.user.institute);
    const job = await StudentImportJob.create({
      institute: req.user.institute,
      uploadedBy: req.user._id,
      fileName: req.file.originalname,
      status: 'validated',
      rows: [
        ...validRows.map((v) => ({ rowNumber: v.rowNumber, ...v.row, status: 'pending' })),
        ...errors.map((e) => ({ rowNumber: e.rowNumber, ...e.row, status: 'failed', error: e.error }))
      ],
      failedCount: errors.length
    });
    res.json({
      importJobId: job._id,
      totalRows: rows.length,
      validRows: validRows.length,
      failedRows: errors.length,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const confirmStudentImport = async (req, res) => {
  try {
    if (req.user.role !== 'admin' || !req.user.institute) return res.status(403).json({ message: 'Forbidden: admin institute required' });
    const job = await StudentImportJob.findOne({ _id: req.params.jobId, institute: req.user.institute });
    if (!job) return res.status(404).json({ message: 'Import job not found' });
    let importedCount = 0;
    let failedCount = 0;
    for (const row of job.rows) {
      if (row.status === 'failed') {
        failedCount += 1;
        continue;
      }
      try {
        const existing = await User.findOne({ email: row.email, institute: req.user.institute });
        if (existing) {
          row.status = 'failed';
          row.error = 'Duplicate Email in institute';
          failedCount += 1;
          continue;
        }
        const student = await User.create({
          name: row.name,
          email: row.email,
          password: 'ChangeMe123!',
          phone: row.phone,
          role: 'student',
          institute: req.user.institute,
          batchName: row.batch,
          courseName: row.course,
          status: 'active'
        });
        const course = await Course.findOne({ title: row.course, institute: req.user.institute });
        if (!course) {
          row.status = 'failed';
          row.error = 'Invalid Course';
          await User.deleteOne({ _id: student._id });
          failedCount += 1;
          continue;
        }
        await Purchase.create({
          institute: req.user.institute,
          studentId: student._id,
          courseId: course._id,
          amount: course.price,
          status: 'completed'
        });
        row.status = 'imported';
        importedCount += 1;
      } catch (err) {
        row.status = 'failed';
        row.error = err.message;
        failedCount += 1;
      }
    }
    job.status = failedCount > 0 ? 'completed' : 'completed';
    job.importedCount = importedCount;
    job.failedCount = failedCount;
    await job.save();
    await AuditLog.create({
      userId: req.user._id,
      institute: req.user.institute,
      eventType: 'login',
      details: `Student import completed: ${importedCount} imported, ${failedCount} failed`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || ''
    });
    res.json({ message: 'Student import completed', importedCount, failedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentImportHistory = async (req, res) => {
  try {
    if (req.user.role !== 'admin' || !req.user.institute) return res.status(403).json({ message: 'Forbidden: admin institute required' });
    const jobs = await StudentImportJob.find({ institute: req.user.institute }).sort({ createdAt: -1 }).limit(100);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getImportJobDetails = async (req, res) => {
  try {
    if (req.user.role !== 'admin' || !req.user.institute) return res.status(403).json({ message: 'Forbidden: admin institute required' });
    const job = await StudentImportJob.findOne({ _id: req.params.jobId, institute: req.user.institute });
    if (!job) return res.status(404).json({ message: 'Import job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
