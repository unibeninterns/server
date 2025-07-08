import express from 'express';
import infoController from '../controllers/info.controller.js';
import { authenticateAdminToken } from '../../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/info_docs/');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Temporary filename, will be renamed based on title in controller
    cb(null, `temp_${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, CSV, XLS, XLSX, and TXT files are allowed.'
        ),
        false
      );
    }
  },
});

// Public routes
router.get('/', infoController.getInfoDocuments);
router.get('/:id', infoController.getInfoDocumentById);

// Protected routes - require admin authentication
router.post(
  '/',
  authenticateAdminToken,
  upload.single('info_doc'),
  infoController.createInfoDocument
);

router.delete(
  '/:id',
  authenticateAdminToken,
  infoController.deleteInfoDocument
);

export default router;
