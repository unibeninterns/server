import express from 'express';
import articleController from '../controllers/article.controller.js';
import { authenticateAdminToken } from '../../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/cover_pic/');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${path.basename(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error('Invalid file type. Only JPEG, PNG and JPG are allowed.'),
        false
      );
    }
  },
});

// Public routes
router.get('/', articleController.getArticles);
router.get('/dashboard', articleController.getDashboardData);
router.get('/:id', articleController.getArticleById);

// Protected routes - require authentication
router.post(
  '/',
  authenticateAdminToken,
  upload.single('cover_photo'),
  articleController.createArticle
);

router.put(
  '/:id',
  authenticateAdminToken,
  upload.single('cover_photo'),
  articleController.updateArticle
);

router.delete('/:id', authenticateAdminToken, articleController.deleteArticle);

export default router;
