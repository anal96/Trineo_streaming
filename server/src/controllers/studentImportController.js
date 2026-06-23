import XLSX from 'xlsx';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';
import { AuditLog } from '../models/AuditLog.js';
import { StudentImportJob } from '../models/StudentImportJob.js';
import { Institute } from '../models/Institute.js';
import { Program } from '../models/Program.js';
import { Enrollment } from '../models/Enrollment.js';
import { generateTemporaryPassword } from '../utils/passwordGenerator.js';
import { sendStudentWelcomeEmail } from '../services/emailService.js';
import { checkStudentQuota } from '../utils/quotaEnforcer.js';

const normalize = (value = '') => String(value || '').trim();

const getRowsFromBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
};

const mapRow = (row) => ({
  name: normalize(row['Student Name *'] ?? row['Student Name'] ?? row['Name'] ?? row.name ?? row.Name),
  email: normalize(row['Email *'] ?? row['Email'] ?? row.email ?? row.Email).toLowerCase(),
  phone: normalize(row['Phone *'] ?? row['Phone'] ?? row.phone ?? row.Phone),
  batch: normalize(row['Batch *'] ?? row['Batch'] ?? row.batch ?? row.Batch),
  admissionDate: normalize(row['Admission Date *'] ?? row['Admission Date'] ?? row.admissionDate ?? row.AdmissionDate ?? row['Date of Admission'] ?? row['Admission Date']),
  status: normalize(row['Status'] ?? row.status ?? row.Status)
});

const parseExcelDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    // Excel base date is 1899-12-30 (serial 25569 = 1970-01-01)
    const d = new Date((val - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(val).trim();
  if (!str) return null;
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    const d = new Date((num - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  return null;
};

const validateMappedRows = async (rows, instituteId) => {
  const errors = [];
  const validRows = [];
  const skipped = [];
  const emailSet = new Set();
  const phoneSet = new Set();

  if (rows.length > 0) {
    const firstRow = rows[0];
    const keys = Object.keys(firstRow).map(k => k.trim().toLowerCase());
    
    const hasName = keys.some(k => k.includes('student name') || k === 'name');
    const hasEmail = keys.some(k => k.includes('email'));
    const hasPhone = keys.some(k => k.includes('phone'));
    const hasBatch = keys.some(k => k.includes('batch'));
    const hasDate = keys.some(k => k.includes('admission date') || k.includes('date of admission') || k === 'date');

    if (!hasName) errors.push({ rowNumber: 1, error: 'Missing Student Name column' });
    if (!hasEmail) errors.push({ rowNumber: 1, error: 'Missing Email column' });
    if (!hasPhone) errors.push({ rowNumber: 1, error: 'Missing Phone column' });
    if (!hasBatch) errors.push({ rowNumber: 1, error: 'Missing Batch column' });
    if (!hasDate) errors.push({ rowNumber: 1, error: 'Missing Admission Date column' });

    if (errors.length > 0) {
      return { validRows, errors, skipped };
    }
  } else {
    errors.push({ rowNumber: 1, error: 'The uploaded file is empty' });
    return { validRows, errors, skipped };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = mapRow(rows[i]);
    const rowNumber = i + 2;

    if (!row.name) {
      errors.push({ rowNumber, row, error: 'Missing Student Name' });
      continue;
    }
    if (!row.email) {
      errors.push({ rowNumber, row, error: 'Missing Email' });
      continue;
    }
    if (!row.phone) {
      errors.push({ rowNumber, row, error: 'Missing Phone' });
      continue;
    }
    if (!row.batch) {
      errors.push({ rowNumber, row, error: 'Missing Batch' });
      continue;
    }
    if (!row.admissionDate) {
      errors.push({ rowNumber, row, error: 'Missing Admission Date' });
      continue;
    }

    const admissionDateObj = parseExcelDate(row.admissionDate);
    if (!admissionDateObj) {
      errors.push({ rowNumber, row, error: 'Invalid Admission Date' });
      continue;
    }

    if (emailSet.has(row.email)) {
      skipped.push({ rowNumber, row, error: 'Duplicate Email in file' });
      continue;
    }
    if (phoneSet.has(row.phone)) {
      skipped.push({ rowNumber, row, error: 'Duplicate Phone in file' });
      continue;
    }
    emailSet.add(row.email);
    phoneSet.add(row.phone);

    const program = await Program.findOne({ name: row.batch, institute: instituteId, isDeleted: false });
    if (!program) {
      errors.push({ rowNumber, row, error: `Invalid Batch: ${row.batch}` });
      continue;
    }

    const existingUser = await User.findOne({
      institute: instituteId,
      $or: [
        { email: row.email },
        { phone: row.phone }
      ]
    });

    if (existingUser) {
      const matchedBy = existingUser.email === row.email ? 'Email' : 'Phone';
      skipped.push({
        rowNumber,
        row,
        isDuplicateDb: true,
        error: 'Duplicate Student Found',
        duplicateDetails: {
          matchedBy,
          existingUserId: existingUser.user_id || '',
          existingName: existingUser.name || '',
          existingEmail: existingUser.email || '',
          existingPhone: existingUser.phone || ''
        }
      });
      continue;
    }

    validRows.push({ rowNumber, row, courseId: program._id, admissionDate: admissionDateObj.toISOString().split('T')[0] });
  }
  return { validRows, errors, skipped };
};

export const downloadExcelTemplate = async (req, res) => {
  try {
    const wsData = [
      ['Student Name *', 'Email *', 'Phone *', 'Batch *', 'Admission Date *', 'Status'],
      ['John Smith', 'john.smith@example.com', '9876543210', 'BCA', '2026-01-15', 'ACTIVE']
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=student-import-template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const previewStudentImport = async (req, res) => {
  try {
    if (req.user.role !== 'admin' || !req.user.institute) return res.status(403).json({ message: 'Forbidden: admin institute required' });
    if (!req.file) return res.status(400).json({ message: 'Import file required' });
    
    const rows = getRowsFromBuffer(req.file.buffer);
    const { validRows, errors, skipped } = await validateMappedRows(rows, req.user.institute);

    let branchName = 'Main Campus';
    try {
      const institute = await Institute.findById(req.user.institute);
      if (institute) {
        branchName = institute.name;
      }
    } catch (e) {}

    const jobRows = [
      ...validRows.map((v) => ({
        rowNumber: v.rowNumber,
        name: v.row.name,
        email: v.row.email,
        phone: v.row.phone,
        batch: v.row.batch,
        course: v.row.batch,
        branch: branchName,
        admissionDate: v.admissionDate,
        status: 'pending',
        error: ''
      })),
      ...skipped.map((s) => ({
        rowNumber: s.rowNumber,
        name: s.row.name,
        email: s.row.email,
        phone: s.row.phone,
        batch: s.row.batch,
        course: s.row.batch,
        branch: branchName,
        admissionDate: parseExcelDate(s.row.admissionDate)?.toISOString().split('T')[0] || '',
        status: s.isDuplicateDb ? 'duplicate' : 'skipped',
        error: s.error,
        duplicateDetails: s.duplicateDetails || null
      })),
      ...errors.map((e) => ({
        rowNumber: e.rowNumber,
        name: e.row?.name || '',
        email: e.row?.email || '',
        phone: e.row?.phone || '',
        batch: e.row?.batch || '',
        course: e.row?.batch || '',
        branch: branchName,
        admissionDate: e.row?.admissionDate ? (parseExcelDate(e.row.admissionDate)?.toISOString().split('T')[0] || '') : '',
        status: 'failed',
        error: e.error
      }))
    ];

    const job = await StudentImportJob.create({
      institute: req.user.institute,
      uploadedBy: req.user._id,
      fileName: req.file.originalname,
      status: 'validated',
      rows: jobRows,
      failedCount: errors.length,
      skippedCount: skipped.length
    });
    const duplicateRows = jobRows.filter(r => r.status === 'duplicate');

    res.json({
      importJobId: job._id,
      totalRows: rows.length,
      validRows: validRows.length + skipped.filter(s => s.isDuplicateDb).length,
      skippedRows: skipped.filter(s => !s.isDuplicateDb).length,
      duplicateRowsCount: skipped.filter(s => s.isDuplicateDb).length,
      newRowsCount: validRows.length,
      failedRows: errors.length,
      errors,
      duplicateRows
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

    // Enforce student plan limits quota check
    const newStudentsCount = job.rows.filter(r => r.status === 'pending').length;
    try {
      await checkStudentQuota(req.user.institute, newStudentsCount);
    } catch (quotaErr) {
      return res.status(403).json({ message: quotaErr.message });
    }
    
    const duplicateAction = (req.body && req.body.duplicateAction) || 'skip';
    let branchName = 'Main Campus';
    try {
      const institute = await Institute.findById(req.user.institute);
      if (institute) {
        branchName = institute.name;
      }
    } catch (e) {}

    let importedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const row of job.rows) {
      if (row.status === 'failed') {
        failedCount += 1;
        continue;
      }
      if (row.status === 'skipped') {
        skippedCount += 1;
        continue;
      }

      if (row.status === 'duplicate') {
        if (duplicateAction === 'skip' || duplicateAction === 'import_new') {
          row.status = 'skipped';
          row.error = 'Existing student skipped';
          skippedCount += 1;
          continue;
        }

        if (duplicateAction === 'update') {
          try {
            const existingStudent = await User.findOne({
              institute: req.user.institute,
              $or: [
                { email: row.email },
                { phone: row.phone }
              ]
            });

            if (!existingStudent) {
              row.status = 'failed';
              row.error = 'Existing student not found to update';
              failedCount += 1;
              continue;
            }

            const program = await Program.findOne({ name: row.course, institute: req.user.institute, isDeleted: false });
            if (!program) {
              row.status = 'failed';
              row.error = `Invalid Batch: ${row.course}`;
              failedCount += 1;
              continue;
            }

            existingStudent.name = row.name;
            existingStudent.phone = row.phone;
            existingStudent.branchName = branchName;
            existingStudent.courseName = program.name;
            existingStudent.enrollmentDate = row.admissionDate ? new Date(row.admissionDate) : new Date();
            await existingStudent.save();

            // Create/update batch Enrollment record
            await Enrollment.findOneAndUpdate(
              { studentId: existingStudent._id, programId: program._id, institute: req.user.institute },
              { status: 'active', enrolledAt: row.admissionDate ? new Date(row.admissionDate) : new Date() },
              { upsert: true, new: true }
            );

            row.status = 'imported';
            importedCount += 1;
          } catch (err) {
            row.status = 'failed';
            row.error = err.message;
            failedCount += 1;
          }
          continue;
        }
      }

      if (row.status === 'pending') {
        try {
          const program = await Program.findOne({ name: row.course, institute: req.user.institute, isDeleted: false });
          if (!program) {
            row.status = 'failed';
            row.error = `Invalid Batch: ${row.course}`;
            failedCount += 1;
            continue;
          }

          const tempPassword = generateTemporaryPassword();

          const student = await User.create({
            name: row.name,
            email: row.email,
            password: tempPassword,
            phone: row.phone,
            role: 'student',
            institute: req.user.institute,
            batchName: '',
            branchName: branchName,
            courseName: program.name,
            status: 'active',
            enrollmentDate: row.admissionDate ? new Date(row.admissionDate) : new Date(),
            mustChangePassword: true
          });

          if (student) {
            importedCount++;

            // Create batch Enrollment record
            await Enrollment.create({
              institute: req.user.institute,
              studentId: student._id,
              programId: program._id,
              status: 'active',
              enrolledAt: row.admissionDate ? new Date(row.admissionDate) : new Date()
            });

            try {
              await sendStudentWelcomeEmail(student.name, student.email, tempPassword);
            } catch (emailErr) {
              console.error(`Failed to send welcome email to ${student.email}:`, emailErr);
            }

            row.status = 'imported';

            console.log({
              studentId: student._id,
              email: student.email,
              role: student.role,
              institute: student.institute
            });
          }
        } catch (err) {
          row.status = 'failed';
          row.error = err.message;
          failedCount += 1;
        }
      }
    }

    job.status = 'completed';
    job.importedCount = importedCount;
    job.failedCount = failedCount;
    job.skippedCount = skippedCount;
    await job.save();

    await AuditLog.create({
      userId: req.user._id,
      institute: req.user.institute,
      eventType: 'API_ACCESS',
      details: `Student import completed: ${importedCount} created/updated, ${skippedCount} skipped, ${failedCount} errors`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      message: 'Student import completed',
      totalRecords: job.rows.length,
      created: importedCount,
      skipped: skippedCount,
      errors: failedCount
    });
  } catch (error) {
    console.error('CONFIRM IMPORT RUNTIME ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getStudentImportHistory = async (req, res) => {
  try {
    if (req.user.role !== 'admin' || !req.user.institute) return res.status(403).json({ message: 'Forbidden: admin institute required' });
    const jobs = await StudentImportJob.find({ institute: req.user.institute }).populate('uploadedBy', 'name').sort({ createdAt: -1 }).limit(100);
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
