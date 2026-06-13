import multer from 'multer';
import path from 'path';

const allowedExt = new Set(['.csv', '.xlsx']);

export const studentImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExt.has(ext)) {
      cb(new Error('Only CSV and XLSX files are supported'), false);
      return;
    }
    cb(null, true);
  }
});
