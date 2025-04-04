import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticateAdminToken, rateLimiter } from '../middleware/auth.middleware.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

const strictLimit = rateLimiter(5, 15 * 60 * 1000); // 5 requests per 15 minutes
const standardLimit = rateLimiter(15, 15 * 60 * 1000); // 15 requests per 15 minutes

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/profiles/'));
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${path.basename(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and JPG are allowed.'), false);
    }
  }
});

// Admin routes
router.post('/admin/login', strictLimit, authController.adminLogin);
router.post('/admin/invite', authenticateAdminToken, authController.inviteResearcher);

// Researcher routes
router.post('/researcher/login', standardLimit, authController.researcherLogin);

// Common routes
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// Researcher profile completion from invitation
router.post('/complete-profile/:token', upload.single('profilePicture'), authController.completeProfile);

export default router;