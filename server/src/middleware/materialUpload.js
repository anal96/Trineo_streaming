import multer from 'multer';
import fs from 'fs';
import path from 'path';

const MATERIALS_DIR = path.resolve('uploads/materials');

if (!fs.existsSync(MATERIALS_DIR)) {
  fs.mkdirSync(MATERIALS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MATERIALS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeExt = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, `material-${uniqueSuffix}${safeExt}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isPdf = ext === '.pdf' && file.mimetype === 'application/pdf';
  if (isPdf) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for study materials'), false);
  }
};

export const materialUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});
